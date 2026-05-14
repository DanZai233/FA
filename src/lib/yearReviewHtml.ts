import type {DataExport} from '../types/domain';

/** 用导出 JSON 在客户端生成长页「年度回顾」HTML（零后端） */
export function buildYearReviewHtml(data: DataExport): string {
  const records = data.records ?? [];
  const messages = data.messages ?? [];
  const shares = data.shareRequests ?? [];
  const nick = data.user?.nickname?.trim() || '你';

  let latestNight = '';
  for (const r of records) {
    if (!latestNight || r.occurredAt > latestNight) latestNight = r.occurredAt;
  }

  const banterish = records
    .flatMap((r) => r.noteTags ?? [])
    .reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
  const topTag = Object.entries(banterish).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '（暂无标签）';

  const acceptedShares = shares.filter((s) => s.status === 'accepted').length;

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(nick)} 的 法了么 年度回顾</title>
<style>
  :root { --bg:#0f172a; --card:#1e293b; --txt:#e2e8f0; --muted:#94a3b8; --accent:#fb7185; }
  body{margin:0;background:var(--bg);color:var(--txt);font:16px/1.65 system-ui,-apple-system,"Noto Sans SC",sans-serif;}
  .wrap{max-width:520px;margin:0 auto;padding:32px 20px 80px;}
  h1{font-size:1.75rem;margin:0 0 8px;letter-spacing:-0.02em;}
  .sub{color:var(--muted);font-size:0.9rem;margin-bottom:32px;}
  .hero{height:120px;border-radius:20px;background:linear-gradient(120deg,#fb7185,#a78bfa);margin-bottom:28px;opacity:.95;}
  .block{background:var(--card);border-radius:20px;padding:20px 20px 18px;margin-bottom:16px;border:1px solid rgba(255,255,255,.06);}
  .k{font-size:0.72rem;text-transform:uppercase;letter-spacing:.18em;color:var(--muted);margin:0 0 6px;}
  .v{font-size:1.35rem;font-weight:800;margin:0;}
  .small{font-size:0.85rem;color:var(--muted);margin-top:10px;line-height:1.6;}
  footer{margin-top:40px;font-size:0.75rem;color:var(--muted);text-align:center;}
</style></head><body><div class="wrap">
  <div class="hero" aria-hidden="true"></div>
  <h1>${esc(nick)}，这一年身体很诚实</h1>
  <p class="sub">由本地导出 JSON 即时生成 · 不上传服务器</p>
  <div class="block"><p class="k">最常出现的记录标签</p><p class="v">${esc(topTag)}</p></div>
  <div class="block"><p class="k">最晚记录的一天（按 occurredAt）</p><p class="v">${esc(latestNight || '—')}</p></div>
  <div class="block"><p class="k">伴侣侧 · 法法同步完成次数</p><p class="v">${acceptedShares}</p><p class="small">统计来自导出里的 shareRequests（已接受）。</p></div>
  <div class="block"><p class="k">伴侣留言条数</p><p class="v">${messages.length}</p><p class="small">私密记录总条数：${records.length}</p></div>
  <footer>法了么 · 年度回顾单页</footer>
</div></body></html>`;
}
