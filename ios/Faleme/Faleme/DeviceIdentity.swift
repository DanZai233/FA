import Foundation
import UIKit

enum DeviceIdentity {
    private static let fallbackKey = "faleme.device.identity"

    static var current: String {
        if let vendorID = UIDevice.current.identifierForVendor?.uuidString, !vendorID.isEmpty {
            return "ios-\(vendorID)"
        }
        if let stored = UserDefaults.standard.string(forKey: fallbackKey), !stored.isEmpty {
            return stored
        }
        let generated = "ios-local-\(UUID().uuidString)"
        UserDefaults.standard.set(generated, forKey: fallbackKey)
        return generated
    }
}
