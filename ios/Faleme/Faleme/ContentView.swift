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
                .falemeTabChrome()
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
        .falemeScreenChrome()
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
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(0.45), Color.white.opacity(0.08)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
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
        FalemeHaptics.rigid()
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
            colors: isReceiver ? [Color.violet, Color.falemeMagenta] : [Color.rose, Color.falemeMagenta],
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
                VStack(spacing: 16) {
                    if ComfortCopy.enabled {
                        ComfortBanner(text: ComfortCopy.line())
                    }
                    HomeHeroView(theme: theme, records: store.records) {
                        isAdding = true
                    }

                    SafetyChecklistCard(records: store.records)
                    HomeAdviceReminderCard(prediction: store.prediction, reminder: store.reminder)

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
            .refreshable {
                await store.load()
            }
            .falemeScreenChrome()
            .toolbarBackground(.ultraThinMaterial, for: .navigationBar)
            .sheet(isPresented: $isAdding) {
                AddRecordView()
                    .presentationDragIndicator(.visible)
                    .presentationCornerRadius(34)
            }
        }
    }
}

private struct HomeHeroView: View {
    let theme: RoleTheme
    let records: [IntimacyRecord]
    var onTap: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            VStack(spacing: 6) {
                Text("adult wellness")
                    .font(.caption2.bold())
                    .tracking(3)
                    .foregroundStyle(.white.opacity(0.52))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Text("法了么")
                    .font(.system(size: 40, weight: .black))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.85)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                Text("身体诚实，安全更要诚实。")
                    .font(.caption.bold())
                    .foregroundStyle(.white.opacity(0.74))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)

            Button(action: {
                FalemeHaptics.light()
                onTap()
            }) {
                VStack(spacing: 8) {
                    Image(systemName: theme.icon)
                        .font(.system(size: 48))
                        .symbolRenderingMode(.hierarchical)
                    Text(theme.buttonTitle)
                        .font(.system(size: 30, weight: .black))
                    Text(theme.subtitle)
                        .font(.caption2.bold())
                        .foregroundStyle(.white.opacity(0.72))
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.88)
                }
                .foregroundStyle(.white)
                .frame(width: 184, height: 184)
                .background(.white.opacity(0.17), in: Circle())
                .overlay(Circle().stroke(.white.opacity(0.26), lineWidth: 1))
                .shadow(color: .black.opacity(0.16), radius: 20, y: 14)
            }
            .buttonStyle(.plain)
            .frame(maxWidth: .infinity)

            HStack(spacing: 6) {
                HeroStatPill(label: "保护率", value: "\(safeRate(records))%")
                HeroStatPill(label: "本月", value: "\(monthCount(records)) 次")
                HeroStatPill(label: "最近", value: latestShortDate(records))
            }
            .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 16)
        .padding(.vertical, 18)
        .background(theme.gradient, in: RoundedRectangle(cornerRadius: 34, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [.white.opacity(0.36), .white.opacity(0.10)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
        .shadow(color: theme.shadow, radius: 26, y: 16)
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
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(Color.white.opacity(0.26), lineWidth: 1)
        )
    }
}

private struct SafetyChecklistCard: View {
    let records: [IntimacyRecord]

    var body: some View {
        let highRisk = records.filter { $0.riskLevel == .high }.count
        let protected = records.filter { $0.protection != .none }.count
        let solo = records.contains { $0.type == .solo }
        Card(title: "安全三件事") {
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
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: done ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(done ? Color.green : Color.orange)
                .frame(width: 34, height: 34)
                .background((done ? Color.green : Color.orange).opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.caption.bold())
                Text(detail)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 9)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(
                    Color.white.opacity(scheme == .dark ? 0.14 : 0.42),
                    lineWidth: 1,
                )
        )
    }
}

