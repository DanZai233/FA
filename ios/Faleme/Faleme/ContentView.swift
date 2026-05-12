import SwiftUI

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
                        .tabItem { Label("周期", systemImage: "calendar") }
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
    let occurredAt: String
    let timestamp: TimeInterval
}

private struct OfflineModeView: View {
    @AppStorage("faleme.offline.enabled") private var offlineMode = true
    @State private var records: [OfflineRecord] = Self.loadRecords()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                PageHeader(title: "完全离线", subtitle: "不联网、不同步、不社交。只记录今天是法了，还是被法了。")
                HStack(spacing: 14) {
                    offlineButton(title: "法了！", subtitle: "主动出发", icon: "flame.fill", filled: true)
                        .onTapGesture { save("法了！") }
                    offlineButton(title: "被法了！", subtitle: "被温柔照顾", icon: "heart.fill", filled: false)
                        .onTapGesture { save("被法了！") }
                }
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
                                .foregroundStyle(Color.rose)
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
            .padding()
        }
        .background(Color.grouped)
    }

    private var todayCount: Int {
        records.filter { $0.occurredAt == Self.todayString }.count
    }

    private func offlineButton(title: String, subtitle: String, icon: String, filled: Bool) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 42))
            Text(title)
                .font(.system(size: title.count > 3 ? 26 : 32, weight: .black))
            Text(subtitle)
                .font(.caption.bold())
        }
        .foregroundStyle(filled ? .white : Color.rose)
        .frame(maxWidth: .infinity)
        .frame(height: 190)
        .background(filled ? AnyShapeStyle(LinearGradient(colors: [Color.rose, Color.pink], startPoint: .topLeading, endPoint: .bottomTrailing)) : AnyShapeStyle(.white), in: RoundedRectangle(cornerRadius: 32))
    }

    private func save(_ label: String) {
        records.insert(OfflineRecord(id: UUID().uuidString, label: label, occurredAt: Self.todayString, timestamp: Date().timeIntervalSince1970), at: 0)
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

private struct HomeView: View {
    @EnvironmentObject private var store: AppStore
    @State private var isAdding = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Text("法了么")
                        .font(.largeTitle.bold())
                    Text("嘴上很荒唐，身体很诚实，安全要更诚实。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Text(store.isOfflineDemo ? "本地演示模式" : "后端已连接")
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(.white, in: Capsule())

                    Button {
                        isAdding = true
                    } label: {
                        VStack(spacing: 10) {
                            Image(systemName: "flame.fill")
                                .font(.system(size: 68))
                            Text("记一笔")
                                .font(.system(size: 38, weight: .black))
                            Text("别怕，数据只替你嘴硬")
                                .font(.subheadline.bold())
                        }
                        .foregroundStyle(.white)
                        .frame(width: 250, height: 250)
                        .background(LinearGradient(colors: [Color.rose, Color.pink], startPoint: .topLeading, endPoint: .bottomTrailing), in: Circle())
                    }

                    AdviceCard(advice: store.prediction)
                    Card(title: store.reminder.title) {
                        Text(store.reminder.body)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack {
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
                .padding()
            }
            .background(Color.grouped)
            .sheet(isPresented: $isAdding) {
                AddRecordView()
            }
        }
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

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "周期雷达", subtitle: "预测不是算命，身体信号优先。")
                AdviceCard(advice: store.prediction)
                Card(title: "温馨提示") {
                    Text("经期前后或易孕期附近，系统会更严厉一点。不是扫兴，是保护你和伴侣。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
        }
        .background(Color.grouped)
    }
}

private struct PartnerView: View {
    @EnvironmentObject private var store: AppStore
    @State private var phrase = "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感"

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "伴侣绑定", subtitle: "两个人的事，权限也要两个人确认。")
                Card(title: "共享记录需要逐项授权") {
                    Text("对方看不到你的全部历史，别让亲密关系变成后台审计。")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Button("生成邀请码 FALV1") {}
                        .buttonStyle(.borderedProminent)
                        .tint(.black)
                        .padding(.top, 8)
                }
                Card(title: "给伴侣发一句") {
                    Text(phrase)
                        .font(.headline)
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
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 6)
                    }
                }
            }
            .padding()
        }
        .background(Color.grouped)
    }
}

private struct SquareView: View {
    @EnvironmentObject private var store: AppStore
    @State private var phrase = "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感"

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                PageHeader(title: "预设广场", subtitle: "不开放自由聊天。成年人发言，也要带刹车。")
                Card(title: "预设拼句") {
                    Text(phrase)
                        .font(.headline)
                    Text("固定模板和分类词库，不开放自由输入。")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
                            HStack {
                                Button("共鸣 \(post.resonanceCount)") {
                                    Task { await store.resonate(post: post) }
                                }
                                .font(.caption.bold())
                                .foregroundStyle(Color.rose)

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
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }
                }
            }
            .padding()
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
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                    }
                }
                Card(title: "隐私与数据") {
                    Text(store.privacyMessage)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    HStack {
                        Button("导出数据") {
                            Task { await store.exportData() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.black)

                        Button("删除账号") {
                            Task { await store.deleteAccount() }
                        }
                        .buttonStyle(.bordered)
                        .tint(Color.rose)
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
            .padding()
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
        HStack {
            VStack(alignment: .leading) {
                Text(record.occurredAt)
                    .font(.subheadline.bold())
                Text("\(record.type.title) · \(record.protection.title)")
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
            Button("删除", action: onDelete)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 6)
    }
}

private struct MetricPill: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading) {
            Text(label)
                .font(.caption.bold())
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline.bold())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.grouped, in: RoundedRectangle(cornerRadius: 18))
    }
}

private extension Color {
    static let rose = Color(red: 244 / 255, green: 63 / 255, blue: 94 / 255)
    static let pink = Color(red: 236 / 255, green: 72 / 255, blue: 153 / 255)
    static let grouped = Color(red: 242 / 255, green: 242 / 255, blue: 247 / 255)
}
