import Foundation
import Combine

struct ShareExportItem: Identifiable {
    let id = UUID()
    let url: URL
}

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
    @Published var partnerHub: PartnerHub?
    @Published var relationshipMode: String = "exclusive"
    @Published var partnerMessages: [PartnerMessage] = []
    @Published var partnerShareInbox: [PartnerShareRequest] = []
    @Published var partnerShareOutbox: [PartnerShareRequest] = []
    @Published var shareRejectPhrases: [ShareRejectPhrase] = []
    @Published var knowledgeCards: [KnowledgeCard] = []
    @Published var isOfflineDemo = true
    @Published var privacyMessage = "免登录设备身份已启用"
    @Published var profileNickname = "免登录成年人"
    @Published var profileSquareAlias = ""
    @Published var privacyLockEnabled = true
    @Published var shareExportItem: ShareExportItem?
    @Published var homeEcho: String?
    @Published var recordSheetBanter: String?

    private let api: APIService
    private var homeEchoResetTask: Task<Void, Never>?

    init(api: APIService) {
        self.api = api
        self.role = UserRole(rawValue: UserDefaults.standard.string(forKey: "faleme.role") ?? "") ?? .initiator
    }

    var linkedPartnerWires: [PartnerWire] {
        (partnerHub?.partners ?? []).filter { $0.status == "linked" && !($0.partnerId?.isEmpty ?? true) }
    }

    var primaryPartnerWire: PartnerWire? {
        guard let hub = partnerHub else { return nil }
        if let p = hub.partners.first(where: { $0.status == "pending" }) { return p }
        return hub.partners.first(where: { $0.status == "linked" && !($0.partnerId?.isEmpty ?? true) })
    }

    var anyPartnerLinked: Bool {
        !linkedPartnerWires.isEmpty
    }

    func effectiveRelationshipMode() -> String {
        partnerHub?.relationshipMode ?? relationshipMode
    }

    func setRole(_ role: UserRole) {
        self.role = role
        UserDefaults.standard.set(role.rawValue, forKey: "faleme.role")
        Task {
            do {
                let me = try await api.updateMe(role: role)
                profileNickname = me.nickname
                profileSquareAlias = me.squareAlias ?? ""
                privacyLockEnabled = me.privacyLock ?? true
                isOfflineDemo = false
            } catch {
                isOfflineDemo = true
            }
        }
    }

    func updatePrivacyLock(_ on: Bool) {
        privacyLockEnabled = on
        Task {
            do {
                let me = try await api.updateMe(privacyLock: on)
                profileNickname = me.nickname
                profileSquareAlias = me.squareAlias ?? ""
                privacyLockEnabled = me.privacyLock ?? true
                isOfflineDemo = false
            } catch {
                isOfflineDemo = true
            }
        }
    }

    func saveNickname(_ raw: String) async {
        let name = String(raw.trimmingCharacters(in: .whitespacesAndNewlines).prefix(32))
        do {
            let me = try await api.updateMe(nickname: name)
            profileNickname = me.nickname
            profileSquareAlias = me.squareAlias ?? ""
            isOfflineDemo = false
        } catch {
            profileNickname = name
            isOfflineDemo = true
        }
    }

    func saveSquareAlias(_ raw: String) async {
        let alias = String(raw.trimmingCharacters(in: .whitespacesAndNewlines).prefix(24))
        do {
            let me = try await api.updateMe(squareAlias: alias)
            profileNickname = me.nickname
            profileSquareAlias = me.squareAlias ?? ""
            isOfflineDemo = false
        } catch {
            profileSquareAlias = alias
            isOfflineDemo = true
        }
    }

    func clearShareExport() {
        if let url = shareExportItem?.url {
            try? FileManager.default.removeItem(at: url)
        }
        shareExportItem = nil
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
            async let shareWire = api.partnerShareRequests()
            self.records = try await records
            self.cycles = try await cycles
            self.posts = try await posts
            self.knowledgeCards = try await knowledgeCards
            self.prediction = try await prediction.todayAdvice
            self.reminder = try await reminder
            self.partnerHub = try await partner
            self.partnerMessages = try await partnerMessages
            if let wire = try? await shareWire {
                partnerShareInbox = wire.inbox
                partnerShareOutbox = wire.outbox
            } else {
                partnerShareInbox = []
                partnerShareOutbox = []
            }
            shareRejectPhrases = (try? await api.partnerShareRejectPhrases()) ?? []
            self.isOfflineDemo = false
            await refreshProfileFromServer()
        } catch {
            seedDemoData()
            self.isOfflineDemo = true
        }
    }

    private func refreshProfileFromServer() async {
        guard let me = try? await api.me() else { return }
        profileNickname = me.nickname
        profileSquareAlias = me.squareAlias ?? ""
        privacyLockEnabled = me.privacyLock ?? true
        role = me.role
        relationshipMode = me.relationshipMode ?? "exclusive"
        UserDefaults.standard.set(me.role.rawValue, forKey: "faleme.role")
    }

    func bumpAndPrepareRecordSheetBanter() {
        let n = FalemeQuips.bumpTodayFabClick(deviceKey: DeviceIdentity.current)
        let latest = records.first?.rating
        recordSheetBanter = FalemeQuips.heroFabBanter(role: role, clickCountToday: n, latestRating: latest)
    }

    func clearRecordSheetBanter() {
        recordSheetBanter = nil
    }

    func flashHomeEcho(_ text: String) {
        homeEcho = text
        homeEchoResetTask?.cancel()
        homeEchoResetTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 8_000_000_000)
            if !Task.isCancelled { homeEcho = nil }
        }
    }

    func dismissHomeEcho() {
        homeEchoResetTask?.cancel()
        homeEcho = nil
    }

    func refreshCompanionData() async {
        if let hub = try? await api.partner() {
            partnerHub = hub
            relationshipMode = hub.relationshipMode
        }
        if let wire = try? await api.partnerShareRequests() {
            partnerShareInbox = wire.inbox
            partnerShareOutbox = wire.outbox
        }
        if let msgs = try? await api.partnerMessages() {
            partnerMessages = msgs
        }
        if let rec = try? await api.records() {
            records = rec
        }
        shareRejectPhrases = (try? await api.partnerShareRejectPhrases()) ?? shareRejectPhrases
    }

    func acceptPartnerShare(id: String, receiverRating: Int) async {
        do {
            _ = try await api.acceptPartnerShareRequest(id: id, receiverRating: receiverRating)
            isOfflineDemo = false
            await refreshCompanionData()
        } catch {
            isOfflineDemo = true
        }
    }

    func rejectPartnerShare(id: String, phrase: String) async {
        do {
            _ = try await api.rejectPartnerShareRequest(id: id, phrase: phrase)
            isOfflineDemo = false
            await refreshCompanionData()
        } catch {
            isOfflineDemo = true
        }
    }

    func addRecord(type: IntimacyType, protection: ProtectionMethod, rating: Int, consentChecked: Bool, sharedWithPartner: Bool, targetPartnerId: String?) async {
        let linkedList = linkedPartnerWires
        let linked = !linkedList.isEmpty
        let poly = effectiveRelationshipMode() == "poly"
        let multi = poly && linkedList.count > 1

        if sharedWithPartner && linked {
            var tid = targetPartnerId?.trimmingCharacters(in: .whitespacesAndNewlines)
            if tid?.isEmpty ?? true {
                tid = linkedList.count == 1 ? linkedList[0].partnerId : nil
            }
            if multi, tid == nil || tid?.isEmpty == true {
                flashHomeEcho("众乐乐：请选择法法同步的对象。")
                return
            }
            let body = CreatePartnerShareBody(
                occurredAt: Self.todayString,
                type: type,
                protection: protection,
                consentChecked: consentChecked,
                senderRating: min(5, max(1, rating)),
                senderRole: role,
                targetPartnerId: tid
            )
            do {
                _ = try await api.createPartnerShareRequest(body)
                await refreshCompanionData()
                isOfflineDemo = false
                flashHomeEcho(FalemeQuips.partnerShareAfterSend(senderRole: role))
            } catch {
                isOfflineDemo = true
            }
            return
        }

        var pid: String? = targetPartnerId?.trimmingCharacters(in: .whitespacesAndNewlines)
        if pid?.isEmpty ?? true {
            pid = linkedList.count == 1 ? linkedList[0].partnerId : nil
        }
        if multi, pid == nil || pid?.isEmpty == true {
            flashHomeEcho("众乐乐：请先选择本次记录关联的搭子。")
            return
        }

        let record = IntimacyRecord(
            id: "ios-\(Date().timeIntervalSince1970)",
            userId: nil,
            occurredAt: Self.todayString,
            type: type,
            protection: protection,
            consentChecked: consentChecked,
            sharedWithPartner: sharedWithPartner,
            rating: rating,
            riskLevel: protection == .none ? .high : .low,
            noteTags: [type.title, protection.title],
            createdAt: nil,
            partnerId: pid
        )
        records.insert(record, at: 0)
        do {
            let saved = try await api.createRecord(record)
            if let index = records.firstIndex(where: { $0.id == record.id }) {
                records[index] = saved
            }
            isOfflineDemo = false
            flashHomeEcho(FalemeQuips.afterSaveBanter(role: role, rating: rating))
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

    func sendPartnerMessage(phrase: String, targetPartnerId: String? = nil) async {
        let optimistic = PartnerMessage(
            id: "local-msg-\(Date().timeIntervalSince1970)",
            userId: "local",
            authorNickname: profileNickname,
            phrase: phrase,
            scene: "partner",
            targetPeerId: targetPartnerId,
            createdAt: Self.todayString
        )
        partnerMessages.insert(optimistic, at: 0)
        do {
            let saved = try await api.createPartnerMessage(phrase: phrase, targetPartnerId: targetPartnerId)
            if let index = partnerMessages.firstIndex(where: { $0.id == optimistic.id }) {
                partnerMessages[index] = saved
            }
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func togglePartnerLink() async {
        let poly = effectiveRelationshipMode() == "poly"
        let linkedList = linkedPartnerWires
        let multiPoly = poly && linkedList.count > 1
        if multiPoly {
            do {
                _ = try await api.createPartnerInvite()
                if let hub = try? await api.partner() {
                    partnerHub = hub
                    relationshipMode = hub.relationshipMode
                }
                isOfflineDemo = false
            } catch {
                isOfflineDemo = true
            }
            return
        }
        let primary = primaryPartnerWire
        if primary?.status == "linked" || primary?.status == "pending" {
            do {
                partnerHub = try await api.unlinkPartner(peerId: nil)
                relationshipMode = partnerHub?.relationshipMode ?? relationshipMode
                isOfflineDemo = false
            } catch {
                partnerHub = nil
                isOfflineDemo = true
            }
        } else {
            do {
                _ = try await api.createPartnerInvite()
                if let hub = try? await api.partner() {
                    partnerHub = hub
                    relationshipMode = hub.relationshipMode
                }
                isOfflineDemo = false
            } catch {
                partnerHub = PartnerHub(relationshipMode: "exclusive", partners: [
                    PartnerWire(id: "local-partner", userId: "local", partnerId: nil, inviteCode: "FALV1", status: "pending", canShare: false, createdAt: Self.todayString, confirmedAt: nil, peerNickname: nil)
                ])
                isOfflineDemo = true
            }
        }
    }

    func unlinkPartnerPeer(peerId: String) async {
        do {
            partnerHub = try await api.unlinkPartner(peerId: peerId)
            relationshipMode = partnerHub?.relationshipMode ?? relationshipMode
            isOfflineDemo = false
        } catch {
            isOfflineDemo = true
        }
    }

    func acceptPartnerInvite(inviteCode: String) async {
        do {
            _ = try await api.acceptPartnerInvite(inviteCode: inviteCode)
            if let hub = try? await api.partner() {
                partnerHub = hub
                relationshipMode = hub.relationshipMode
            }
            isOfflineDemo = false
        } catch {
            partnerHub = PartnerHub(relationshipMode: "exclusive", partners: [
                PartnerWire(id: "local-accepted", userId: "local", partnerId: "partner-by-\(inviteCode)", inviteCode: inviteCode, status: "linked", canShare: true, createdAt: Self.todayString, confirmedAt: Self.todayString, peerNickname: nil)
            ])
            isOfflineDemo = true
        }
    }

    func enablePolyMode(oath: String) async throws {
        let me = try await api.updateMe(relationshipMode: "poly", polyOath: oath)
        profileNickname = me.nickname
        profileSquareAlias = me.squareAlias ?? ""
        relationshipMode = me.relationshipMode ?? "poly"
        if let hub = try? await api.partner() {
            partnerHub = hub
        }
        isOfflineDemo = false
    }

    func disablePolyMode() async throws {
        let me = try await api.updateMe(relationshipMode: "exclusive")
        profileNickname = me.nickname
        profileSquareAlias = me.squareAlias ?? ""
        relationshipMode = me.relationshipMode ?? "exclusive"
        if let hub = try? await api.partner() {
            partnerHub = hub
        }
        isOfflineDemo = false
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
            let alias = profileSquareAlias.trimmingCharacters(in: .whitespacesAndNewlines)
            posts.insert(
                SocialPost(
                    id: "local-\(Date().timeIntervalSince1970)",
                    authorAlias: alias.isEmpty ? "匿名成年人" : alias,
                    phrase: phrase,
                    resonanceCount: 0,
                    createdAt: Self.todayString,
                    reported: false,
                    blocked: false,
                    ipRegion: nil
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
                    blocked: post.blocked,
                    ipRegion: post.ipRegion
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
                    blocked: post.blocked,
                    ipRegion: post.ipRegion
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
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("faleme-export-\(Int(Date().timeIntervalSince1970)).json")
            try data.write(to: url)
            shareExportItem = ShareExportItem(url: url)
            privacyMessage = "在系统分享面板中选择“存储到文件”或发送。"
            isOfflineDemo = false
        } catch {
            privacyMessage = "导出失败，请确认已连接后端。"
            isOfflineDemo = true
        }
    }

    func deleteAccount() async {
        do {
            try await api.deleteAccount()
            records = []
            posts = []
            cycles = []
            partnerMessages = []
            partnerShareInbox = []
            partnerShareOutbox = []
            shareRejectPhrases = []
            partnerHub = nil
            relationshipMode = "exclusive"
            match = nil
            privacyMessage = "账号已删除。"
            isOfflineDemo = false
            await load()
        } catch {
            privacyMessage = "删除请求未送达后端，请稍后再试。"
            isOfflineDemo = true
        }
    }

    private func seedDemoData() {
        records = [
            IntimacyRecord(id: "demo-1", userId: nil, occurredAt: Self.todayString, type: .penetrative, protection: .condom, consentChecked: true, sharedWithPartner: true, rating: 5, riskLevel: .low, noteTags: ["安全套上岗"], createdAt: nil, partnerId: nil)
        ]
        role = UserRole(rawValue: UserDefaults.standard.string(forKey: "faleme.role") ?? "") ?? .initiator
        relationshipMode = "exclusive"
        partnerHub = PartnerHub(relationshipMode: "exclusive", partners: [
            PartnerWire(id: "demo-partner", userId: "demo", partnerId: nil, inviteCode: "FALV1", status: "pending", canShare: false, createdAt: Self.todayString, confirmedAt: nil, peerNickname: nil)
        ])
        posts = [
            SocialPost(id: "post-1", authorAlias: "匿名安全员", phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", resonanceCount: 128, createdAt: Self.todayString, reported: false, blocked: false, ipRegion: nil)
        ]
        match = MatchCard(id: "match-demo", alias: "附近不存在的人", phrase: "今晚月色不错 / 这位成年人 / 申请抱抱 / 但安全第一", expiresAt: Self.todayString)
        partnerMessages = [
            PartnerMessage(id: "msg-1", userId: "demo", authorNickname: "演示用户", phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", scene: "partner", targetPeerId: nil, createdAt: Self.todayString)
        ]
        partnerShareInbox = []
        partnerShareOutbox = []
        shareRejectPhrases = []
        knowledgeCards = [
            KnowledgeCard(id: "k-1", category: "保护", title: "安全套不是气氛杀手", body: "正确佩戴、全程使用、事后检查。", action: "先准备，再浪漫。", tone: "成年人不赌概率。")
        ]
        profileNickname = "演示用户"
        privacyLockEnabled = true
    }

    private func replacePost(_ post: SocialPost) {
        if let index = posts.firstIndex(where: { $0.id == post.id }) {
            posts[index] = post
        }
    }

    private static var todayString: String {
        FalemeDateFormatting.shanghaiCalendarToday()
    }
}

private func randomLocalPhrase() -> String {
    let tones = ["今晚月色不错", "理智正在下线", "安全员已上线", "嘴硬但诚实", "荷尔蒙请求发言", "边界感已加载"]
    let subjects = ["我的荷尔蒙", "这位成年人", "今日小火苗", "伴侣雷达", "身体信号", "亲密副本"]
    let actions = ["申请抱抱", "建议冷静三分钟", "提醒戴好装备", "请求确认同意", "先去洗手", "暂停无保护冲锋"]
    let endings = ["但安全第一", "先喝水再说", "尊重同意最性感", "不舒服就立刻停", "别拿概率开玩笑", "可以荒唐但别糊涂"]
    return "\(tones.randomElement() ?? tones[0]) / \(subjects.randomElement() ?? subjects[0]) / \(actions.randomElement() ?? actions[0]) / \(endings.randomElement() ?? endings[0])"
}
