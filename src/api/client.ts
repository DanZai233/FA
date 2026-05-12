import type {
  CyclePrediction,
  CycleRecord,
  DataExport,
  IntimacyRecord,
  KnowledgeCard,
  MatchCard,
  PartnerMessage,
  PhraseTemplate,
  ReminderSummary,
  SocialPost,
  UserProfile,
} from '../types/domain';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const DEMO_TOKEN = 'demo-token';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEMO_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<UserProfile>('/api/v1/me'),
  updateMe: (profile: Partial<UserProfile>) =>
    request<UserProfile>('/api/v1/me', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  exportMe: () => request<DataExport>('/api/v1/me/export'),
  deleteMe: () =>
    request<{status: string}>('/api/v1/me', {
      method: 'DELETE',
    }),
  records: () => request<IntimacyRecord[]>('/api/v1/records'),
  createRecord: (record: Partial<IntimacyRecord>) =>
    request<IntimacyRecord>('/api/v1/records', {
      method: 'POST',
      body: JSON.stringify(record),
    }),
  updateRecord: (id: string, record: Partial<IntimacyRecord>) =>
    request<IntimacyRecord>(`/api/v1/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    }),
  deleteRecord: (id: string) =>
    request<{status: string}>(`/api/v1/records/${id}`, {
      method: 'DELETE',
    }),
  cycles: () => request<CycleRecord[]>('/api/v1/cycles'),
  createCycle: (cycle: Partial<CycleRecord>) =>
    request<CycleRecord>('/api/v1/cycles', {
      method: 'POST',
      body: JSON.stringify(cycle),
    }),
  prediction: () => request<CyclePrediction>('/api/v1/cycles/prediction'),
  reminderSummary: () => request<ReminderSummary>('/api/v1/reminders/summary'),
  partner: () => request<{status: 'none' | 'pending' | 'linked'; inviteCode?: string}>('/api/v1/partners'),
  createPartnerInvite: () =>
    request<{status: 'none' | 'pending' | 'linked'; inviteCode?: string}>('/api/v1/partners/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  acceptPartnerInvite: (inviteCode: string) =>
    request<{status: 'none' | 'pending' | 'linked'; inviteCode?: string}>('/api/v1/partners/accept', {
      method: 'POST',
      body: JSON.stringify({inviteCode}),
    }),
  unlinkPartner: () =>
    request<{status: 'none' | 'pending' | 'linked'; inviteCode?: string}>('/api/v1/partners', {
      method: 'DELETE',
    }),
  partnerMessages: () => request<PartnerMessage[]>('/api/v1/partners/messages'),
  createPartnerMessage: (phrase: string) =>
    request<PartnerMessage>('/api/v1/partners/messages', {
      method: 'POST',
      body: JSON.stringify({phrase, scene: 'partner'}),
    }),
  knowledgeCards: () => request<KnowledgeCard[]>('/api/v1/knowledge/cards'),
  phrases: () => request<PhraseTemplate[]>('/api/v1/phrases'),
  compose: (payload: {tone: string; subject: string; action: string; ending: string}) =>
    request<{phrase: string}>('/api/v1/messages/compose', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  posts: () => request<SocialPost[]>('/api/v1/social/posts'),
  createPost: (phrase: string) =>
    request<SocialPost>('/api/v1/social/posts', {
      method: 'POST',
      body: JSON.stringify({phrase}),
    }),
  resonatePost: (id: string) =>
    request<SocialPost>(`/api/v1/social/posts/${id}/resonate`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  blockPost: (id: string) =>
    request<SocialPost>(`/api/v1/social/posts/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  shake: () =>
    request<MatchCard>('/api/v1/matches/shake', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  report: (targetId: string, reason: string) =>
    request('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify({targetId, reason}),
    }),
};
