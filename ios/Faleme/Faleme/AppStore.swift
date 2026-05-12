import Foundation
import Combine

@MainActor
final class AppStore: ObservableObject {
    @Published var role: UserRole = .initiator
    @Published var records: [IntimacyRecord] = []
    @Published var cycles: [CycleRecord] = []
    @Published var prediction = HealthAdvice(
        level: .medium,
        title: "先确认，再上车",
        body: "同意、保护、清醒、舒适，这四样缺一项都别硬演偶像剧。",
        action: "先问一句“这样可以吗”，再检查保护措施。"
    )
    @Published var reminder = ReminderSummary(
        title: "今日安全员巡逻完毕",
        body: "同意、保护、清醒、舒适。成年人可以嘴硬，流程不能省。",
        advice: HealthAdvice(level: .medium, title: "先确认，再上车", body: "同意、保护、清醒、舒适。", action: "先问一句“这样可以吗”。"),
        recordCount: 0,
        safeRate: 0
    )
    @Published var posts: [SocialPost] = []
    @Published var match: MatchCard?
    @Published var partnerLink: PartnerLink?
    @Published var partnerMessages: [PartnerMessage] = []
    @Published var knowledgeCards: [KnowledgeCard] = []
    @Published var isOfflineDemo = true
    @Published var privacyMessage = "免登录设备身份已启用"

    private let api: APIService

    init(api: APIService) {
        self.api = api
        self.role = UserRole(rawValue: UserDefaults.standard.string(forKey: "faleme.role") ?? "") ?? .initiator
    }

    func setRole(_ role: UserRole) {
        self.role = role
        UserDefaults.standard.set(role.rawValue, forKey: "faleme.role")
    }

    func load() async {
        do {
            async let records = api.records()
            async let cycles = api.cycles()
            async let posts = api.posts()
            async let knowledgeCards = api.knowledgeCards()
            async let prediction = api.prediction()
            async let reminder = api.reminderSummary()
            async let partner = api.partner()
            async let partnerMessages = api.partnerMessages()
            self.records = try await records
            self.cycles = try await cycles
            self.posts = try await posts
            self.knowledgeCards = try await knowledgeCards
            self.prediction = try await prediction.todayAdvice
            self.reminder = try await reminder
            self.partnerLink = try? await partner
            self.partnerMessages = try await partnerMessages
            self.isOfflineDemo = false
        } catch {
            seedDemoData()
            self.isOfflineDemo = true
        }
    }

