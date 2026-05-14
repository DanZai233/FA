import type {IntimacyRecord} from '../types/domain';
import {shanghaiCalendarDay} from '../datetime';

const SHOWN_KEY = 'faleme.achievementsShown.v1';
const SERIOUS_KEY = 'faleme.seriousMode';

export function isSeriousMode(): boolean {
  return localStorage.getItem(SERIOUS_KEY) === '1';
}

export function setSeriousMode(on: boolean) {
  if (on) localStorage.setItem(SERIOUS_KEY, '1');
  else localStorage.removeItem(SERIOUS_KEY);
}

export type AchievementId = 'streak7' | 'safe2w80' | 'firstPartnerShare';

const LINES: Record<AchievementId, string> = {
  streak7: '连续 7 天有记录：你不是在打卡，是在认真听身体说话。',
  safe2w80: '连续两周保护率 >80%：成年人最性感的自律，是别拿侥幸当玄学。',
  firstPartnerShare: '第一次完成法法同步：两个人的记录对齐了，边界也对齐了。',
};

function readShown(): Set<AchievementId> {
  try {
    const raw = localStorage.getItem(SHOWN_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set((arr ?? []).filter((x): x is AchievementId => x === 'streak7' || x === 'safe2w80' || x === 'firstPartnerShare'));
  } catch {
    return new Set();
  }
}

function writeShown(s: Set<AchievementId>) {
  localStorage.setItem(SHOWN_KEY, JSON.stringify([...s]));
}

function consecutiveRecordStreakDays(records: IntimacyRecord[]): number {
  if (records.length === 0) return 0;
  const days = new Set(records.map((r) => r.occurredAt));
  const anchor = shanghaiCalendarDay(new Date());
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const d = new Date(`${anchor}T12:00:00+08:00`);
    d.setDate(d.getDate() - i);
    const ymd = shanghaiCalendarDay(d);
    if (days.has(ymd)) streak++;
    else break;
  }
  return streak;
}

function safeRateLast14Days(records: IntimacyRecord[]): number | null {
  const anchor = new Date();
  const list: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    list.push(shanghaiCalendarDay(d));
  }
  const subset = records.filter((r) => list.includes(r.occurredAt));
  if (subset.length < 4) return null;
  const safe = subset.filter((r) => r.protection !== 'none').length;
  return Math.round((safe / subset.length) * 100);
}

/** 根据当前记录计算新解锁成就（不含严肃模式过滤） */
export function detectNewAchievements(records: IntimacyRecord[]): AchievementId[] {
  const shown = readShown();
  const out: AchievementId[] = [];

  if (!shown.has('streak7') && consecutiveRecordStreakDays(records) >= 7) {
    out.push('streak7');
  }

  const sr = safeRateLast14Days(records);
  if (!shown.has('safe2w80') && sr !== null && sr > 80) {
    out.push('safe2w80');
  }

  if (!shown.has('firstPartnerShare') && records.some((r) => r.sharedWithPartner)) {
    out.push('firstPartnerShare');
  }

  return out;
}

export function markAchievementsShown(ids: AchievementId[]) {
  const s = readShown();
  for (const id of ids) s.add(id);
  writeShown(s);
}

export function achievementLine(id: AchievementId): string {
  return LINES[id];
}
