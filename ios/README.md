# 法了么 iOS

这是 V1 的 SwiftUI 原生端骨架，和 Web 共用同一套 Go API 与产品语气。

## 结构

- `FalemeApp.swift`：App 入口。
- `Models.swift`：与后端 JSON 契约一致的模型与枚举。
- `APIService.swift`：基于 async/await 的 API Client，默认连接 `http://localhost:8083`。
- `DeviceIdentity.swift`：免登录设备身份，优先使用 `identifierForVendor`，兜底本地 UUID。
- `AppStore.swift`：主线程状态容器，后端不可用时自动回落演示数据。
- `ContentView.swift`：五个 Tab：记录、周期、伴侣、广场、我的。

## 接入 Xcode

1. 在 Xcode 创建 iOS App 项目，Product Name 使用 `Faleme`，Interface 选择 SwiftUI。
2. 将 `ios/Faleme/*.swift` 加入 App target。
3. 本地调试时先运行 Go API：`cd server && go run ./cmd/api`。
4. 真机调试需要把 `APIService.baseURL` 改成局域网或线上 HTTPS 地址。

## 免登录身份

iOS 端不做登录页。App 会把设备标识通过 `X-Faleme-Device-ID` 发给后端，后端自动创建或读取该设备对应的用户。iOS 不能读取真正的 UDID，因此这里使用 `identifierForVendor`，取不到时使用本地 UUID 兜底。

## 上架注意

- 截图和描述应定位为成人性健康、伴侣沟通和私密记录工具。
- 不展示露骨内容，不承诺医疗诊断。
- 必须配置隐私政策、支持页、删除账号入口和年龄分级。