private struct HomeAdviceReminderCard: View {
    let prediction: HealthAdvice
    let reminder: ReminderSummary
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("今日提示")
                .font(.headline.bold())
            VStack(alignment: .leading, spacing: 6) {
                Text(prediction.title)
                    .font(.subheadline.bold())
                Text(prediction.body)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                Text(prediction.action)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                ZStack {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(.thinMaterial)
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill((prediction.level == .high ? Color.red : Color.orange).opacity(scheme == .dark ? 0.12 : 0.10))
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(scheme == .dark ? 0.18 : 0.45),
                                Color.white.opacity(0.05),
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1,
                    )
            )

            VStack(alignment: .leading, spacing: 6) {
                Text(reminder.title)
                    .font(.caption.bold())
                    .foregroundStyle(.secondary)
                Text(reminder.body)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 8) {
                    MetricPill(label: "总记录", value: "\(reminder.recordCount) 条")
                    MetricPill(label: "安全率", value: "\(reminder.safeRate)%")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(scheme == .dark ? 0.20 : 0.48),
                            Color.white.opacity(0.05),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
        .shadow(color: .black.opacity(scheme == .dark ? 0.32 : 0.06), radius: 22, y: 10)
    }
}

private struct AddRecordView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var scheme
    @State private var type: IntimacyType = .penetrative
    @State private var protection: ProtectionMethod = .condom
    @State private var rating = 4
    @State private var consentChecked = true
    @State private var sharedWithPartner = false

    private let choiceColumns = [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("快速记下这一笔")
                            .font(.title3.bold())
                        Text("选对类型与保护方式，火苗评分点一点就好。")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    recordFieldCard(title: "亲密类型") {
                        LazyVGrid(columns: choiceColumns, spacing: 10) {
                            ForEach(IntimacyType.allCases, id: \.self) { item in
                                RecordChoiceChip(title: item.title, selected: type == item) {
                                    if type != item {
                                        FalemeHaptics.light()
                                        type = item
                                    }
                                }
                            }
                        }
                    }

                    recordFieldCard(title: "保护方式") {
                        LazyVGrid(columns: choiceColumns, spacing: 10) {
                            ForEach(ProtectionMethod.allCases, id: \.self) { item in
                                RecordChoiceChip(title: item.title, selected: protection == item) {
                                    if protection != item {
                                        FalemeHaptics.light()
                                        protection = item
                                    }
                                }
                            }
                        }
                    }

                    recordFieldCard(title: "主观体感") {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(flameCaption)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            FlameRatingRow(rating: $rating)
                        }
                    }

                    recordFieldCard(title: "体验与安全") {
                        VStack(alignment: .leading, spacing: 14) {
                            Toggle(isOn: $consentChecked) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("双方明确同意")
                                        .font(.subheadline.bold())
                                    Text("清醒、自愿、可随时撤回")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .tint(Color.rose)

                            Toggle(isOn: $sharedWithPartner) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("共享给已绑定伴侣")
                                        .font(.subheadline.bold())
                                    Text("仅在账户已绑定时同步对方可见摘要")
                                        .font(.caption2)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .tint(Color.rose)

                            Text("不舒服随时停止；不同意或未清醒时不要记录为已同意。")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
            .scrollIndicators(.hidden)
            .navigationTitle("记录这次亲密")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        dismiss()
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                VStack(spacing: 0) {
                    Divider().opacity(0.35)
                    Button {
                        Task {
                            await store.addRecord(
                                type: type,
                                protection: protection,
                                rating: rating,
                                consentChecked: consentChecked,
                                sharedWithPartner: sharedWithPartner
                            )
                            FalemeHaptics.success()
                            dismiss()
                        }
                    } label: {
                        Text("保存记录")
                            .font(.headline.bold())
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color.rose)
                    .disabled(!consentChecked)
                    .opacity(consentChecked ? 1 : 0.45)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(.ultraThinMaterial)
                }
            }
        }
        .background(GlassRootBackground())
    }

    private var flameCaption: String {
        switch rating {
        case 1: return "今天有点勉强 · \(rating) / 5"
        case 2: return "还行但差点意思 · \(rating) / 5"
        case 3: return "平稳发挥 · \(rating) / 5"
        case 4: return "挺到位 · \(rating) / 5"
        default: return "火力全开 · \(rating) / 5"
        }
    }

    private func recordFieldCard(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(0.6)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(scheme == .dark ? 0.22 : 0.42),
                            Color.white.opacity(0.06),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
        .shadow(color: .black.opacity(scheme == .dark ? 0.28 : 0.05), radius: 16, y: 8)
    }
}

