import SwiftUI
import UIKit

struct ContentView: View {
    @EnvironmentObject private var store: AppStore
    @AppStorage("faleme.offline.enabled") private var offlineMode = false

    var body: some View {
        Group {
            if offlineMode {
                OfflineModeView()
            } else {
                TabView {
                    HomeView()
                        .tabItem { Label("记录", systemImage: "flame.fill") }
                    CycleView()
                        .tabItem { Label("法法日历", systemImage: "calendar") }
                    PartnerView()
                        .tabItem { Label("伴侣", systemImage: "heart.fill") }
                    SquareView()
                        .tabItem { Label("广场", systemImage: "message.fill") }
                    ProfileView()
                        .tabItem { Label("我的", systemImage: "person.fill") }
                }
                .tint(Color.rose)
                .task {
                    await store.load()
                }
            }
        }
    }
}

private struct OfflineRecord: Codable, Identifiable {
    let id: String
    let label: String
    let role: String
    let occurredAt: String
    let timestamp: TimeInterval
}

private struct OfflineModeView: View {
    @AppStorage("faleme.offline.enabled") private var offlineMode = true
    @AppStorage("faleme.offline.role") private var roleRaw = UserRole.initiator.rawValue
    @State private var records: [OfflineRecord] = Self.loadRecords()

