# 法了么 API

默认地址：`http://localhost:8083`

鉴权：

- Web：注册/登录后使用 `Authorization: Bearer <token>`（本地存 `faleme.authToken`）。
- 兼容：`Authorization: Bearer demo-token` 仍可访问内置演示账号（若未删除）。
- iOS 免登录：`X-Faleme-Device-ID: ios-<identifierForVendor>`（优先于 Bearer）。

同一套用户数据：设备头与邮箱 Bearer 只是鉴权来源不同；伴侣绑定按用户 ID / 邀请码，iOS 与 Web 可互相绑定。

## 基础

- `GET /healthz`
- `GET /api/v1/auth/captcha` — 返回 `{ id, dataUrl, imageBase64, mimeType }`，`dataUrl` 可直接作 `<img src>`。注册时必须带上 `captchaId` + `captcha`。
- `POST /api/v1/auth/register` — body：`email`, `password`（≥8 位）, `captchaId`, `captcha`, `nickname?`（用户名，仅自己与伴侣可见）, `squareAlias?`（匿名广场身份；省略则服务端生成默认 `匿名`+id 后缀）, `role?`, `adultConfirmed`
- `POST /api/v1/auth/login` — 邮箱登录：`{ "email", "password" }`；或旧版匿名：`{ "nickname", "squareAlias?", "role", "adultConfirmed" }` 创建新用户并返回 token
- `GET /api/v1/me` — 用户含 `nickname`（用户名）、`squareAlias`（广场身份）、`relationshipMode`（`exclusive` 默认 | `poly` 众乐乐）
- `PUT /api/v1/me` — 部分更新 JSON：`nickname?`（≤32 字）, `squareAlias?`（≤24 字；传空字符串则重置为默认匿名前缀）, `role?`, `privacyLock?`, `relationshipMode?`（切到 `poly` 时首次须同时传 `polyOath`，且值必须为 **`我是渣男`** 或 **`我是渣女`**；切回 `exclusive` 时若仍绑定多于一位伴侣会失败）
- `GET /api/v1/me/export`
- `DELETE /api/v1/me`

## 记录与周期

- `GET /api/v1/records` — 亲密记录可含 `partnerId`（众乐乐下标识与哪位搭子相关）
- `POST /api/v1/records`
- `PUT /api/v1/records/:id`
- `DELETE /api/v1/records/:id`
- `GET /api/v1/cycles`
- `POST /api/v1/cycles`
- `GET /api/v1/cycles/prediction`
- `GET /api/v1/reminders/summary`

## 伴侣

- `GET /api/v1/partners` — 返回 **`{ relationshipMode, partners }`**。`partners` 为数组，每项为伴侣连线（`status`: `none` | `pending` | `linked`，含 `inviteCode`、`partnerId`、`peerNickname` 等）。独乐乐通常 0–1 条有效槽位；众乐乐可多条 `linked`。
- `POST /api/v1/partners/invite`
- `POST /api/v1/partners/accept`
- `DELETE /api/v1/partners` — 可选 query **`peerId`**：众乐乐下仅解除与该 `peerId` 的绑定；省略 `peerId` 时在非 poly 或整端清理逻辑下可解除全部当前侧绑定（与旧版 1v1 行为一致）。
- `GET /api/v1/partners/messages` — 每条含 `authorNickname`（发送时的用户名），伴侣留言箱展示用；可含 **`targetPeerId`**（指定接收方时仅该搭子收件箱出现）
- `POST /api/v1/partners/messages` — body：`phrase`, `scene`（可省略，默认 `partner`）, **`targetPartnerId?`**（已绑定多位搭子时建议传入，仅投递给该搭子；省略则广播给所有已绑定搭子）
- **法法同步申请（收件箱）**
  - `GET /api/v1/partners/share-requests` — 返回 `{ inbox, outbox }`。`inbox`：发给当前用户且 `status=pending`；`outbox`：当前用户发起的全部状态。
  - `POST /api/v1/partners/share-requests` — 创建申请（需已绑定伴侣）。body：`occurredAt?`, `type`, `protection`, `consentChecked`, `senderRating`, `senderRole`, **`targetPartnerId?`**（当前用户有多位已绑定搭子时**必填**，指明发起对象）。接受前**不会**写入 `records`。
  - `POST /api/v1/partners/share-requests/:id/accept` — 仅接收方可接受。body：`receiverRating`（1–5，可省略则服务端按默认处理）。成功后为**双方**各写入一条 `sharedWithPartner: true` 的亲密记录；响应 `{ shareRequest, record }` 中 `record` 为当前用户那条。
  - `POST /api/v1/partners/share-requests/:id/reject` — 仅接收方可拒绝。body：`phrase`（trim 后非空，rune 长度 ≤240）。标记 `rejected`，并向**发起方**收件箱写入一条 `scene: share_reject` 的伴侣消息（前缀「婉拒了这次法法同步：」+ `phrase`）；**双方都不会**因该申请产生亲密记录。
  - `GET /api/v1/partners/share-reject-phrases` — 返回 `{ phrases: [{ id, text, emoji? }] }`，供拒绝时选预设（可与 emoji、补充文案组合后作为 `phrase` 提交）。

## 知识与短语

- `GET /api/v1/knowledge/cards`
- `GET /api/v1/phrases`
- `POST /api/v1/messages/compose`

## 轻社交

- `GET /api/v1/social/posts` — 列表项含 `ipRegion`（若有）：发布时按请求来源 IP 经离线库解析的展示文案，非精确定位。
- `POST /api/v1/social/posts` — body：`{ "phrase" }`，trim 后非空；Unicode 字符数（rune）≤ 320，超出 `400 phrase too long`。响应含 `ipRegion`（服务端根据 `X-Forwarded-For` / `X-Real-IP` / `RemoteAddr` 解析；无库或未命中时为空字符串且 JSON 常省略）。
- `POST /api/v1/social/posts/:id/resonate`
- `POST /api/v1/social/posts/:id/block`
- `POST /api/v1/matches/shake`
- `POST /api/v1/reports`

## 合规页面 JSON

- `GET /privacy`
- `GET /terms`
- `GET /support`
- `GET /delete-account`