private struct RecordChoiceChip: View {
    let title: String
    let selected: Bool
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption.bold())
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.82)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .padding(.horizontal, 8)
                .foregroundStyle(selected ? Color.rose : .primary)
                .background {
                    ZStack {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.thinMaterial)
                        if selected {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.rose.opacity(scheme == .dark ? 0.22 : 0.14))
                        }
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(
                            selected ? Color.rose.opacity(0.55) : Color.white.opacity(scheme == .dark ? 0.14 : 0.32),
                            lineWidth: selected ? 1.5 : 1
                        )
                )
        }
        .buttonStyle(.plain)
    }
}

private struct FlameRatingRow: View {
    @Binding var rating: Int

    var body: some View {
        HStack(spacing: 0) {
            ForEach(1 ... 5, id: \.self) { index in
                Button {
                    let next = index
                    if rating != next {
                        FalemeHaptics.light()
                        rating = next
                    }
                } label: {
                    Image(systemName: index <= rating ? "flame.fill" : "flame")
                        .font(.system(size: 30))
                        .foregroundStyle(index <= rating ? Color.rose : Color.secondary.opacity(0.38))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 4)
        .background(Color.rose.opacity(0.06), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(Color.rose.opacity(0.18), lineWidth: 1)
        )
        .animation(.spring(response: 0.32, dampingFraction: 0.72), value: rating)
    }
}

private struct CycleView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.colorScheme) private var scheme
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
                                        .fill(calendarCellFill(day))
                                    if day.isToday, !day.hasRecord {
                                        Circle()
                                            .strokeBorder(Color.rose.opacity(0.68), lineWidth: 2)
                                    }
                                    Text("\(number)")
                                        .font(.system(size: 11, weight: .heavy))
                                        .foregroundStyle(calendarCellForeground(day))
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
                    Text("玫瑰色为有记录之日；今天在浅色下以柔边圈出，深色下为高亮底色。")
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
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.12 : 0.35), lineWidth: 1)
                        )
                    TextField("经期结束，可不填", text: $periodEnd)
                        .textInputAutocapitalization(.never)
                        .font(.subheadline.bold())
                        .padding()
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.12 : 0.35), lineWidth: 1)
                        )
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
        .refreshable {
            await store.load()
        }
        .falemeScreenChrome()
        .onAppear {
            if let cycle = store.cycles.first {
                periodStart = cycle.periodStart
                periodEnd = cycle.periodEnd ?? ""
                cycleLength = cycle.cycleLength
            }
        }
    }

    private func calendarCellFill(_ day: CalendarDay) -> Color {
        if day.hasRecord {
            Color.rose.opacity(0.9)
        } else if day.isToday {
            scheme == .dark ? Color.white.opacity(0.18) : Color.primary.opacity(0.12)
        } else {
            scheme == .dark ? Color.white.opacity(0.07) : Color.primary.opacity(0.06)
        }
    }

    private func calendarCellForeground(_ day: CalendarDay) -> Color {
        if day.hasRecord { return .white }
        if day.isToday { return .primary }
        return Color.secondary.opacity(0.95)
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
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        GlassHeroSurface {
            VStack(alignment: .leading, spacing: 14) {
                Text("cycle forecast")
                    .font(.caption2.bold())
                    .tracking(3)
                    .foregroundStyle(scheme == .dark ? .white.opacity(0.42) : .secondary)
                Text("身体天气预报")
                    .font(.title2.bold())
                    .foregroundStyle(scheme == .dark ? .white : .primary)
                Text("预测只能提醒，不能替代身体感受。疼痛、异常出血或明显不适时，优先咨询医生。")
                    .font(.subheadline)
                    .foregroundStyle(scheme == .dark ? .white.opacity(0.68) : .secondary)
                    .fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 6) {
                    GlassHeroStatPill(label: "活跃天", value: "\(Set(records.map(\.occurredAt)).count) 天")
                    GlassHeroStatPill(label: "提醒", value: prediction.level == .high ? "严厉" : "温和")
                    GlassHeroStatPill(label: "记录", value: "\(records.count) 条")
                }
            }
        }
    }
}

