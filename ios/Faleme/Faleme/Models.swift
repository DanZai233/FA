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
    var email: String?
    /// 用户名：仅自己与伴侣可见（API 字段名仍为 nickname）
    var nickname: String
    /// 匿名广场展示身份
    var squareAlias: String?
    var role: UserRole
    var adultConfirmed: Bool
    var privacyLock: Bool?
    /// exclusive（默认）| poly
    var relationshipMode: String?
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
    var createdAt: String?
    /// 众乐乐下关联的伴侣用户 id
    var partnerId: String?
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
    /// 发送时的用户名（nickname），伴侣可见
    var authorNickname: String?
    var phrase: String
    var scene: String
    var targetPeerId: String?
    var createdAt: String
}

struct PartnerWire: Codable, Identifiable, Hashable {
    var id: String
    var userId: String?
    var partnerId: String?
    var inviteCode: String?
    var status: String
    var canShare: Bool?
    var createdAt: String?
    var confirmedAt: String?
    var peerNickname: String?
}

struct PartnerHub: Codable {
    var relationshipMode: String
    var partners: [PartnerWire]
}

struct PartnerShareRequest: Codable, Identifiable, Hashable {
    var id: String
    var fromUserId: String
    var toUserId: String
    /// 列表接口由服务端填充
    var senderNickname: String?
    var receiverNickname: String?
    var status: String
    var senderRole: UserRole?
    var occurredAt: String
    var type: IntimacyType
    var protection: ProtectionMethod
    var consentChecked: Bool
    var senderRating: Int
    var createdAt: String
    var receiverRating: Int?
    var rejectionPhrase: String?
    var acceptedAt: String?
    var rejectedAt: String?
}

struct PartnerShareWire: Codable {
    var inbox: [PartnerShareRequest]
    var outbox: [PartnerShareRequest]
}

struct ShareRejectPhrase: Codable, Identifiable, Hashable {
    var id: String
    var text: String
    var emoji: String?
}

struct PartnerSharePhrasesPayload: Codable {
    var phrases: [ShareRejectPhrase]
}

struct CreatePartnerShareBody: Encodable {
    var occurredAt: String
    var type: IntimacyType
    var protection: ProtectionMethod
    var consentChecked: Bool
    var senderRating: Int
    var senderRole: UserRole
    var targetPartnerId: String?

    enum CodingKeys: String, CodingKey {
        case occurredAt, type, protection, consentChecked, senderRating, senderRole, targetPartnerId
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(occurredAt, forKey: .occurredAt)
        try c.encode(type, forKey: .type)
        try c.encode(protection, forKey: .protection)
        try c.encode(consentChecked, forKey: .consentChecked)
        try c.encode(senderRating, forKey: .senderRating)
        try c.encode(senderRole, forKey: .senderRole)
        if let targetPartnerId, !targetPartnerId.isEmpty {
            try c.encode(targetPartnerId, forKey: .targetPartnerId)
        }
    }
}

struct AcceptPartnerSharePayload: Encodable {
    var receiverRating: Int
}

struct RejectPartnerSharePayload: Encodable {
    var phrase: String
}

struct AcceptPartnerShareResponse: Decodable {
    var shareRequest: PartnerShareRequest
    var record: IntimacyRecord?
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
    /// 轻量共鸣理由计数（懂 / 笑死 / 学到了）
    let resonanceChips: [String: Int]?
    let createdAt: String
    let reported: Bool?
    let blocked: Bool?
    /// 发布时服务端根据来源 IP 离线解析的展示文案
    let ipRegion: String?
}

/// 导出 JSON（年度回顾等；仅解码用到的字段，忽略其余键）
struct DataExport: Decodable {
    let user: UserProfile
    let records: [IntimacyRecord]
    let messages: [PartnerMessage]
    let shareRequests: [PartnerShareRequest]?

    enum CodingKeys: String, CodingKey {
        case user, records, messages, shareRequests
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        user = try c.decode(UserProfile.self, forKey: .user)
        records = try c.decodeIfPresent([IntimacyRecord].self, forKey: .records) ?? []
        messages = try c.decodeIfPresent([PartnerMessage].self, forKey: .messages) ?? []
        shareRequests = try c.decodeIfPresent([PartnerShareRequest].self, forKey: .shareRequests)
    }
}

struct MatchCard: Codable, Identifiable {
    let id: String
    let alias: String
    let phrase: String
    let expiresAt: String
}