    var body: some View {
        let role = UserRole(rawValue: roleRaw) ?? .initiator
        let theme = RoleTheme(role: role)
        ScrollView {
            VStack(spacing: 20) {
                PageHeader(title: "完全离线", subtitle: "不联网、不同步、不社交。只记录今天是法了，还是被法了。")
                roleSwitcher(role: role)
                Button {
                    save(theme.buttonTitle, role: role)
                } label: {
                    VStack(spacing: 12) {
                        Image(systemName: theme.icon)
                            .font(.system(size: 68))
                        Text(theme.buttonTitle)
                            .font(.system(size: 38, weight: .black))
                        Text("完全本地，只记这一笔")
                            .font(.caption.bold())
                    }
                    .foregroundStyle(.white)
                    .frame(width: 260, height: 260)
                    .background(theme.gradient, in: Circle())
                    .shadow(color: theme.shadow, radius: 26, y: 18)
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity)
                HStack {
                    MetricPill(label: "今日", value: "\(todayCount) 次")
                    MetricPill(label: "本机累计", value: "\(records.count) 条")
                }
                Card(title: "离线记录") {
                    ForEach(records) { record in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(record.label)
                                    .font(.headline.bold())
                                Text(record.occurredAt)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("本地")
                                .font(.caption.bold())
                                .foregroundStyle(record.role == UserRole.receiver.rawValue ? Color.violet : Color.rose)
                        }
                        .padding(.vertical, 6)
                    }
                    if records.isEmpty {
                        Text("还没记录。宇宙很安静，你也可以很安静。")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                HStack {
                    Button("清空本地") {
                        records = []
                        Self.store(records)
                    }
                    .buttonStyle(.bordered)
                    Button("回到完整版") {
                        offlineMode = false
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.grouped)
    }

    private var todayCount: Int {
        records.filter { $0.occurredAt == Self.todayString }.count
    }

    private func roleSwitcher(role: UserRole) -> some View {
        HStack(spacing: 8) {
            roleButton("我是“法”的一方", selected: role != .receiver) {
                roleRaw = UserRole.initiator.rawValue
            }
            roleButton("我是“被法”的一方", selected: role == .receiver) {
                roleRaw = UserRole.receiver.rawValue
            }
        }
        .padding(4)
        .background(.white.opacity(0.75), in: RoundedRectangle(cornerRadius: 24))
    }

    private func roleButton(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(.caption.bold())
            .foregroundStyle(selected ? .primary : .secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(selected ? AnyShapeStyle(.white) : AnyShapeStyle(.clear), in: RoundedRectangle(cornerRadius: 18))
    }

    private func save(_ label: String, role: UserRole) {
        records.insert(OfflineRecord(id: UUID().uuidString, label: label, role: role.rawValue, occurredAt: Self.todayString, timestamp: Date().timeIntervalSince1970), at: 0)
        Self.store(records)
    }

    private static func loadRecords() -> [OfflineRecord] {
        guard let data = UserDefaults.standard.data(forKey: "faleme.offline.records") else { return [] }
        return (try? JSONDecoder().decode([OfflineRecord].self, from: data)) ?? []
    }

    private static func store(_ records: [OfflineRecord]) {
        let data = try? JSONEncoder().encode(records)
        UserDefaults.standard.set(data, forKey: "faleme.offline.records")
    }

    private static var todayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

private struct RoleTheme {
    let role: UserRole

    var isReceiver: Bool {
        role == .receiver
    }

    var buttonTitle: String {
        isReceiver ? "被法了！" : "法了！"
    }

    var subtitle: String {
        isReceiver ? "被温柔照顾，也要有边界" : "主动出发，但别忘了安全带"
    }

    var icon: String {
        isReceiver ? "heart.fill" : "flame.fill"
    }

    var gradient: LinearGradient {
        LinearGradient(
            colors: isReceiver ? [Color.violet, Color.pink] : [Color.rose, Color.pink],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var shadow: Color {
        (isReceiver ? Color.violet : Color.rose).opacity(0.35)
    }
}

private let phraseTones = ["今晚月色不错", "理智正在下线", "安全员已上线", "嘴硬但诚实", "荷尔蒙请求发言", "气氛有点危险", "边界感已加载", "温柔正在巡逻"]
private let phraseSubjects = ["我的荷尔蒙", "这位成年人", "今日小火苗", "伴侣雷达", "身体信号", "单人玩家", "亲密副本", "边界按钮"]
private let phraseActions = ["申请抱抱", "建议冷静三分钟", "提醒戴好装备", "请求确认同意", "先去洗手", "打开温柔模式", "暂停无保护冲锋", "选择单人排解"]
private let phraseEndings = ["但安全第一", "请勿无证驾驶", "先喝水再说", "尊重同意最性感", "不舒服就立刻停", "别拿概率开玩笑", "温柔也要有边界", "可以荒唐但别糊涂"]

private func randomPhrase() -> String {
    "\(phraseTones.randomElement() ?? phraseTones[0]) / \(phraseSubjects.randomElement() ?? phraseSubjects[0]) / \(phraseActions.randomElement() ?? phraseActions[0]) / \(phraseEndings.randomElement() ?? phraseEndings[0])"
}

private struct HomeView: View {
    @EnvironmentObject private var store: AppStore
    @State private var isAdding = false

    var body: some View {
        let theme = RoleTheme(role: store.role)
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    HomeHeroView(theme: theme, records: store.records) {
                        isAdding = true
                    }

                    SafetyChecklistCard(records: store.records)
                    AdviceCard(advice: store.prediction)
                    Card(title: store.reminder.title) {
                        Text(store.reminder.body)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: 8) {
                            MetricPill(label: "总记录", value: "\(store.reminder.recordCount) 条")
                            MetricPill(label: "安全率", value: "\(store.reminder.safeRate)%")
                        }
                    }

                    Card(title: "最近记录") {
                        ForEach(store.records) { record in
                            RecordRow(record: record) {
                                Task { await store.delete(record: record) }
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(Color.grouped)
            .sheet(isPresented: $isAdding) {
                AddRecordView()
            }
        }
    }
}

private struct HomeHeroView: View {
    let theme: RoleTheme
    let records: [IntimacyRecord]
    var onTap: () -> Void

    var body: some View {
        VStack(spacing: 22) {
            VStack(spacing: 10) {
                Text("adult wellness")
                    .font(.caption2.bold())
                    .tracking(3)
                    .foregroundStyle(.white.opacity(0.55))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Text("法了么")
                    .font(.system(size: 44, weight: .black))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.85)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Text("嘴上很荒唐，身体很诚实，安全要更诚实。")
                    .font(.subheadline.bold())
                    .foregroundStyle(.white.opacity(0.78))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity)

            Button(action: onTap) {
                VStack(spacing: 10) {
                    Image(systemName: theme.icon)
                        .font(.system(size: 56))
                    Text(theme.buttonTitle)
                        .font(.system(size: 34, weight: .black))
                    Text(theme.subtitle)
                        .font(.caption.bold())
                        .foregroundStyle(.white.opacity(0.76))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(.white)
                .frame(width: 208, height: 208)
                .background(.white.opacity(0.18), in: Circle())
                .overlay(Circle().stroke(.white.opacity(0.28), lineWidth: 1))
                .shadow(color: .black.opacity(0.18), radius: 24, y: 16)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)

            HStack(spacing: 8) {
                HeroStatPill(label: "保护率", value: "\(safeRate(records))%")
                HeroStatPill(label: "本月", value: "\(monthCount(records)) 次")
                HeroStatPill(label: "最近", value: latestShortDate(records))
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 18)
        .padding(.vertical, 22)
        .background(theme.gradient, in: RoundedRectangle(cornerRadius: 38))
        .shadow(color: theme.shadow, radius: 30, y: 18)
    }
}

private struct HeroStatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2.bold())
                .foregroundStyle(.white.opacity(0.52))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .multilineTextAlignment(.center)
        .padding(.vertical, 10)
        .padding(.horizontal, 6)
        .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct SafetyChecklistCard: View {
    let records: [IntimacyRecord]

    var body: some View {
        let highRisk = records.filter { $0.riskLevel == .high }.count
        let protected = records.filter { $0.protection != .none }.count
        let solo = records.contains { $0.type == .solo }
        Card(title: "今日安全流程") {
            ChecklistItem(done: safeRate(records) >= 70, title: "保护措施准备好", detail: "\(protected)/\(max(records.count, 1)) 条记录使用了保护或低风险方式。")
            ChecklistItem(done: highRisk == 0, title: "高风险记录归零", detail: highRisk == 0 ? "目前没有高风险记录，安全员先不骂人。" : "有 \(highRisk) 条高风险记录，别把侥幸当玄学。")
            ChecklistItem(done: solo, title: "单人排解也被允许", detail: solo ? "你已经记录过单人排解，身体管理很成年人。" : "无伴侣时可以选择安全、清洁、不过度的单人排解。")
        }
    }
}

private struct ChecklistItem: View {
    let done: Bool
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: done ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                .font(.headline)
                .foregroundStyle(done ? Color.green : Color.orange)
                .frame(width: 40, height: 40)
                .background((done ? Color.green : Color.orange).opacity(0.12), in: RoundedRectangle(cornerRadius: 16))
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline.bold())
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 22))
    }
}

private struct AddRecordView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State private var type: IntimacyType = .penetrative
    @State private var protection: ProtectionMethod = .condom

    var body: some View {
        NavigationStack {
            Form {
                Picker("亲密类型", selection: $type) {
                    ForEach(IntimacyType.allCases, id: \.self) { item in
                        Text(item.title).tag(item)
                    }
                }
                Picker("保护方式", selection: $protection) {
                    ForEach(ProtectionMethod.allCases, id: \.self) { item in
                        Text(item.title).tag(item)
                    }
                }
                Section("安全确认") {
                    Label("双方明确同意", systemImage: "checkmark.seal.fill")
                    Label("不舒服就停止", systemImage: "hand.raised.fill")
                }
            }
            .navigationTitle("记录这次亲密")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") {
                        Task {
                            await store.addRecord(type: type, protection: protection)
                            dismiss()
                        }
                    }
                }
            }
        }
    }
}

private struct CycleView: View {
    @EnvironmentObject private var store: AppStore
    @State private var periodStart = Self.defaultStart
    @State private var periodEnd = ""
    @State private var cycleLength = 28

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "法法日历", subtitle: "该记就记，该停就停。日历只负责诚实。")
                AdviceCard(advice: store.prediction)
                CycleForecastCard(prediction: store.prediction, records: store.records)
                Card(title: "本月火力图") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(minimum: 8), spacing: 4), count: 7), spacing: 4) {
                        ForEach(["日", "一", "二", "三", "四", "五", "六"], id: \.self) { item in
                            Text(item)
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundStyle(.secondary)
                                .frame(maxWidth: .infinity)
                                .multilineTextAlignment(.center)
                        }
                        ForEach(calendarDays(records: store.records)) { day in
                            if let number = day.day {
                                ZStack {
                                    Circle()
                                        .fill(day.hasRecord ? Color.rose : day.isToday ? Color.black : Color.grouped)
                                    Text("\(number)")
                                        .font(.system(size: 11, weight: .heavy))
                                        .foregroundStyle(day.hasRecord || day.isToday ? .white : .secondary)
                                        .minimumScaleFactor(0.5)
                                        .lineLimit(1)
                                }
                                .frame(maxWidth: .infinity)
                                .aspectRatio(1, contentMode: .fit)
                            } else {
                                Color.clear
                                    .frame(maxWidth: .infinity)
                                    .aspectRatio(1, contentMode: .fit)
                            }
                        }
                    }
                    Text("粉色代表有记录，黑色代表今天。记录多了不是 KPI，身体舒服才算赢。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Card(title: "温馨提示") {
                    Text("经期前后或易孕期附近，系统会更严厉一点。不是扫兴，是保护你和伴侣。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Card(title: "快速修正周期") {
                    TextField("最近经期开始，例如 2026-05-01", text: $periodStart)
                        .textInputAutocapitalization(.never)
                        .font(.subheadline.bold())
                        .padding()
                        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 18))
                    TextField("经期结束，可不填", text: $periodEnd)
                        .textInputAutocapitalization(.never)
                        .font(.subheadline.bold())
                        .padding()
                        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 18))
                    Stepper("平均周期 \(cycleLength) 天", value: $cycleLength, in: 20...45)
                        .font(.subheadline.bold())
                    Button("保存周期并刷新预测") {
                        Task {
                            await store.saveCycle(periodStart: periodStart, periodEnd: periodEnd.isEmpty ? nil : periodEnd, cycleLength: cycleLength)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                }
                Card(title: "日历回放") {
                    ForEach(store.records.prefix(4)) { record in
                        HStack(spacing: 12) {
                            Image(systemName: "flame.fill")
                                .foregroundStyle(Color.rose)
                                .frame(width: 42, height: 42)
                                .background(Color.rose.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
                            VStack(alignment: .leading, spacing: 4) {
                                Text(record.occurredAt)
                                    .font(.subheadline.bold())
                                Text("\(record.type.title) · \(record.riskLevel.rawValue)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("\(record.rating)/5")
                                .font(.caption.bold())
                                .foregroundStyle(Color.rose)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.rose.opacity(0.1), in: Capsule())
                        }
                        .padding(.vertical, 4)
                    }
                    if store.records.isEmpty {
                        Text("暂无记录。日历先空着，身体别空转。")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.grouped)
        .onAppear {
            if let cycle = store.cycles.first {
                periodStart = cycle.periodStart
                periodEnd = cycle.periodEnd ?? ""
                cycleLength = cycle.cycleLength
            }
        }
    }

    private static var defaultStart: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: Date())
    }
}

