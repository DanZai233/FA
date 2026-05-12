# 法了么 V1

法了么是一个成人亲密生活记录与性健康教育产品。外层语气可以荒诞、自嘲、嘴硬，底层原则必须认真：同意、保护、隐私、健康。

## 功能

- Web 移动端：记录、周期、伴侣绑定、预设广场、我的、隐私/条款/支持/删除账号页面。
- Go 后端：认证占位、记录、周期预测、伴侣邀请码、知识卡、预设短语、广场、摇一摇、举报 API。
- iOS 原生：SwiftUI 五 Tab 骨架，复用 Go API，后端不可用时使用本地演示数据。
- 轻社交：不开放自由文本聊天，使用预设短语拼句降低治理风险。

## 本地开发

```bash
npm install
npm run dev
```

另开一个终端运行后端：

```bash
cd server
go run ./cmd/api
```

## 一键 Docker 部署

启动 Web + Go API + PostgreSQL：

```bash
sh deploy.sh
```

启动后访问：

- Web：`http://localhost:3000`
- API 健康检查：`http://localhost:8080/healthz`

也可以直接运行：

```bash
docker compose up --build -d
```

停止服务：

```bash
docker compose down
```

部署结构：

- `web`：Nginx 托管 Vite 构建产物，`/api/*` 反向代理到 Go API。
- `api`：Go 后端服务，使用 `DATABASE_URL` 连接 Postgres，并把 V1 应用状态持久化到 `app_state` 表。
- `db`：PostgreSQL，启动时加载 `server/migrations`，数据保存在 Docker named volume `faleme-postgres`。

数据默认会持久化，重启容器不会丢：

```bash
docker compose restart
```

备份数据库：

```bash
docker compose exec db pg_dump -U faleme faleme > faleme-backup.sql
```

恢复数据库：

```bash
docker compose exec -T db psql -U faleme faleme < faleme-backup.sql
```

如果要彻底清空数据：

```bash
docker compose down -v
```

## 关键页面

- `/app`：Web App
- `/`：宣传页
- `/privacy`：隐私政策
- `/terms`：服务条款
- `/support`：App Store 支持页
- `/delete-account`：删除账号与数据

## 内容边界

本产品仅面向成年人。禁止未成年人相关内容、非自愿内容、色情交易、骚扰、仇恨、露骨色情社区化运营和违法暗示。健康内容仅用于教育和提醒，不构成医疗建议。

## V1 完成度

查看 `docs/v1-completion-notes.md`。当前 V1 已覆盖 Web、iOS、Go API 的主要功能闭环；正式运营前仍需接入 PostgreSQL repository、线上 HTTPS、正式图标/截图/域名/邮箱和 App Store 隐私配置。