    func addRecord(type: IntimacyType, protection: ProtectionMethod) async {
        let record = IntimacyRecord(
            id: "ios-\(Date().timeIntervalSince1970)",
            userId: nil,
            occurredAt: Self.todayString,
            type: type,
            protection: protection,
            consentChecked: true,
            sharedWithPartner: false,
            rating: 4,
            riskLevel: protection == .none ? .high : .low,
            noteTags: [type.title, protection.title]
        )
        records.insert(record, at: 0)
        do {
            let saved = try await api.createRecord(record)
            if let index = records.firstIndex(where: { $0.id == record.id }) {
                records[index] = saved
            }
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func delete(record: IntimacyRecord) async {
        records.removeAll { $0.id == record.id }
        do {
            try await api.deleteRecord(id: record.id)
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func sendPartnerMessage(phrase: String) async {
        let optimistic = PartnerMessage(id: "local-msg-\(Date().timeIntervalSince1970)", userId: "local", phrase: phrase, scene: "partner", createdAt: Self.todayString)
        partnerMessages.insert(optimistic, at: 0)
        do {
            let saved = try await api.createPartnerMessage(phrase: phrase)
            if let index = partnerMessages.firstIndex(where: { $0.id == optimistic.id }) {
                partnerMessages[index] = saved
            }
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func togglePartnerLink() async {
        if partnerLink?.status == "linked" || partnerLink?.status == "pending" {
            do {
                partnerLink = try await api.unlinkPartner()
                isOfflineDemo = false
            } catch {
                partnerLink = nil
                isOfflineDemo = true
            }
        } else {
            do {
                partnerLink = try await api.createPartnerInvite()
                isOfflineDemo = false
            } catch {
                partnerLink = PartnerLink(id: "local-partner", userId: "local", partnerId: nil, inviteCode: "FALV1", status: "pending", canShare: false, createdAt: Self.todayString, confirmedAt: nil)
                isOfflineDemo = true
            }
        }
    }

    func acceptPartnerInvite(inviteCode: String) async {
        do {
            partnerLink = try await api.acceptPartnerInvite(inviteCode: inviteCode)
            isOfflineDemo = false
        } catch {
            partnerLink = PartnerLink(id: "local-accepted", userId: "local", partnerId: "partner-by-\(inviteCode)", inviteCode: inviteCode, status: "linked", canShare: true, createdAt: Self.todayString, confirmedAt: Self.todayString)
            isOfflineDemo = true
        }
    }

    func saveCycle(periodStart: String, periodEnd: String?, cycleLength: Int) async {
        let cycle = CycleRecord(id: "ios-cycle-\(Date().timeIntervalSince1970)", periodStart: periodStart, periodEnd: periodEnd, cycleLength: cycleLength)
        cycles.insert(cycle, at: 0)
        do {
            let saved = try await api.createCycle(cycle)
            if let index = cycles.firstIndex(where: { $0.id == cycle.id }) {
                cycles[index] = saved
            }
            prediction = try await api.prediction().todayAdvice
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func publish(phrase: String) async {
        do {
            let post = try await api.createPost(phrase: phrase)
            posts.insert(post, at: 0)
            isOfflineDemo = false
        } catch {
            posts.insert(
                SocialPost(
                    id: "local-\(Date().timeIntervalSince1970)",
                    authorAlias: "匿名成年人",
                    phrase: phrase,
                    resonanceCount: 0,
                    createdAt: Self.todayString,
                    reported: false,
                    blocked: false
                ),
                at: 0
            )
            isOfflineDemo = true
        }
    }

    func shakeMatch() async {
        do {
            match = try await api.shake()
            isOfflineDemo = false
        } catch {
            match = MatchCard(id: "local-match-\(Date().timeIntervalSince1970)", alias: "附近不存在的人", phrase: randomLocalPhrase(), expiresAt: Self.todayString)
            isOfflineDemo = true
        }
    }

    func resonate(post: SocialPost) async {
        do {
            let updated = try await api.resonatePost(id: post.id)
            replacePost(updated)
            isOfflineDemo = false
        } catch {
            replacePost(
                SocialPost(
                    id: post.id,
                    authorAlias: post.authorAlias,
                    phrase: post.phrase,
                    resonanceCount: post.resonanceCount + 1,
                    createdAt: post.createdAt,
                    reported: post.reported,
                    blocked: post.blocked
                )
            )
            isOfflineDemo = true
        }
    }

    func report(post: SocialPost) async {
        do {
            try await api.reportPost(id: post.id, reason: "用户主动举报")
            replacePost(
                SocialPost(
                    id: post.id,
                    authorAlias: post.authorAlias,
                    phrase: post.phrase,
                    resonanceCount: post.resonanceCount,
                    createdAt: post.createdAt,
                    reported: true,
                    blocked: post.blocked
                )
            )
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func block(post: SocialPost) async {
        posts.removeAll { $0.id == post.id }
        do {
            _ = try await api.blockPost(id: post.id)
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func exportData() async {
        do {
            let data = try await api.exportData()
            privacyMessage = "已导出 \(data.count) 字节数据。真机版本可接分享面板。"
            isOfflineDemo = false
        } catch {
            privacyMessage = "后端未连接，当前只能查看本地演示数据。"
            isOfflineDemo = true
        }
    }

    func deleteAccount() async {
        do {
            try await api.deleteAccount()
            records = []
            posts = []
            privacyMessage = "账号与设备数据已请求删除。"
            isOfflineDemo = false
        } catch {
            privacyMessage = "删除请求未送达后端，请稍后再试。"
            isOfflineDemo = true
        }
    }

    private func seedDemoData() {
        records = [
            IntimacyRecord(id: "demo-1", userId: nil, occurredAt: Self.todayString, type: .penetrative, protection: .condom, consentChecked: true, sharedWithPartner: true, rating: 5, riskLevel: .low, noteTags: ["安全套上岗"])
        ]
        role = UserRole(rawValue: UserDefaults.standard.string(forKey: "faleme.role") ?? "") ?? .initiator
        partnerLink = PartnerLink(id: "demo-partner", userId: "demo", partnerId: nil, inviteCode: "FALV1", status: "pending", canShare: false, createdAt: Self.todayString, confirmedAt: nil)
        posts = [
            SocialPost(id: "post-1", authorAlias: "匿名安全员", phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", resonanceCount: 128, createdAt: Self.todayString, reported: false, blocked: false)
        ]
        match = MatchCard(id: "match-demo", alias: "附近不存在的人", phrase: "今晚月色不错 / 这位成年人 / 申请抱抱 / 但安全第一", expiresAt: Self.todayString)
        partnerMessages = [
            PartnerMessage(id: "msg-1", userId: "demo", phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", scene: "partner", createdAt: Self.todayString)
        ]
        knowledgeCards = [
            KnowledgeCard(id: "k-1", category: "保护", title: "安全套不是气氛杀手", body: "正确佩戴、全程使用、事后检查。", action: "先准备，再浪漫。", tone: "成年人不赌概率。")
        ]
    }

    private func replacePost(_ post: SocialPost) {
        if let index = posts.firstIndex(where: { $0.id == post.id }) {
            posts[index] = post
        }
    }

    private static var todayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

private func randomLocalPhrase() -> String {
    let tones = ["今晚月色不错", "理智正在下线", "安全员已上线", "嘴硬但诚实", "荷尔蒙请求发言", "边界感已加载"]
    let subjects = ["我的荷尔蒙", "这位成年人", "今日小火苗", "伴侣雷达", "身体信号", "亲密副本"]
    let actions = ["申请抱抱", "建议冷静三分钟", "提醒戴好装备", "请求确认同意", "先去洗手", "暂停无保护冲锋"]
    let endings = ["但安全第一", "先喝水再说", "尊重同意最性感", "不舒服就立刻停", "别拿概率开玩笑", "可以荒唐但别糊涂"]
    return "\(tones.randomElement() ?? tones[0]) / \(subjects.randomElement() ?? subjects[0]) / \(actions.randomElement() ?? actions[0]) / \(endings.randomElement() ?? endings[0])"
}
