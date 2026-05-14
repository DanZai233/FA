import type {
  CreatePartnerShareBody,
  CyclePrediction,
  CycleRecord,
  DataExport,
  IntimacyRecord,
  KnowledgeCard,
  MatchCard,
  PartnerHub,
  PartnerLinkWire,
  PartnerMessage,
  PartnerShareRequest,
  PartnerShareRequestsWire,
  PhraseTemplate,
  ReminderSummary,
  ShareRejectPhraseOption,
  SocialPost,
  UpdateMeBody,
  UserProfile,
} from '../types/domain';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8083';

const AUTH_KEY = 'faleme.authToken';

let cachedToken: string | null | undefined;

export function getAuthToken(): string | null {
  if (cachedToken !== undefined) {
    return cachedToken;
  }
  cachedToken = localStorage.getItem(AUTH_KEY);
  return cachedToken;
}

export function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem(AUTH_KEY, token);
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  headers['X-Request-ID'] =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error((payload as {error?: string}).error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  captcha: () =>
    request<{id: string; dataUrl: string; imageBase64: string; mimeType: string}>('/api/v1/auth/captcha'),
  register: (body: {
    email: string;
    password: string;
    captchaId: string;
    captcha: string;
    nickname?: string;
    squareAlias?: string;
    adultConfirmed: boolean;
  }) =>
    request<{token: string; user: UserProfile}>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        captchaId: body.captchaId,
        captcha: body.captcha,
        nickname: body.nickname ?? '',
        squareAlias: body.squareAlias ?? '',
        role: 'switch',
        adultConfirmed: body.adultConfirmed,
      }),
    }).then((res) => {
      setAuthToken(res.token);
      return res;
    }),
  loginEmail: (body: {email: string; password: string}) =>
    request<{token: string; user: UserProfile}>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((res) => {
      setAuthToken(res.token);
      return res;
    }),

  me: () => request<UserProfile>('/api/v1/me'),
  updateMe: (profile: UpdateMeBody) =>
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
  partner: () => request<PartnerHub>('/api/v1/partners'),
  createPartnerInvite: () =>
    request<PartnerLinkWire>('/api/v1/partners/invite', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  acceptPartnerInvite: (inviteCode: string) =>
    request<PartnerLinkWire>('/api/v1/partners/accept', {
      method: 'POST',
      body: JSON.stringify({inviteCode}),
    }),
  unlinkPartner: (peerId?: string) => {
    const q = peerId ? `?peerId=${encodeURIComponent(peerId)}` : '';
    return request<PartnerHub>(`/api/v1/partners${q}`, {
      method: 'DELETE',
    });
  },
  partnerMessages: () => request<PartnerMessage[]>('/api/v1/partners/messages'),
  createPartnerMessage: (phrase: string, opts?: {scene?: string; targetPartnerId?: string}) =>
    request<PartnerMessage>('/api/v1/partners/messages', {
      method: 'POST',
      body: JSON.stringify({
        phrase,
        scene: opts?.scene ?? 'partner',
        ...(opts?.targetPartnerId ? {targetPartnerId: opts.targetPartnerId} : {}),
      }),
    }),
  partnerShareRequests: () => request<PartnerShareRequestsWire>('/api/v1/partners/share-requests'),
  createPartnerShareRequest: (body: CreatePartnerShareBody) =>
    request<PartnerShareRequest>('/api/v1/partners/share-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  acceptPartnerShareRequest: (id: string, body: {receiverRating: number}) =>
    request<{shareRequest: PartnerShareRequest; record: IntimacyRecord | null}>(
      `/api/v1/partners/share-requests/${id}/accept`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    ),
  rejectPartnerShareRequest: (id: string, body: {phrase: string}) =>
    request<PartnerShareRequest>(`/api/v1/partners/share-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  partnerShareRejectPhrases: () =>
    request<{phrases: ShareRejectPhraseOption[]}>('/api/v1/partners/share-reject-phrases'),
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
  resonatePost: (id: string, chip?: string) =>
    request<SocialPost>(`/api/v1/social/posts/${id}/resonate`, {
      method: 'POST',
      body: JSON.stringify(chip ? {chip} : {}),
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
