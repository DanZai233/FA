import SwiftUI

@main
struct FalemeApp: App {
    @AppStorage("faleme.appearance") private var appearanceRaw = FalemeAppearance.system.rawValue
    @StateObject private var store = AppStore(api: APIService())

    private var appearanceMode: FalemeAppearance {
        FalemeAppearance(rawValue: appearanceRaw) ?? .system
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
                .preferredColorScheme(appearanceMode.preferredColorScheme)
        }
    }
}
