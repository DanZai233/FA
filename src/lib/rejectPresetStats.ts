const KEY = 'faleme.rejectPresetCounts.v1';

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, number>;
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
}

function write(m: Record<string, number>) {
  localStorage.setItem(KEY, JSON.stringify(m));
}

/** 记录收件箱婉拒时选择的预设 id（仅本机统计） */
export function bumpRejectPresetStat(presetId: string) {
  const id = presetId.trim();
  if (!id) return;
  const m = read();
  m[id] = (m[id] ?? 0) + 1;
  write(m);
}

/** 返回本机最常用的婉拒预设 id（次数最高） */
export function topRejectPresetId(): {id: string; count: number} | null {
  const m = read();
  let best: {id: string; count: number} | null = null;
  for (const [id, c] of Object.entries(m)) {
    if (c > 0 && (!best || c > best.count)) {
      best = {id, count: c};
    }
  }
  return best;
}