private struct CycleForecastCard: View {
    let prediction: HealthAdvice
    let records: [IntimacyRecord]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("cycle forecast")
                .font(.caption2.bold())
                .tracking(3)
                .foregroundStyle(.white.opacity(0.42))
            Text("身体天气预报")
                .font(.title2.bold())
                .foregroundStyle(.white)
            Text("预测只能提醒，不能替代身体感受。疼痛、异常出血或明显不适时，优先咨询医生。")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.68))
                .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 6) {
                DarkStatPill(label: "活跃天", value: "\(Set(records.map(\.occurredAt)).count) 天")
                DarkStatPill(label: "提醒", value: prediction.level == .high ? "严厉" : "温和")
                DarkStatPill(label: "记录", value: "\(records.count) 条")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.black, in: RoundedRectangle(cornerRadius: 32))
        .shadow(color: .black.opacity(0.12), radius: 24, y: 12)
    }
}

private struct DarkStatPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2.bold())
                .foregroundStyle(.white.opacity(0.42))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 8)
        .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct CalendarDay: Identifiable {
    let id: String
    let day: Int?
    let hasRecord: Bool
    let isToday: Bool
}

private func calendarDays(records: [IntimacyRecord]) -> [CalendarDay] {
    let calendar = Calendar.current
    let now = Date()
    let components = calendar.dateComponents([.year, .month], from: now)
    let start = calendar.date(from: components) ?? now
    let range = calendar.range(of: .day, in: .month, for: start) ?? 1..<31
    let firstWeekday = calendar.component(.weekday, from: start) - 1
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    let recorded = Set(records.map(\.occurredAt))
    var days: [CalendarDay] = (0..<firstWeekday).map { CalendarDay(id: "blank-\($0)", day: nil, hasRecord: false, isToday: false) }
    for day in range {
        let date = calendar.date(byAdding: .day, value: day - 1, to: start) ?? now
        let key = formatter.string(from: date)
        days.append(CalendarDay(id: key, day: day, hasRecord: recorded.contains(key), isToday: calendar.isDateInToday(date)))
    }
    return days
}

