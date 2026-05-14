import type {HealthAdvice} from '../types/domain';
import {normalizeRelationshipMode} from '../types/domain';
import type {PartnerHub} from '../types/domain';

/** 今日风险 / 伴侣 / 众乐乐 一条视觉主线 */
export function StatusRibbon({advice, partnerHub}: {advice: HealthAdvice; partnerHub: PartnerHub}) {
  const mode = normalizeRelationshipMode(partnerHub.relationshipMode);
  const linked = (partnerHub.partners ?? []).some((p) => p.status === 'linked' && p.partnerId);
  const riskHue =
    advice.level === 'high' ? 'from-rose-500 to-amber-500' : advice.level === 'medium' ? 'from-amber-400 to-amber-200' : 'from-emerald-500 to-teal-400';
  return (
    <div className="border-b border-white/40 bg-white/70 px-3 py-2 backdrop-blur-md">
      <div className={`mx-auto mb-1.5 h-1 max-w-[430px] rounded-full bg-gradient-to-r ${riskHue}`} aria-hidden />
      <div className="mx-auto flex max-w-[430px] items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
        <span className="min-w-0 truncate text-rose-600">风险 · {advice.level === 'high' ? '高' : advice.level === 'medium' ? '中' : '低'}</span>
        <span className={`min-w-0 truncate ${linked ? 'text-violet-600' : 'text-slate-400'}`}>伴侣 · {linked ? '已绑定' : '未绑定'}</span>
        <span className={`min-w-0 truncate ${mode === 'poly' ? 'text-amber-700' : 'text-slate-400'}`}>{mode === 'poly' ? '众乐乐' : '独乐乐'}</span>
      </div>
    </div>
  );
}
