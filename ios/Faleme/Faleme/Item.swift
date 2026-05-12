//
//  Item.swift
//  Faleme
//
//  Created by 蛋仔 on 2026/5/13.
//

import Foundation
import SwiftData

@Model
final class Item {
    var timestamp: Date
    
    init(timestamp: Date) {
        self.timestamp = timestamp
    }
}
