export type UserRole = 'initiator' | 'receiver' | 'switch';

export type ProtectionMethod =
  | 'condom'
  | 'oral_contraceptive'
  | 'iud'
  | 'none'
  | 'not_sure';

export type IntimacyType =
  | 'cuddle'
  | 'kiss'
  | 'manual'
  | 'oral'
  | 'penetrative'
  | 'solo'
  | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export type PartnerLinkStatus = 'none' | 'pending' | 'linked';

export type PhraseSlot = 'tone' | 'subject' | 'action' | 'ending';

export interface UserProfile {
  id: string;
  /** 用户名：仅自己与伴侣可见（API 字段名仍为 nickname） */
  nickname: string;
  /** 匿名广场展示身份，与用户名独立 */
  squareAlias?: string;
  role: UserRole;
  adultConfirmed: boolean;
  partnerStatus?: PartnerLinkStatus;
  privacyLock?: boolean;
  email?: string;
}

export interface PartnerLinkWire {
  id?: string;
  userId?: string;
  partnerId?: string;
  inviteCode?: string;
  status: PartnerLinkStatus;
  canShare?: boolean;
  createdAt?: string;
  confirmedAt?: string;
}

export interface IntimacyRecord {
  id: string;
  occurredAt: string;
  type: IntimacyType;
  protection: ProtectionMethod;
  consentChecked: boolean;
  sharedWithPartner: boolean;
  rating: number;
  riskLevel: RiskLevel;
  noteTags: string[];
}

export interface CycleRecord {
  id: string;
  periodStart: string;
  periodEnd?: string;
  cycleLength: number;
}

export interface CyclePrediction {
  nextPeriodStart: string;
  nextPeriodEnd: string;
  fertileStart: string;
  fertileEnd: string;
  todayAdvice: HealthAdvice;
}

export interface HealthAdvice {
  level: RiskLevel;
  title: string;
  body: string;
  action: string;
}

export interface KnowledgeCard {
  id: string;
  category: string;
  title: string;
  body: string;
  action: string;
  tone: string;
}

export interface PhraseTemplate {
  id: string;
  slot: PhraseSlot;
  text: string;
  scenario: 'partner' | 'square' | 'match';
}

export interface SocialPost {
  id: string;
  authorAlias: string;
  phrase: string;
  resonanceCount: number;
  createdAt: string;
  reported?: boolean;
  blocked?: boolean;
}

export interface PartnerMessage {
  id: string;
  userId: string;
  /** 发送时的用户名（nickname），伴侣可见 */
  authorNickname?: string;
  phrase: string;
  scene: string;
  createdAt: string;
}

export interface ReminderSummary {
  title: string;
  body: string;
  advice: HealthAdvice;
  recordCount: number;
  safeRate: number;
}

export interface DataExport {
  user: UserProfile;
  partner: unknown;
  messages: PartnerMessage[];
  records: IntimacyRecord[];
  cycles: CycleRecord[];
  posts: SocialPost[];
  reports: unknown[];
  exported: string;
}

export interface MatchCard {
  id: string;
  alias: string;
  phrase: string;
  expiresAt: string;
}
