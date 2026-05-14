import {useId, useState} from 'react';
import {Info} from 'lucide-react';

/** 主标题一句 + 可展开的「为什么这样」 */
export function ExpandableHelp({summary, detail}: {summary: string; detail: string}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="mt-1">
      <p className="text-xs font-semibold leading-relaxed text-slate-500">{summary}</p>
      <button
        type="button"
        className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 hover:bg-slate-50"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Info size={14} className="text-rose-500" aria-hidden />
        {open ? '收起详情' : '详情 / 为什么这样'}
      </button>
      {open ? (
        <p id={panelId} className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500">
          {detail}
        </p>
      ) : null}
    </div>
  );
}
