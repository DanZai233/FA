#!/usr/bin/env bash
# 将本仓库同步到远端并在远端执行 docker compose 构建与启动。
# 依赖：本机 rsync、ssh、git；远端已安装 Docker 与 docker compose 插件。
#
# 首次使用：
#   cp deploy/remote.env.example deploy/remote.env
#   编辑 deploy/remote.env（DEPLOY_SSH、DEPLOY_REMOTE_DIR 绝对路径、FALEME_PUBLIC_ORIGIN 等）
#   chmod +x scripts/deploy-remote.sh
#   ./scripts/deploy-remote.sh
#
# 指定其它 env 文件：
#   DEPLOY_ENV_FILE=/path/to/env ./scripts/deploy-remote.sh
#
# 版本标签（默认开启，部署前在 HEAD 上打 annotated tag 并推送 origin）：
#   DEPLOY_SKIP_TAG=1              跳过打 tag / 推送 tag
#   DEPLOY_TAG=my-release          使用固定标签名（须不存在）；不设则自动生成 deploy/YYYYMMDD-HHMMSS
#   DEPLOY_ALLOW_DIRTY=1           工作区不干净时仍继续（默认：有未提交更改则退出）
#   DEPLOY_PUSH_BRANCH=1           打 tag 前先 git push 当前分支到 origin（默认关闭）
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

ENV_FILE="${DEPLOY_ENV_FILE:-$ROOT/deploy/remote.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DEPLOY_SSH="${DEPLOY_SSH:-dz}"
DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-}"

if [[ -z "$DEPLOY_REMOTE_DIR" ]]; then
  echo "错误：请在 deploy/remote.env 中设置 DEPLOY_REMOTE_DIR 为远端绝对路径（见 deploy/remote.env.example）。" >&2
  exit 1
fi

# 在 rsync 之前为「当前将要部署的提交」打标签并推送，便于回滚与对照线上内容。
deploy_git_tag() {
  if [[ "${DEPLOY_SKIP_TAG:-0}" == "1" ]]; then
    echo "==> 跳过打 tag（DEPLOY_SKIP_TAG=1）"
    return 0
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "错误：${ROOT} 不是 git 工作区，无法打部署标签。" >&2
    exit 1
  fi

  local dirty
  dirty="$(git status --porcelain 2>/dev/null || true)"
  if [[ -n "$dirty" && "${DEPLOY_ALLOW_DIRTY:-0}" != "1" ]]; then
    echo "错误：工作区有未提交更改，部署内容与 HEAD 不一致。请先 git commit，或显式设置 DEPLOY_ALLOW_DIRTY=1。" >&2
    git status -sb >&2 || true
    exit 1
  fi
  if [[ -n "$dirty" ]]; then
    echo "WARN: 工作区不干净；标签仍指向 HEAD，但 rsync 出去的目录与 HEAD 可能不一致。" >&2
  fi

  local head_short branch
  head_short="$(git rev-parse --short HEAD)"
  branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "?")"

  if [[ "${DEPLOY_PUSH_BRANCH:-0}" == "1" ]]; then
    if [[ "${branch}" == "HEAD" ]]; then
      echo "WARN: 当前为 detached HEAD，无法按分支名推送；已跳过 DEPLOY_PUSH_BRANCH。" >&2
    elif git remote get-url origin >/dev/null 2>&1; then
      echo "==> 推送当前分支到 origin: ${branch}"
      git push origin "HEAD:refs/heads/${branch}"
    else
      echo "WARN: 未配置 git remote origin，跳过分支推送。" >&2
    fi
  fi

  local tag
  if [[ -n "${DEPLOY_TAG:-}" ]]; then
    tag="${DEPLOY_TAG}"
  else
    tag="deploy/$(date +%Y%m%d-%H%M%S)"
  fi

  if git rev-parse -q --verify "refs/tags/${tag}" >/dev/null 2>&1; then
    echo "错误：标签已存在: ${tag}。请删除本地该标签或设置其它 DEPLOY_TAG。" >&2
    exit 1
  fi

  echo "==> 打部署标签: ${tag} (${head_short})"
  git tag -a "${tag}" -F - <<EOF
deploy ${DEPLOY_SSH}:${DEPLOY_REMOTE_DIR}
branch: ${branch}
commit: ${head_short}
EOF

  if git remote get-url origin >/dev/null 2>&1; then
    echo "==> 推送标签到 origin: ${tag}"
    git push origin "refs/tags/${tag}"
  else
    echo "WARN: 未配置 git remote origin，仅创建本地标签 ${tag}。" >&2
  fi

  # 供结尾汇总打印
  DEPLOY_LAST_TAG="${tag}"
}

echo "==> 检查 SSH: ${DEPLOY_SSH}"
ssh -o ConnectTimeout=20 "${DEPLOY_SSH}" "echo ok" >/dev/null

echo "==> 远端目录: ${DEPLOY_REMOTE_DIR}"
ssh "${DEPLOY_SSH}" "mkdir -p \"${DEPLOY_REMOTE_DIR}\""

DEPLOY_LAST_TAG=""
deploy_git_tag

echo "==> rsync 同步到 ${DEPLOY_SSH}:${DEPLOY_REMOTE_DIR}/"
rsync -avz --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'ios/**/DerivedData/' \
  --exclude '**/.DS_Store' \
  --exclude '**/*.xcuserstate' \
  --exclude '**/.swiftpm/' \
  "${ROOT}/" "${DEPLOY_SSH}:${DEPLOY_REMOTE_DIR}/"

REMOTE_COMPOSE_CMD='docker compose -f docker-compose.yml -f docker-compose.remote.yml'
if [[ -f "$ROOT/deploy/remote.env" ]]; then
  REMOTE_COMPOSE_CMD="$REMOTE_COMPOSE_CMD --env-file deploy/remote.env"
else
  echo "WARN: 未找到 deploy/remote.env，远端将使用 compose 默认值。请执行: cp deploy/remote.env.example deploy/remote.env" >&2
fi

echo "==> 远端构建并启动容器"
# shellcheck disable=SC2029
ssh "${DEPLOY_SSH}" "cd \"${DEPLOY_REMOTE_DIR}\" && ${REMOTE_COMPOSE_CMD} up --build -d"

echo ""
echo "部署完成。"
if [[ -n "${DEPLOY_LAST_TAG:-}" ]]; then
  echo "  本次版本标签: ${DEPLOY_LAST_TAG}  （git show ${DEPLOY_LAST_TAG}）"
fi
echo "常用命令（在服务器上执行）："
echo "  cd \"${DEPLOY_REMOTE_DIR}\" && ${REMOTE_COMPOSE_CMD} ps"
echo "  cd \"${DEPLOY_REMOTE_DIR}\" && ${REMOTE_COMPOSE_CMD} logs -f --tail=100"
echo ""
