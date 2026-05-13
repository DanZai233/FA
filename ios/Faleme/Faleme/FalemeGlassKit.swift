import SwiftUI
import UIKit

// MARK: - 外观模式（独立于系统时也尊重「减少动画」只做静态渐变）

enum FalemeAppearance: String, CaseIterable, Identifiable {
    case system
    case light
    case dark

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return "自动"
        case .light: return "白天"
        case .dark: return "黑夜"
        }
    }

    var subtitle: String {
        switch self {
        case .system: return "跟随 iOS「深色外观」开关与日夜切换。"
        case .light: return "始终以浅色通透界面呈现。"
        case .dark: return "夜间更柔和，适合关灯后短时间查看。"
        }
    }

    var preferredColorScheme: ColorScheme? {
        switch self {
        case .system: return nil
        case .light: return .light
        case .dark: return .dark
        }
    }
}

// MARK: - 全屏通透底（柔光晕染 + 语义渐变）

struct GlassRootBackground: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            baseGradient

            // 柔焦色块 — 减少动画时仍可保留静态通透感
            Circle()
                .fill(Color.rose.opacity(scheme == .dark ? 0.12 : 0.20))
                .frame(width: 320, height: 320)
                .blur(radius: reduceMotion ? 56 : 64)
                .offset(x: -90, y: -140)

            Circle()
                .fill(Color.violet.opacity(scheme == .dark ? 0.14 : 0.16))
                .frame(width: 300, height: 300)
                .blur(radius: reduceMotion ? 48 : 58)
                .offset(x: 110, y: 220)

            Circle()
                .fill(Color.pink.opacity(scheme == .dark ? 0.06 : 0.12))
                .frame(width: 220, height: 220)
                .blur(radius: 40)
                .offset(x: 40, y: -40)
        }
        .ignoresSafeArea()
    }

    private var baseGradient: some View {
        Group {
            if scheme == .dark {
                LinearGradient(
                    colors: [
                        Color(red: 0.05, green: 0.05, blue: 0.10),
                        Color(red: 0.10, green: 0.07, blue: 0.14),
                        Color(red: 0.07, green: 0.08, blue: 0.12),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                LinearGradient(
                    colors: [
                        Color(red: 0.99, green: 0.97, blue: 0.985),
                        Color(red: 0.95, green: 0.94, blue: 0.99),
                        Color(red: 0.985, green: 0.98, blue: 0.955),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            }
        }
    }
}

extension View {
    func falemeScreenChrome() -> some View {
        background(GlassRootBackground())
    }

    func falemeTabChrome() -> some View {
        toolbarBackground(.ultraThinMaterial, for: .tabBar)
    }
}

// MARK: - 触感（可关）

enum FalemeHaptics {
    @inline(__always)
    static func light() {
        guard UserDefaults.standard.object(forKey: "faleme.haptics.enabled") as? Bool ?? true else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    @inline(__always)
    static func success() {
        guard UserDefaults.standard.object(forKey: "faleme.haptics.enabled") as? Bool ?? true else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    @inline(__always)
    static func rigid() {
        guard UserDefaults.standard.object(forKey: "faleme.haptics.enabled") as? Bool ?? true else { return }
        UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
    }
}

// MARK: - 时段问候（轻量化心理关怀）

enum ComfortCopy {
    static func line(for date: Date = Date()) -> String {
        let hour = Calendar.current.component(.hour, from: date)
        switch hour {
        case 5..<9: return "早上好｜新的一天，给身体一点温柔预告。"
        case 9..<12: return "上午好｜忙里偷闲喝水，也是很重要的自律。"
        case 12..<14: return "午间｜慢一点，胃里和心里都别太赶。"
        case 14..<18: return "下午好｜情绪起伏很正常，记下来就很勇敢。"
        case 18..<22: return "傍晚｜今天能走到这里，已经很不错。"
        case 22..<24: return "夜深了｜若没有必要，给身体留一点关灯后的安静。"
        default: return "凌晨｜注意休息，别太为难自己。"
        }
    }

    static var enabled: Bool {
        UserDefaults.standard.object(forKey: "faleme.comfort.banner") as? Bool ?? true
    }
}

struct ComfortBanner: View {
    let text: String
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        HStack(alignment: .center, spacing: 10) {
            Image(systemName: "sparkles")
                .font(.body.weight(.semibold))
                .foregroundStyle(Color.rose)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: FalemeShape.cardMinor, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: FalemeShape.cardMinor, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [
                            Color.white.opacity(scheme == .dark ? 0.22 : 0.45),
                            Color.white.opacity(0.06),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1,
                )
        )
    }
}

enum FalemeShape {
    static let card: CGFloat = 28
    static let cardMinor: CGFloat = 22
}

// MARK: - 大块「景深」卡片（日历预测 / 伴侣 / 广场头图）

struct GlassHeroSurface<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @Environment(\.colorScheme) private var scheme

    private var heroRadius: CGFloat { FalemeShape.card + 6 }

    var body: some View {
        content()
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                ZStack {
                    RoundedRectangle(cornerRadius: heroRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    RoundedRectangle(cornerRadius: heroRadius, style: .continuous)
                        .fill(heroTint)
                        .blendMode(.overlay)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: heroRadius, style: .continuous)
                    .strokeBorder(heroStroke, lineWidth: 1)
            )
            .shadow(color: .black.opacity(scheme == .dark ? 0.40 : 0.07), radius: 26, y: 14)
    }

    private var heroTint: LinearGradient {
        if scheme == .dark {
            LinearGradient(
                colors: [
                    Color.black.opacity(0.52),
                    Color.rose.opacity(0.24),
                    Color.violet.opacity(0.18),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )
        } else {
            LinearGradient(
                colors: [
                    Color.rose.opacity(0.22),
                    Color.violet.opacity(0.14),
                    Color.white.opacity(0.55),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing,
            )
        }
    }

    private var heroStroke: LinearGradient {
        LinearGradient(
            colors: [
                Color.white.opacity(scheme == .dark ? 0.24 : 0.52),
                Color.white.opacity(0.06),
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing,
        )
    }
}

// MARK: - 品牌色（全应用共享）

extension Color {
    static let rose = Color(red: 244 / 255, green: 63 / 255, blue: 94 / 255)
    static let falemeMagenta = Color(red: 236 / 255, green: 72 / 255, blue: 153 / 255)
    static let violet = Color(red: 139 / 255, green: 92 / 255, blue: 246 / 255)

    /// 次级铺底（随系统深浅色）；界面主体仍优先使用 Material 毛玻璃。
    static let grouped = Color(
        uiColor: UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(red: 0.14, green: 0.13, blue: 0.17, alpha: 1)
                : UIColor(red: 0.945, green: 0.945, blue: 0.965, alpha: 1)
        },
    )
}
