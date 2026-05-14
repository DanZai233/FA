const KEY = 'faleme.offlinePending.v1';

export type OfflinePending =
  | {kind: 'createRecord'; payload: Record<string, unknown>}
  | {kind: 'createPartnerShare'; payload: Record<string, unknown>};

export function setOfflinePending(p: OfflinePending | null) {
  if (!p) {
    localStorage.removeItem(KEY);
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function getOfflinePending(): OfflinePending | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as OfflinePending;
    if (v && (v.kind === 'createRecord' || v.kind === 'createPartnerShare') && v.payload && typeof v.payload === 'object') {
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}
