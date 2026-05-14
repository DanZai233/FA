#!/usr/bin/env bash
# 将本仓库同步到远端并在远端执行 docker compose 构建与启动。
# 依赖：本机 rsync、ssh；远端已安装 Docker 与 docker compose 插件。
#
# 首次使用：
#   cp deploy/remote.env.example deploy/remote.env
#   编辑 deploy/remote.env（DEPLOY_SSH、DEPLOY_REMOTE_DIR 绝对路径、FALEME_PUBLIC_ORIGIN 等）
#   chmod +x scripts/deploy-remote.sh
#   ./scripts/deploy-remote.sh
#
# 指定其它 env 文件：
#   DEPLOY_ENV_FILE=/path/to/env ./scripts/deploy-remote.sh

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

echo "==> 检查 SSH: ${DEPLOY_SSH}"
ssh -o ConnectTimeout=20 "${DEPLOY_SSH}" "echo ok" >/dev/null

echo "==> 远端目录: ${DEPLOY_REMOTE_DIR}"
ssh "${DEPLOY_SSH}" "mkdir -p \"${DEPLOY_REMOTE_DIR}\""

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
echo "部署完成。常用命令（在服务器上执行）："
echo "  cd \"${DEPLOY_REMOTE_DIR}\" && ${REMOTE_COMPOSE_CMD} ps"
echo "  cd \"${DEPLOY_REMOTE_DIR}\" && ${REMOTE_COMPOSE_CMD} logs -f --tail=100"
echo ""
