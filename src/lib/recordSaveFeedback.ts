import {getAfterSaveBanter} from '../design/faleQuips';
import type {CyclePrediction, RecordDraft, UserRole} from '../types/domain';
import {isInFertileWindow} from './cyclePrediction';

/** 保存本地记录后的定制反馈：把记录与周期预测闭环说透 */
export function buildPostRecordEcho(opts: {
  role: UserRole;
  rating: number;
  draft: RecordDraft;
  prediction: CyclePrediction;
}): string {
  const chunks: string[] = [getAfterSaveBanter(opts.role, opts.rating)];

  if (isInFertileWindow(opts.prediction)) {
    chunks.push('处在易孕窗口附近：日历已按高风险提醒标亮，这条也会一起算进你的「身体天气预报」。');
  }

  const riskyType = opts.draft.type === 'penetrative' || opts.draft.type === 'oral' || opts.draft.type === 'manual';
  if (riskyType && opts.draft.protection === 'none') {
    chunks.push('无可靠保护时，这类记录会拉高整体风险观感，也可能拉低你这段周期的「安全员评分」趋势。');
  } else if (opts.draft.protection === 'condom' || opts.draft.protection === 'oral_contraceptive' || opts.draft.protection === 'iud') {
    chunks.push('有保护记录会给本周安全趋势加分。');
  }

  return chunks.join(' ');
}

export function buildPostPartnerShareEcho(): string {
  return '已排队法法同步：对方在收件箱确认后，双方各生成一条带评分的记录。';
}