private struct GlassHeroStatPill: View {
    let label: String
    let value: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.caption2.bold())
                .foregroundStyle(scheme == .dark ? .white.opacity(0.42) : .secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(value)
                .font(.caption.bold())
                .foregroundStyle(scheme == .dark ? .white : .primary)
                .lineLimit(1)
                .minimumScaleFactor(0.65)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
        .padding(.horizontal, 8)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.14 : 0.28), lineWidth: 1)
        )
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
    @Environment(\.colorScheme) private var scheme
    @State private var phrase = randomPhrase()
    @State private var inviteInput = ""

    var body: some View {
        let status = store.partnerLink?.status ?? "none"
        let isLinked = status == "linked"
        let inviteCode = store.partnerLink?.inviteCode ?? "FALV1"
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "伴侣绑定", subtitle: "两个人的事，权限也要两个人确认。")
                GlassHeroSurface {
                    VStack(alignment: .leading, spacing: 18) {
                        HStack(alignment: .top, spacing: 12) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("partner link")
                                    .font(.caption.bold())
                                    .foregroundStyle(scheme == .dark ? .white.opacity(0.45) : .secondary)
                                Text(isLinked ? "已绑定心动搭子" : "等待绑定搭子")
                                    .font(.title2.bold())
                                    .foregroundStyle(scheme == .dark ? .white : .primary)
                                    .fixedSize(horizontal: false, vertical: true)
                                Text(isLinked ? "共享不是偷看，所有记录都要逐项授权。" : "把邀请码交给对方，双方确认后再进入同步模式。")
                                    .font(.subheadline)
                                    .foregroundStyle(scheme == .dark ? .white.opacity(0.68) : .secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            Image(systemName: "heart.fill")
                                .font(.title2)
                                .foregroundStyle(Color.rose.opacity(0.9))
                                .frame(width: 48, height: 48)
                                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                                        .strokeBorder(Color.white.opacity(scheme == .dark ? 0.14 : 0.32), lineWidth: 1)
                                )
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            Text("绑定邀请码")
                                .font(.caption.bold())
                                .foregroundStyle(.secondary)
                            HStack(alignment: .center, spacing: 8) {
                                Text(inviteCode)
                                    .font(.system(size: 26, weight: .black, design: .monospaced))
                                    .foregroundStyle(.primary)
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
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 24, style: .continuous)
                                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.14 : 0.38), lineWidth: 1)
                        )
                        HStack(spacing: 6) {
                            stepPill("生成邀请码")
                            stepPill("对方确认")
                            stepPill("逐项共享")
                        }
                        Button(isLinked ? "解除绑定" : "生成并复制邀请码") {
                            FalemeHaptics.light()
                            if !isLinked {
                                UIPasteboard.general.string = inviteCode
                            }
                            Task { await store.togglePartnerLink() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.white)
                        .foregroundStyle(.black)
                    }
                }
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
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.12 : 0.35), lineWidth: 1)
                        )
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
                        FalemeHaptics.light()
                        phrase = randomPhrase()
                    }
                    .buttonStyle(.bordered)
                    Button("发送预设留言") {
                        FalemeHaptics.light()
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
        .refreshable {
            await store.load()
        }
        .falemeScreenChrome()
    }

    private func stepPill(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 10, weight: .heavy))
            .foregroundStyle(scheme == .dark ? Color.white.opacity(0.86) : Color.primary.opacity(0.76))
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .minimumScaleFactor(0.75)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .padding(.horizontal, 4)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Color.white.opacity(scheme == .dark ? 0.14 : 0.32), lineWidth: 1)
            )
    }
}

