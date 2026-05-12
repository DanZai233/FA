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
  nickname: string;
  role: UserRole;
  adultConfirmed: boolean;
  partnerStatus: PartnerLinkStatus;
  privacyLock?: boolean;
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