private struct PartnerView: View {
    @EnvironmentObject private var store: AppStore
    @State private var phrase = randomPhrase()
    @State private var inviteInput = ""

    var body: some View {
        let status = store.partnerLink?.status ?? "none"
        let isLinked = status == "linked"
        let inviteCode = store.partnerLink?.inviteCode ?? "FALV1"
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "伴侣绑定", subtitle: "两个人的事，权限也要两个人确认。")
                VStack(alignment: .leading, spacing: 18) {
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("partner link")
                                .font(.caption.bold())
                                .foregroundStyle(.white.opacity(0.45))
                            Text(isLinked ? "已绑定心动搭子" : "等待绑定搭子")
                                .font(.title2.bold())
                                .foregroundStyle(.white)
                                .fixedSize(horizontal: false, vertical: true)
                            Text(isLinked ? "共享不是偷看，所有记录都要逐项授权。" : "把邀请码交给对方，双方确认后再进入同步模式。")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.68))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        Image(systemName: "heart.fill")
                            .font(.title2)
                            .foregroundStyle(.pink.opacity(0.8))
                            .frame(width: 48, height: 48)
                            .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 18))
                    }
                    VStack(alignment: .leading, spacing: 8) {
                        Text("绑定邀请码")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                        HStack(alignment: .center, spacing: 8) {
                            Text(inviteCode)
                                .font(.system(size: 26, weight: .black, design: .monospaced))
                                .tracking(2)
                                .lineLimit(1)
                                .minimumScaleFactor(0.45)
                                .layoutPriority(1)
                            Text(isLinked ? "已确认" : "待确认")
                                .font(.caption.bold())
                                .foregroundStyle(Color.rose)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Color.rose.opacity(0.1), in: Capsule())
                                .fixedSize()
                        }
                    }
                    .padding()
                    .background(.white, in: RoundedRectangle(cornerRadius: 24))
                    HStack(spacing: 6) {
                        stepPill("生成邀请码")
                        stepPill("对方确认")
                        stepPill("逐项共享")
                    }
                    Button(isLinked ? "解除绑定" : "生成并复制邀请码") {
                        if !isLinked {
                            UIPasteboard.general.string = inviteCode
                        }
                        Task { await store.togglePartnerLink() }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.white)
                    .foregroundStyle(.black)
                }
                .padding()
                .background(.black, in: RoundedRectangle(cornerRadius: 32))
                .shadow(color: .black.opacity(0.12), radius: 24, y: 12)
                Card(title: "共享权限") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2), spacing: 10) {
                        PermissionTile(active: isLinked, title: "共享最近记录", detail: "只同步主动勾选的记录")
                        PermissionTile(active: false, title: "周期提醒", detail: "默认关闭，避免越界关心")
                        PermissionTile(active: isLinked, title: "留言箱", detail: "只允许预设短句")
                        PermissionTile(active: false, title: "位置通讯录", detail: "不采集，也不需要")
                    }
                }
                Card(title: "接受对方邀请") {
                    TextField("输入邀请码，例如 FALV1", text: $inviteInput)
                        .textInputAutocapitalization(.characters)
                        .font(.system(.headline, design: .monospaced))
                        .padding()
                        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 18))
                    Button("接受邀请并绑定") {
                        Task { await store.acceptPartnerInvite(inviteCode: inviteInput.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                    .disabled(inviteInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                Card(title: "给伴侣发一句") {
                    Text(phrase)
                        .font(.headline)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("随机换一句") {
                        phrase = randomPhrase()
                    }
                    .buttonStyle(.bordered)
                    Button("发送预设留言") {
                        Task { await store.sendPartnerMessage(phrase: phrase) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.rose)
                }
                Card(title: "伴侣留言箱") {
                    ForEach(store.partnerMessages) { message in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(message.createdAt)
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            Text(message.phrase)
                                .font(.subheadline.bold())
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.grouped)
    }

    private func stepPill(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(.white.opacity(0.82))
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .padding(.horizontal, 4)
            .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
    }
}

private struct PermissionTile: View {
    let active: Bool
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: active ? "checkmark.seal.fill" : "lock.fill")
                .foregroundStyle(active ? Color.rose : .secondary)
                .frame(width: 34, height: 34)
                .background(active ? Color.rose.opacity(0.12) : Color.grouped, in: RoundedRectangle(cornerRadius: 14))
            Text(title)
                .font(.caption.bold())
            Text(detail)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(4)
                .minimumScaleFactor(0.85)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(active ? Color.rose.opacity(0.08) : Color.grouped, in: RoundedRectangle(cornerRadius: 20))
    }
}

private struct ResonanceStrip: View {
    let count: Int

    var body: some View {
        let total = 120.0
        let value = min(Double(count), total)
        ProgressView(value: value, total: total)
            .tint(Color.rose)
            .scaleEffect(x: 1, y: 1.35, anchor: .center)
    }
}

private struct SquareView: View {
    @EnvironmentObject private var store: AppStore
    @State private var phrase = randomPhrase()

    var body: some View {
        let totalResonance = store.posts.reduce(0) { $0 + $1.resonanceCount }
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "预设广场", subtitle: "不开放自由聊天。成年人发言，也要带刹车。")
                VStack(alignment: .leading, spacing: 14) {
                    Text("safe square")
                        .font(.caption2.bold())
                        .tracking(3)
                        .foregroundStyle(.white.opacity(0.42))
                    Text("今日广场温度")
                        .font(.title2.bold())
                        .foregroundStyle(.white)
                    Text("只允许预设拼句、共鸣、举报和屏蔽。热闹可以，失控不行。")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.68))
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 6) {
                        DarkStatPill(label: "留言", value: "\(store.posts.count) 条")
                        DarkStatPill(label: "共鸣", value: "\(totalResonance)")
                        DarkStatPill(label: "自由聊", value: "0")
                    }
                }
                .padding()
                .background(.black, in: RoundedRectangle(cornerRadius: 32))
                .shadow(color: .black.opacity(0.12), radius: 24, y: 12)
                Card(title: "摇一摇轻匹配") {
                    if let match = store.match {
                        Text("匹配到：\(match.alias)")
                            .font(.caption.bold())
                            .foregroundStyle(.secondary)
                        Text(match.phrase)
                            .font(.headline)
                            .fixedSize(horizontal: false, vertical: true)
                    } else {
                        Text("暂时没有匹配。宇宙建议你先喝水。")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Button("摇一下，随机匹配预设句") {
                        Task { await store.shakeMatch() }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                }
                Card(title: "预设拼句") {
                    Text(phrase)
                        .font(.headline)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("固定模板和分类词库，不开放自由输入。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Button("随机重组一句") {
                        phrase = randomPhrase()
                    }
                    .buttonStyle(.bordered)
                    Button("发布到匿名广场") {
                        Task { await store.publish(phrase: phrase) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.rose)
                }
                Card(title: "匿名留言") {
                    ForEach(store.posts, id: \.id) { post in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(post.authorAlias)
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            Text(post.phrase)
                                .font(.subheadline.bold())
                                .fixedSize(horizontal: false, vertical: true)
                            ResonanceStrip(count: post.resonanceCount)
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 12) {
                                    Button("共鸣 \(post.resonanceCount)") {
                                        Task { await store.resonate(post: post) }
                                    }
                                    .font(.caption.bold())
                                    .foregroundStyle(Color.rose)
                                    Spacer(minLength: 0)
                                }
                                HStack(spacing: 12) {
                                    Button(post.reported == true ? "已举报" : "举报") {
                                        Task { await store.report(post: post) }
                                    }
                                    .font(.caption.bold())
                                    .foregroundStyle(.secondary)
                                    Button("屏蔽") {
                                        Task { await store.block(post: post) }
                                    }
                                    .font(.caption.bold())
                                    .foregroundStyle(.primary)
                                    Spacer(minLength: 0)
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.grouped)
    }
}

private struct ProfileView: View {
    @EnvironmentObject private var store: AppStore
    @AppStorage("faleme.offline.enabled") private var offlineMode = false

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "我的", subtitle: "成年人的体面，是知道什么时候该认真。")
                Card(title: "角色偏好") {
                    Text("这里决定首页大按钮显示“法了！”还是“被法了！”。想换身份，来设置里换，首页负责少想多记。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 8) {
                        Button("我是“法”的一方") {
                            store.setRole(.initiator)
                        }
                        .font(.caption.bold())
                        .foregroundStyle(store.role != .receiver ? .white : .secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(store.role != .receiver ? Color.rose : Color.grouped, in: RoundedRectangle(cornerRadius: 18))

                        Button("我是“被法”的一方") {
                            store.setRole(.receiver)
                        }
                        .font(.caption.bold())
                        .foregroundStyle(store.role == .receiver ? .white : .secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(store.role == .receiver ? Color.violet : Color.grouped, in: RoundedRectangle(cornerRadius: 18))
                    }
                }
                Card(title: "免登录设备身份") {
                    Text(DeviceIdentity.current)
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                    Text("iOS 不能读取真实 UDID，这里使用 identifierForVendor，取不到时用本地 UUID。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Card(title: "健康小抄") {
                    ForEach(store.knowledgeCards, id: \.id) { card in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(card.category)
                                .font(.caption.bold())
                                .foregroundStyle(Color.rose)
                            Text(card.title)
                                .font(.headline)
                            Text(card.body)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }
                }
                Card(title: "隐私与数据") {
                    Text(store.privacyMessage)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    VStack(spacing: 10) {
                        Button("导出数据") {
                            Task { await store.exportData() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.black)
                        .frame(maxWidth: .infinity)

                        Button("删除账号") {
                            Task { await store.deleteAccount() }
                        }
                        .buttonStyle(.bordered)
                        .tint(Color.rose)
                        .frame(maxWidth: .infinity)
                    }
                }
                Card(title: "完全离线模式") {
                    Text("只保留“法了！”和“被法了！”核心记录，不访问后端，不同步，不显示社交功能。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button("进入完全离线") {
                        offlineMode = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.grouped)
    }
}

private struct AdviceCard: View {
    let advice: HealthAdvice

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(advice.title)
                .font(.headline.bold())
            Text(advice.body)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            Text(advice.action)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(advice.level == .high ? Color.red.opacity(0.1) : Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 24))
    }
}

private struct Card<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.bold())
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.white, in: RoundedRectangle(cornerRadius: 28))
    }
}

