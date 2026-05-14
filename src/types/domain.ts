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

/** exclusive：道德标杆独乐乐（1v1）；poly：逆天价值观众乐乐（多伴侣） */
export type RelationshipMode = 'exclusive' | 'poly';

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
  relationshipMode?: RelationshipMode;
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

export interface PartnerWire extends PartnerLinkWire {
  peerNickname?: string;
}

export interface PartnerHub {
  relationshipMode: RelationshipMode;
  partners: PartnerWire[];
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
  /** 众乐乐下关联的伴侣用户 id */
  partnerId?: string;
}

/** 记录弹层草稿 */
export type RecordDraft = Pick<
  IntimacyRecord,
  'type' | 'protection' | 'consentChecked' | 'sharedWithPartner' | 'rating'
> & {
  /** 众乐乐且多位搭子时，记录或同步要指向的伴侣用户 id */
  targetPartnerId?: string;
};

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
  /** 轻量共鸣理由计数（懂 / 笑死 / 学到了） */
  resonanceChips?: Record<string, number>;
  createdAt: string;
  reported?: boolean;
  blocked?: boolean;
  /** 发布时服务端根据来源 IP 离线解析的展示文案（非精确定位） */
  ipRegion?: string;
}

export interface PartnerMessage {
  id: string;
  userId: string;
  /** 发送时的用户名（nickname），伴侣可见 */
  authorNickname?: string;
  phrase: string;
  scene: string;
  targetPeerId?: string;
  createdAt: string;
}

/** 伴侣「法法同步」申请：pending 时双方都不会写入亲密记录；拒绝仅通知发起方。 */
export interface PartnerShareRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  /** 列表接口由服务端填充：发起方昵称 */
  senderNickname?: string;
  /** 列表接口由服务端填充：接收方昵称 */
  receiverNickname?: string;
  status: 'pending' | 'accepted' | 'rejected';
  senderRole?: UserRole;
  occurredAt: string;
  type: IntimacyType;
  protection: ProtectionMethod;
  consentChecked: boolean;
  senderRating: number;
  createdAt: string;
  receiverRating?: number;
  rejectionPhrase?: string;
  acceptedAt?: string;
  rejectedAt?: string;
}

export interface PartnerShareRequestsWire {
  inbox: PartnerShareRequest[];
  outbox: PartnerShareRequest[];
}

export interface CreatePartnerShareBody {
  occurredAt?: string;
  type: IntimacyType;
  protection: ProtectionMethod;
  consentChecked: boolean;
  senderRating: number;
  senderRole: UserRole;
  /** 众乐乐且多条关联时必填 */
  targetPartnerId?: string;
}

export interface ShareRejectPhraseOption {
  id: string;
  text: string;
  emoji?: string;
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
  shareRequests?: PartnerShareRequest[];
  exported: string;
}

export interface UpdateMeBody {
  nickname?: string;
  squareAlias?: string;
  role?: UserRole;
  privacyLock?: boolean;
  relationshipMode?: RelationshipMode;
  /** 首次切换到 poly 时须传：我是渣男 或 我是渣女 */
  polyOath?: string;
}

export interface MatchCard {
  id: string;
  alias: string;
  phrase: string;
  expiresAt: string;
}

export function normalizeRelationshipMode(raw?: string): RelationshipMode {
  return raw === 'poly' ? 'poly' : 'exclusive';
}

export function partnerStatusFromHub(hub: PartnerHub | null): PartnerLinkStatus {
  if (!hub?.partners?.length) return 'none';
  if (hub.partners.some((p) => p.status === 'linked')) return 'linked';
  if (hub.partners.some((p) => p.status === 'pending')) return 'pending';
  return 'none';
}
