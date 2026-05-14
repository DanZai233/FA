# 法了么 API

默认地址：`http://localhost:8083`

鉴权：

- Web 演示：`Authorization: Bearer demo-token`
- iOS 免登录：`X-Faleme-Device-ID: ios-<identifierForVendor>`

## 基础

- `GET /healthz`
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `PUT /api/v1/me`
- `GET /api/v1/me/export`
- `DELETE /api/v1/me`

## 记录与周期

- `GET /api/v1/records`
- `POST /api/v1/records`
- `PUT /api/v1/records/:id`
- `DELETE /api/v1/records/:id`
- `GET /api/v1/cycles`
- `POST /api/v1/cycles`
- `GET /api/v1/cycles/prediction`
- `GET /api/v1/reminders/summary`

## 伴侣

- `GET /api/v1/partners`
- `POST /api/v1/partners/invite`
- `POST /api/v1/partners/accept`
- `DELETE /api/v1/partners`
- `GET /api/v1/partners/messages`
- `POST /api/v1/partners/messages`

## 知识与短语

- `GET /api/v1/knowledge/cards`
- `GET /api/v1/phrases`
- `POST /api/v1/messages/compose`

## 轻社交

- `GET /api/v1/social/posts`
- `POST /api/v1/social/posts`
- `POST /api/v1/social/posts/:id/resonate`
- `POST /api/v1/social/posts/:id/block`
- `POST /api/v1/matches/shake`
- `POST /api/v1/reports`

## 合规页面 JSON

- `GET /privacy`
- `GET /terms`
- `GET /support`
- `GET /delete-account`
