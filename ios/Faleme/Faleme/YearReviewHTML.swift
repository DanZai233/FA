import Foundation

enum FalemeAPIHeaders {
    static let authTokenKey = "faleme.authToken"

    static func requestID() -> String {
        UUID().uuidString
    }
}

enum YearReviewHTML {
    static func build(from export: DataExport) -> String {
        let nick = export.user.nickname.trimmingCharacters(in: .whitespacesAndNewlines)
        let display = nick.isEmpty ? "你" : nick.htmlEscaped

        let latest = export.records.map(\.occurredAt).max() ?? ""

        var tagCounts: [String: Int] = [:]
        for r in export.records {
            for t in r.noteTags {
                tagCounts[t, default: 0] += 1
            }
        }
        let topTag = tagCounts.max(by: { $0.value < $1.value })?.key ?? "（暂无标签）"

        let accepted = (export.shareRequests ?? []).filter { $0.status == "accepted" }.count

        return """
        <!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
        <title>\(display) 的 法了么 年度回顾</title>
        <style>
          :root { --bg:#0f172a; --card:#1e293b; --txt:#e2e8f0; --muted:#94a3b8; }
          body{margin:0;background:var(--bg);color:var(--txt);font:16px/1.65 -apple-system,"PingFang SC",sans-serif;}
          .wrap{max-width:520px;margin:0 auto;padding:32px 20px 80px;}
          h1{font-size:1.75rem;margin:0 0 8px;}
          .sub{color:var(--muted);font-size:0.9rem;margin-bottom:32px;}
          .hero{height:120px;border-radius:20px;background:linear-gradient(120deg,#fb7185,#a78bfa);margin-bottom:28px;opacity:.95;}
          .block{background:var(--card);border-radius:20px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,.06);}
          .k{font-size:0.72rem;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);margin:0 0 6px;}
          .v{font-size:1.35rem;font-weight:800;margin:0;}
          .small{font-size:0.85rem;color:var(--muted);margin-top:10px;line-height:1.6;}
          footer{margin-top:40px;font-size:0.75rem;color:var(--muted);text-align:center;}
        </style></head><body><div class="wrap">
          <div class="hero" aria-hidden="true"></div>
          <h1>\(display)，这一年身体很诚实</h1>
          <p class="sub">由本机导出 JSON 即时生成 · 不上传服务器</p>
          <div class="block"><p class="k">最常出现的记录标签</p><p class="v">\(topTag.htmlEscaped)</p></div>
          <div class="block"><p class="k">最晚记录的一天</p><p class="v">\(latest.isEmpty ? "—" : latest.htmlEscaped)</p></div>
          <div class="block"><p class="k">法法同步完成次数</p><p class="v">\(accepted)</p><p class="small">统计来自导出里的 shareRequests（已接受）。</p></div>
          <div class="block"><p class="k">伴侣留言条数</p><p class="v">\(export.messages.count)</p><p class="small">私密记录总条数：\(export.records.count)</p></div>
          <footer>法了么 · 年度回顾单页</footer>
        </div></body></html>
        """
    }
}

private extension String {
    var htmlEscaped: String {
        self
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
