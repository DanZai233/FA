import {ShieldCheck, Siren} from 'lucide-react';
import type {HealthAdvice} from '../types/domain';

export function AdviceCard({advice, compact}: {advice: HealthAdvice; compact?: boolean}) {
  const border =
    advice.level === 'high'
      ? 'border-red-200 bg-red-50'
      : advice.level === 'medium'
        ? 'border-amber-200 bg-amber-50'
        : 'border-emerald-200 bg-emerald-50';
  return (
    <div className={`rounded-[1.75rem] border p-5 ${border}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 text-slate-900">{advice.level === 'high' ? <Siren size={22} aria-hidden /> : <ShieldCheck size={22} aria-hidden />}</div>
        <div>
          <p className="font-black text-slate-950">{advice.title}</p>
          <p className={`mt-1 text-sm leading-6 text-slate-800 ${compact ? 'line-clamp-2' : ''}`}>{advice.body}</p>
          {!compact && <p className="mt-2 text-xs font-black text-slate-600">{advice.action}</p>}
        </div>
      </div>
    </div>
  );
}