private struct PermissionTile: View {
    let active: Bool
    let title: String
    let detail: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: active ? "checkmark.seal.fill" : "lock.fill")
                .foregroundStyle(active ? Color.rose : .secondary)
                .frame(width: 34, height: 34)
                .background(active ? Color.rose.opacity(0.12) : Color.clear, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
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
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(.thinMaterial)
                if active {
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.rose.opacity(0.08))
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .strokeBorder(
                    active ? Color.rose.opacity(0.35) : Color.primary.opacity(scheme == .dark ? 0.14 : 0.10),
                    lineWidth: active ? 1.5 : 1
                )
        )
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
    @Environment(\.colorScheme) private var scheme
    @State private var phrase = randomPhrase()

    var body: some View {
        let totalResonance = store.posts.reduce(0) { $0 + $1.resonanceCount }
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "预设广场", subtitle: "不开放自由聊天。成年人发言，也要带刹车。")
                GlassHeroSurface {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("safe square")
                            .font(.caption2.bold())
                            .tracking(3)
                            .foregroundStyle(scheme == .dark ? .white.opacity(0.42) : .secondary)
                        Text("今日广场温度")
                            .font(.title2.bold())
                            .foregroundStyle(scheme == .dark ? .white : .primary)
                        Text("只允许预设拼句、共鸣、举报和屏蔽。热闹可以，失控不行。")
                            .font(.subheadline)
                            .foregroundStyle(scheme == .dark ? .white.opacity(0.68) : .secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: 6) {
                            GlassHeroStatPill(label: "留言", value: "\(store.posts.count) 条")
                            GlassHeroStatPill(label: "共鸣", value: "\(totalResonance)")
                            GlassHeroStatPill(label: "自由聊", value: "0")
                        }
                    }
                }
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
                        FalemeHaptics.light()
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
                        FalemeHaptics.light()
                        phrase = randomPhrase()
                    }
                    .buttonStyle(.bordered)
                    Button("发布到匿名广场") {
                        FalemeHaptics.light()
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
        .refreshable {
            await store.load()
        }
        .falemeScreenChrome()
    }
}

