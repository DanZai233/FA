import type {RelationshipMode} from '../types/domain';

/** 众乐乐模式下略「放肆」的副文案（仅伴侣 Tab / 记录搭子相关使用） */
export function polyPartnerFlairLine(): string {
  return '多线也要讲清楚：谁是谁的搭子，别靠默契硬撑。';
}

export function polyRecordPickerFlair(): string {
  return '众乐乐：这次先点名搭子，再动笔，别写错收件人。';
}

export function partnerTabEyebrow(mode: RelationshipMode): string {
  return mode === 'poly' ? 'poly · 众乐乐' : 'exclusive · 独乐乐';
}
