# 法了么 V1 完成度说明

## 已实现闭环

- iOS 免登录：使用 `identifierForVendor`，兜底本地 UUID，通过 `X-Faleme-Device-ID` 与后端绑定。
- 完全离线模式：Web 使用 `localStorage`，iOS 使用 `UserDefaults`，只保留“法了！”/“被法了！”核心记录，不访问后端。
- 私密记录：创建、列表、删除、风险等级计算。
- 周期预测：经期窗口、易孕期窗口、频率提醒。
- 伴侣绑定：邀请码、绑定、解绑。
- 伴侣预设留言：使用固定模板和分类词库拼句，只允许预设短句，不开放自由文本。
- 轻社交广场：预设拼句、发布、共鸣、举报、屏蔽。
- 隐私：数据导出、账号删除、隐私锁开关。
- 合规页面：宣传页、隐私政策、服务条款、支持页、删除账号页。
- iOS/Web 视觉：玫瑰粉火苗、iOS grouped 背景、圆角卡片、克制幽默文案。

## 仍需生产化

- 当前 Go 后端已经通过 Postgres `app_state` 表持久化 V1 状态；后续如果用户量增长，可再演进为真正的按表 repository。
- iOS 端真机请求本机 API 时，需要把 `APIService.baseURL` 改成局域网 IP 或线上 HTTPS。
- App Store 图标、截图、隐私营养标签、支持邮箱和域名需要替换为正式资产。
- 删除账号、数据导出在后端已闭环；iOS 端导出目前只展示结果，正式版可接系统分享面板。

## 图标落地

1. 使用 `docs/app-icon-prompt.md` 生成 1024x1024 图标。
2. 导出 PNG，无透明背景，无文字。
3. 放入 `ios/Faleme/Faleme/Assets.xcassets/AppIcon.appiconset/`。
4. 用 Xcode 的 AppIcon 面板检查所有尺寸是否自动生成或补齐。
