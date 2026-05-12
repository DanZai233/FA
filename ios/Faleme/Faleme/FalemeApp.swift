import SwiftUI

@main
struct FalemeApp: App {
    @StateObject private var store = AppStore(api: APIService())

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
