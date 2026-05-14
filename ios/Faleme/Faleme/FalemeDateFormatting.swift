import Foundation

/// 东八区展示与「自然日」工具（与 Web / 服务端 Asia/Shanghai 对齐）
enum FalemeDateFormatting {
    static let shanghai = TimeZone(identifier: "Asia/Shanghai")!

    /// 当前东八区日历日 yyyy-MM-dd
    static func shanghaiCalendarToday(from date: Date = Date()) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = shanghai
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    /// 接口时间串 → 东八区 yyyy-MM-dd HH:mm:ss（24h）；已是纯 yyyy-MM-dd 则原样返回
    static func displayApiDateTime(_ raw: String) -> String {
        let t = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return raw }
        if t.range(of: #"^\d{4}-\d{2}-\d{2}$"#, options: .regularExpression) != nil { return t }

        let frac = ISO8601DateFormatter()
        frac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        frac.timeZone = TimeZone(secondsFromGMT: 0)

        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        plain.timeZone = TimeZone(secondsFromGMT: 0)

        let parsed = frac.date(from: t) ?? plain.date(from: t)
        guard let d = parsed else { return raw }

        let out = DateFormatter()
        out.locale = Locale(identifier: "en_US_POSIX")
        out.timeZone = shanghai
        out.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return out.string(from: d)
    }
}