private struct ProfileView: View {
    @EnvironmentObject private var store: AppStore
    @AppStorage("faleme.offline.enabled") private var offlineMode = false
    @AppStorage("faleme.appearance") private var appearanceRaw = FalemeAppearance.system.rawValue
    @AppStorage("faleme.haptics.enabled") private var hapticsEnabled = true
    @AppStorage("faleme.comfort.banner") private var comfortBannerEnabled = true
    @State private var nicknameDraft = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "我的", subtitle: "成年人的体面，是知道什么时候该认真。")
                if store.isOfflineDemo {
                    Text("当前与云端未同步，正在使用本机或演示数据。下拉页面可刷新。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: FalemeShape.cardMinor, style: .continuous))
                }
                Card(title: "外观") {
                    Picker("界面模式", selection: $appearanceRaw) {
                        ForEach(FalemeAppearance.allCases) { mode in
                            Text(mode.displayName).tag(mode.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                    Text(FalemeAppearance(rawValue: appearanceRaw)?.subtitle ?? "")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Card(title: "体验与关怀") {
                    Toggle("操作成功时轻触感", isOn: $hapticsEnabled)
                    Toggle("首页显示时段问候", isOn: $comfortBannerEnabled)
                    Text("问候语只本地展示；触感走系统触感引擎，不上传。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Card(title: "昵称") {
                    TextField("怎么称呼你", text: $nicknameDraft)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.words)
                    Button("保存昵称") {
                        Task {
                            await store.saveNickname(nicknameDraft)
                            FalemeHaptics.success()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.black)
                    Text("与后端账号同步；离线演示模式下也会尽量记在本地文案里。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Card(title: "角色偏好") {
                    Text("这里决定首页大按钮显示“法了！”还是“被法了！”。想换身份，来设置里换，首页负责少想多记。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 8) {
                        Button("我是“法”的一方") {
                            store.setRole(.initiator)
                        }
                        .font(.caption.bold())
                        .foregroundStyle(store.role == .initiator ? .white : .primary)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background {
                            ZStack {
                                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(.thinMaterial)
                                if store.role == .initiator {
                                    RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.rose)
                                }
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white.opacity(store.role == .initiator ? 0.35 : 0.2), lineWidth: 1)
                        )

                        Button("我是“被法”的一方") {
                            store.setRole(.receiver)
                        }
                        .font(.caption.bold())
                        .foregroundStyle(store.role == .receiver ? .white : .primary)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                        .minimumScaleFactor(0.82)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background {
                            ZStack {
                                RoundedRectangle(cornerRadius: 18, style: .continuous).fill(.thinMaterial)
                                if store.role == .receiver {
                                    RoundedRectangle(cornerRadius: 18, style: .continuous).fill(Color.violet)
                                }
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .strokeBorder(Color.white.opacity(store.role == .receiver ? 0.35 : 0.2), lineWidth: 1)
                        )
                    }
                    Button("看气氛发挥（双向）") {
                        store.setRole(.switch)
                    }
                    .font(.caption.bold())
                    .foregroundStyle(store.role == .switch ? .white : .primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background {
                        ZStack {
                            RoundedRectangle(cornerRadius: 18, style: .continuous).fill(.thinMaterial)
                            if store.role == .switch {
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.black.opacity(0.92), Color(red: 0.22, green: 0.12, blue: 0.2)],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            }
                        }
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .strokeBorder(Color.white.opacity(store.role == .switch ? 0.3 : 0.2), lineWidth: 1)
                    )
                }
                Card(title: "隐私锁") {
                    Toggle(isOn: Binding(
                        get: { store.privacyLockEnabled },
                        set: { store.updatePrivacyLock($0) }
                    )) {
                        Text("打开隐私锁提示")
                    }
                    Text("不影响记录功能，只在产品与心理上多一层「认真模式」提示。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                    Text("导出将弹出系统分享面板，可保存到「文件」App 或通过 AirDrop 发送。")
                        .font(.caption)
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
        .refreshable {
            await store.load()
        }
        .falemeScreenChrome()
        .onAppear {
            nicknameDraft = store.profileNickname
        }
        .onChange(of: store.profileNickname) { _, val in
            nicknameDraft = val
        }
        .sheet(item: $store.shareExportItem, onDismiss: {
            store.clearShareExport()
        }) { item in
            ActivityView(activityItems: [item.url])
        }
    }
}

private struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

private struct AdviceCard: View {
    let advice: HealthAdvice
    @Environment(\.colorScheme) private var scheme

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
        .background {
            ZStack {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(.thinMaterial)
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill((advice.level == .high ? Color.red : Color.orange).opacity(scheme == .dark ? 0.12 : 0.10))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(scheme == .dark ? 0.18 : 0.45),
                            Color.white.opacity(0.05),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
    }
}

private struct Card<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline.bold())
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: FalemeShape.card, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(scheme == .dark ? 0.20 : 0.48),
                            Color.white.opacity(0.05),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
        .shadow(color: .black.opacity(scheme == .dark ? 0.32 : 0.06), radius: 22, y: 10)
    }
}

private struct PageHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.largeTitle.bold())
                .foregroundStyle(.primary)
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 4)
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
    @Environment(\.colorScheme) private var scheme

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
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(Color.white.opacity(scheme == .dark ? 0.12 : 0.35), lineWidth: 1)
        )
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

