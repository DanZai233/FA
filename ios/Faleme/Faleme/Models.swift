import Foundation

enum RiskLevel: String, Codable {
    case low
    case medium
    case high
}

enum UserRole: String, Codable, CaseIterable {
    case initiator
    case receiver
    case `switch`

    var title: String {
        switch self {
        case .initiator: return "主动出发"
        case .receiver: return "被温柔照顾"
        case .switch: return "看气氛发挥"
        }
    }
}

enum ProtectionMethod: String, Codable, CaseIterable {
    case condom
    case oralContraceptive = "oral_contraceptive"
    case iud
    case none
    case notSure = "not_sure"

    var title: String {
        switch self {
        case .condom: return "安全套上岗"
        case .oralContraceptive: return "短效避孕药"
        case .iud: return "宫内节育器"
        case .none: return "没有保护"
        case .notSure: return "记不清了"
        }
    }
}

enum IntimacyType: String, Codable, CaseIterable {
    case cuddle
    case kiss
    case manual
    case oral
    case penetrative
    case solo
    case other

    var title: String {
        switch self {
        case .cuddle: return "抱抱充电"
        case .kiss: return "亲亲升温"
        case .manual: return "手动挡"
        case .oral: return "口头表扬"
        case .penetrative: return "正片开始"
        case .solo: return "单人排解"
        case .other: return "奇妙支线"
        }
    }
}

struct UserProfile: Codable, Identifiable {
    let id: String
    var deviceId: String?
    var nickname: String
    var role: UserRole
    var adultConfirmed: Bool
    var privacyLock: Bool?
}

struct IntimacyRecord: Codable, Identifiable {
    var id: String
    var userId: String?
    var occurredAt: String
    var type: IntimacyType
    var protection: ProtectionMethod
    var consentChecked: Bool
    var sharedWithPartner: Bool
    var rating: Int
    var riskLevel: RiskLevel
    var noteTags: [String]
}

struct CycleRecord: Codable, Identifiable {
    var id: String
    var periodStart: String
    var periodEnd: String?
    var cycleLength: Int
}

struct CyclePrediction: Codable {
    var nextPeriodStart: String
    var nextPeriodEnd: String
    var fertileStart: String
    var fertileEnd: String
    var todayAdvice: HealthAdvice
}

struct HealthAdvice: Codable {
    var level: RiskLevel
    var title: String
    var body: String
    var action: String
}

struct ReminderSummary: Codable {
    var title: String
    var body: String
    var advice: HealthAdvice
    var recordCount: Int
    var safeRate: Int
}

struct PartnerMessage: Codable, Identifiable {
    var id: String
    var userId: String
    var phrase: String
    var scene: String
    var createdAt: String
}

struct KnowledgeCard: Codable, Identifiable {
    let id: String
    let category: String
    let title: String
    let body: String
    let action: String
    let tone: String
}

struct SocialPost: Codable, Identifiable {
    let id: String
    let authorAlias: String
    let phrase: String
    let resonanceCount: Int
    let createdAt: String
    let reported: Bool?
    let blocked: Bool?
}

struct MatchCard: Codable, Identifiable {
    let id: String
    let alias: String
    let phrase: String
    let expiresAt: String
}