private struct PageHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.largeTitle.bold())
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct RecordRow: View {
    let record: IntimacyRecord
    var onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(record.occurredAt)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Text("\(record.type.title) · \(record.protection.title)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .trailing, spacing: 8) {
                Text("\(record.rating)/5")
                    .font(.caption.bold())
                    .foregroundStyle(Color.rose)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.rose.opacity(0.1), in: Capsule())
                    .lineLimit(1)
                Button("删除", action: onDelete)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
            .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.vertical, 6)
    }
}

private struct MetricPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
            Text(value)
                .font(.headline.bold())
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 18))
    }
}

private func safeRate(_ records: [IntimacyRecord]) -> Int {
    guard !records.isEmpty else { return 0 }
    let safe = records.filter { $0.protection != .none && $0.riskLevel != .high }.count
    return Int((Double(safe) / Double(records.count) * 100).rounded())
}

private func monthCount(_ records: [IntimacyRecord]) -> Int {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM"
    let prefix = formatter.string(from: Date())
    return records.filter { $0.occurredAt.hasPrefix(prefix) }.count
}

private func latestShortDate(_ records: [IntimacyRecord]) -> String {
    guard let latest = records.first else { return "暂无" }
    return String(latest.occurredAt.dropFirst(5))
}

private extension Color {
    static let rose = Color(red: 244 / 255, green: 63 / 255, blue: 94 / 255)
    static let pink = Color(red: 236 / 255, green: 72 / 255, blue: 153 / 255)
    static let violet = Color(red: 139 / 255, green: 92 / 255, blue: 246 / 255)
    static let grouped = Color(red: 242 / 255, green: 242 / 255, blue: 247 / 255)
}
