/** 东八区（中国标准时间）展示与日历日工具 */

const SHANGHAI = 'Asia/Shanghai';

function partsMap(parts: Intl.DateTimeFormatPart[]) {
  const g = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return g;
}

/** 东八区日历日 yyyy-MM-dd（用于 occurredAt、周期等与「自然日」对齐的字段） */
export function shanghaiCalendarDay(date: Date): string {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const g = partsMap(f.formatToParts(date));
  return `${g('year')}-${g('month')}-${g('day')}`;
}

/**
 * 将接口返回的时间串展示为东八区 yyyy-MM-dd HH:mm:ss（24 小时制）。
 * 已是纯 yyyy-MM-dd 的日期串原样返回。
 */
export function formatWallClockShanghai(raw: string): string {
  const s = raw.trim();
  if (!s) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) return raw;
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const g = partsMap(f.formatToParts(new Date(ms)));
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}`;
}

/** 以 anchor 所在东八区日历日为终点，向前共 daySpan 个日历日（含当日） */
export function recentShanghaiCalendarDays(anchor: Date, daySpan: number): Set<string> {
  const set = new Set<string>();
  if (daySpan < 1) return set;
  const ymd = shanghaiCalendarDay(anchor);
  const base = Date.parse(`${ymd}T00:00:00+08:00`);
  if (Number.isNaN(base)) return set;
  for (let i = 0; i < daySpan; i++) {
    set.add(shanghaiCalendarDay(new Date(base - i * 86_400_000)));
  }
  return set;
}
