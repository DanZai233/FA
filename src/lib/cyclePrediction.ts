import {defaultAdvice, intimacyTypeLabels, protectionLabels, riskTone} from '../design/copy';
import type {
  CyclePrediction,
  CycleRecord,
  HealthAdvice,
  IntimacyRecord,
  IntimacyType,
  ProtectionMethod,
  RecordDraft,
  RiskLevel,
} from '../types/domain';
import {recentShanghaiCalendarDays, shanghaiCalendarDay as isoDate} from '../datetime';

/** 统计 occurredAt（yyyy-MM-dd）落在 anchor 起向前共 daySpan 个东八区自然日（含当日）内的记录条数 */
export function recordCountOnRecentUtcDays(
  records: IntimacyRecord[],
  anchor: Date,
  daySpan: number,
): number {
  const days = recentShanghaiCalendarDays(anchor, daySpan);
  return records.filter((r) => days.has(r.occurredAt.trim().slice(0, 10))).length;
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** 当前东八区日历日是否落在预测易孕窗内 */
export function isInFertileWindow(prediction: CyclePrediction, anchor: Date = new Date()): boolean {
  const ymd = isoDate(anchor);
  return ymd >= prediction.fertileStart && ymd <= prediction.fertileEnd;
}

export function predictCycle(cycle: CycleRecord, records: IntimacyRecord[]): CyclePrediction {
  const start = new Date(cycle.periodStart);
  const nextStart = addDays(start, cycle.cycleLength);
  const nextEnd = addDays(nextStart, 5);
  const fertileStart = addDays(nextStart, -15);
  const fertileEnd = addDays(nextStart, -10);
  const now = new Date();
  const inPeriod = now >= nextStart && now <= nextEnd;
  const inFertile = now >= fertileStart && now <= fertileEnd;
  const tooFrequent = recordCountOnRecentUtcDays(records, new Date(), 2) >= 2;
  let todayAdvice: HealthAdvice = defaultAdvice;

  if (inPeriod) {
    todayAdvice = {
      level: 'high',
      title: '经期窗口，先别硬闯副本',
      body: '经期前后身体更敏感。如果仍要亲密，请充分沟通、注意卫生和保护，疼痛或不适就停止。',
      action: '优先选择陪伴、热敷、休息。欲望很正常，照顾身体更高级。',
    };
  } else if (inFertile) {
    todayAdvice = {
      level: 'high',
      title: '高风险窗口，别拿概率开玩笑',
      body: '易孕期附近如果发生无保护性行为，意外怀孕风险更高。请认真使用可靠避孕方式。',
      action: '没有保护就暂停；已发生风险行为请及时咨询专业人士。',
    };
  } else if (tooFrequent) {
    todayAdvice = {
      level: 'medium',
      title: '记录有点密，别把身体当 KPI',
      body: '频率没有统一标准，但疼痛、疲劳、焦虑或影响生活时，就是身体在敲桌子。',
      action: '今天可以选择拥抱、聊天、自慰知识卡或早点睡。',
    };
  }

  return {
    nextPeriodStart: isoDate(nextStart),
    nextPeriodEnd: isoDate(nextEnd),
    fertileStart: isoDate(fertileStart),
    fertileEnd: isoDate(fertileEnd),
    todayAdvice,
  };
}

export function buildStats(records: IntimacyRecord[]) {
  const month = isoDate(new Date()).slice(0, 7);
  const monthRecords = records.filter((record) => record.occurredAt.startsWith(month));
  const safeRecords = records.filter((record) => record.protection !== 'none');
  return {
    monthCount: monthRecords.length,
    safeRate: records.length ? Math.round((safeRecords.length / records.length) * 100) : 0,
    partnerShared: records.filter((record) => record.sharedWithPartner).length,
  };
}

export function calculateRisk(protection: ProtectionMethod, type: IntimacyType, cycleRisk: RiskLevel): RiskLevel {
  if (type === 'solo' || type === 'cuddle' || type === 'kiss') {
    return 'low';
  }
  if (protection === 'none' || cycleRisk === 'high') {
    return 'high';
  }
  if (protection === 'not_sure') {
    return 'medium';
  }
  return 'low';
}

export function buildTags(draft: RecordDraft, riskLevel: RiskLevel) {
  return [
    intimacyTypeLabels[draft.type],
    protectionLabels[draft.protection],
    draft.consentChecked ? '同意明确' : '同意待确认',
    riskTone[riskLevel],
  ];
}
