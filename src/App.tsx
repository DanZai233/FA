import React, {useEffect, useMemo, useState} from 'react';
import {
  Activity,
  BarChart2,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronRight,
  Flame,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {
  brand,
  defaultAdvice,
  intimacyTypeLabels,
  phraseBook,
  protectionLabels,
  riskTone,
  roleLabels,
} from './design/copy';
import {
  bumpTodayHeroFabClick,
  getAfterSaveBanter,
  getHeroFabBanter,
  getPartnerShareAfterSendBanter,
  getPartnerShareInboxBanter,
  getPartnerShareOutboxBanter,
} from './design/faleQuips';
import {api, getAuthToken, setAuthToken} from './api/client';
import {AuthScreen} from './AuthScreen';
import type {
  CyclePrediction,
  CycleRecord,
  HealthAdvice,
  IntimacyRecord,
  IntimacyType,
  KnowledgeCard,
  MatchCard,
  PartnerLinkWire,
  PartnerMessage,
  PartnerShareRequest,
  PartnerShareRequestsWire,
  PartnerLinkStatus,
  PhraseSlot,
  ProtectionMethod,
  ReminderSummary,
  RiskLevel,
  ShareRejectPhraseOption,
  SocialPost,
  UserProfile,
  UserRole,
} from './types/domain';

const today = new Date();
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const seedRecords: IntimacyRecord[] = [
  {
    id: 'rec-1',
    occurredAt: isoDate(addDays(today, -2)),
    type: 'penetrative',
    protection: 'condom',
    consentChecked: true,
    sharedWithPartner: true,
    rating: 5,
    riskLevel: 'low',
    noteTags: ['尊重同意', '安全套上岗'],
  },
  {
    id: 'rec-2',
    occurredAt: isoDate(addDays(today, -8)),
    type: 'solo',
    protection: 'not_sure',
    consentChecked: true,
    sharedWithPartner: false,
    rating: 4,
    riskLevel: 'low',
    noteTags: ['单人排解', '睡前放松'],
  },
  {
    id: 'rec-3',
    occurredAt: isoDate(addDays(today, -14)),
    type: 'kiss',
    protection: 'not_sure',
    consentChecked: true,
    sharedWithPartner: true,
    rating: 3,
    riskLevel: 'medium',
    noteTags: ['沟通不足'],
  },
];

const seedCycle: CycleRecord = {
  id: 'cycle-1',
  periodStart: isoDate(addDays(today, -20)),
  periodEnd: isoDate(addDays(today, -16)),
  cycleLength: 29,
};

const knowledgeCards: KnowledgeCard[] = [
  {
    id: 'k-1',
    category: '保护',
    title: '安全套不是气氛杀手，是成年人防沉迷插件',
    body: '正确佩戴、全程使用、事后检查，能显著降低意外怀孕和部分性传播感染风险。',
    action: '把安全套放在伸手可及但不高温暴晒的位置。',
    tone: '别让一时上头变成长期售后。',
  },
  {
    id: 'k-2',
    category: '同意',
    title: '“可以吗”比任何套路都性感',
    body: '同意必须清醒、明确、可撤回。沉默、犹豫、喝醉都不是默认许可。',
    action: '过程中也可以问：“这样舒服吗？要不要停一下？”',
    tone: '会确认边界的人，才是真正的高手。',
  },
  {
    id: 'k-3',
    category: '无伴侣',
    title: '单人排解不丢人，别跟身体较劲',
    body: '自慰是常见的性释放方式。注意清洁、润滑、力度和频率，不要用危险物品尝试。',
    action: '如果影响学习工作或造成疼痛，及时停下并寻求专业帮助。',
    tone: '人可以寂寞，操作不能离谱。',
  },
];

const socialSeed: SocialPost[] = [
  {
    id: 'p-1',
    authorAlias: '匿名安全员',
    phrase: '安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感',
    resonanceCount: 128,
    createdAt: isoDate(addDays(today, -1)),
  },
  {
    id: 'p-2',
    authorAlias: '匿名嘴硬人',
    phrase: '嘴硬但诚实 / 我的荷尔蒙 / 建议冷静三分钟 / 先喝水再说',
    resonanceCount: 64,
    createdAt: isoDate(addDays(today, -3)),
  },
];

const matchSeed: MatchCard = {
  id: 'match-1',
  alias: '附近不存在的人',
  phrase: '今晚月色不错 / 这位成年人 / 申请抱抱 / 但安全第一',
  expiresAt: isoDate(addDays(today, 1)),
};

const seedMessages: PartnerMessage[] = [
  {
    id: 'msg-1',
    userId: 'u-demo',
    authorNickname: '嘴硬但健康的成年人',
    phrase: '安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感',
    scene: 'partner',
    createdAt: isoDate(addDays(today, -1)),
  },
];

type TabKey = 'home' | 'cycle' | 'partner' | 'square' | 'profile';

type OfflineRecord = {
  id: string;
  label: '法了！' | '被法了！';
  role: 'initiator' | 'receiver';
  occurredAt: string;
  timestamp: number;
};

const offlineStorageKey = 'faleme.offline.records';

const randomItem = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const randomPhraseParts = (): Record<PhraseSlot, string> => ({
  tone: randomItem(phraseBook.tones),
  subject: randomItem(phraseBook.subjects),
  action: randomItem(phraseBook.actions),
  ending: randomItem(phraseBook.endings),
});

/** 预设拼句各槽位的俏皮视觉（仅 Web UI） */
const phraseSlotUI: Record<
  PhraseSlot,
  {emoji: string; blurb: string; idle: string; active: string; glow: string}
> = {
  tone: {
    emoji: '✨',
    blurb: '先定个语气～',
    idle: 'border-violet-200/80 bg-white/75 text-violet-950 shadow-sm hover:border-violet-300 hover:bg-violet-50/90',
    active: 'border-transparent bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-white',
    glow: 'shadow-lg shadow-violet-300/50',
  },
  subject: {
    emoji: '🧸',
    blurb: '今天谁是主角',
    idle: 'border-sky-200/80 bg-white/75 text-sky-950 shadow-sm hover:border-sky-300 hover:bg-sky-50/90',
    active: 'border-transparent bg-gradient-to-br from-sky-400 to-cyan-400 text-white',
    glow: 'shadow-lg shadow-sky-300/45',
  },
  action: {
    emoji: '💞',
    blurb: '发生点小剧情',
    idle: 'border-rose-200/80 bg-white/75 text-rose-950 shadow-sm hover:border-rose-300 hover:bg-rose-50/90',
    active: 'border-transparent bg-gradient-to-br from-rose-400 to-amber-400 text-white',
    glow: 'shadow-lg shadow-rose-300/45',
  },
  ending: {
    emoji: '🎀',
    blurb: '最后一笔俏皮',
    idle: 'border-amber-200/80 bg-white/75 text-amber-950 shadow-sm hover:border-amber-300 hover:bg-amber-50/90',
    active: 'border-transparent bg-gradient-to-br from-amber-400 to-orange-400 text-white',
    glow: 'shadow-lg shadow-amber-300/40',
  },
};

const roleTheme = (role: UserRole) => {
  const isReceiver = role === 'receiver';
  return {
    isReceiver,
    mode: isReceiver ? 'receiver' as const : 'initiator' as const,
    label: isReceiver ? '被法了！' as const : '法了！' as const,
    subtitle: isReceiver ? '被温柔照顾，也要有边界' : '主动出发，但别忘了安全带',
    tabLabel: isReceiver ? '我是“被法”的一方' : '我是“法”的一方',
    pageBg: isReceiver ? 'bg-[#F4F0FF]' : 'bg-[#F2F2F7]',
    heroBg: isReceiver ? 'from-violet-500 to-fuchsia-400' : 'from-rose-500 to-pink-400',
    accentText: isReceiver ? 'text-violet-500' : 'text-rose-500',
    accentSoft: isReceiver ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-500',
  };
};

export default function App() {
  const path = window.location.pathname;

  if (path === '/' || path === '/app') {
    return <MobileApp />;
  }

  return <PublicPage path={path} />;
}

function MobileApp() {
  const [offlineMode, setOfflineMode] = useState(() => localStorage.getItem('faleme.offline.enabled') === 'true');
  const [authPhase, setAuthPhase] = useState<'boot' | 'anon' | 'in'>(() => (getAuthToken() ? 'boot' : 'anon'));
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    nickname: '',
    role: 'switch',
    adultConfirmed: true,
    partnerStatus: 'none',
  });
  const [partnerLink, setPartnerLink] = useState<PartnerLinkWire | null>(null);
  const [records, setRecords] = useState<IntimacyRecord[]>(seedRecords);
  const [cycle, setCycle] = useState<CycleRecord>(seedCycle);
  const [posts, setPosts] = useState<SocialPost[]>(socialSeed);
  const [partnerMessages, setPartnerMessages] = useState<PartnerMessage[]>(seedMessages);
  const [shareWire, setShareWire] = useState<PartnerShareRequestsWire>({inbox: [], outbox: []});
  const [shareRejectPresets, setShareRejectPresets] = useState<ShareRejectPhraseOption[]>([]);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [recordSheetOpen, setRecordSheetOpen] = useState(false);
  const [recordBanter, setRecordBanter] = useState<string | null>(null);
  const [homeEcho, setHomeEcho] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'connected' | 'offline-demo'>('offline-demo');

  useEffect(() => {
    if (authPhase !== 'boot') {
      return;
    }
    api
      .me()
      .then(() => setAuthPhase('in'))
      .catch(() => {
        setAuthToken(null);
        setAuthPhase('anon');
      });
  }, [authPhase]);

  const localPrediction = useMemo(() => predictCycle(cycle, records), [cycle, records]);
  const [remotePrediction, setRemotePrediction] = useState<CyclePrediction | null>(null);
  const prediction = remotePrediction ?? localPrediction;
  const stats = useMemo(() => buildStats(records), [records]);

  const syncRemotePartnerExtras = () => {
    Promise.all([api.records(), api.partnerMessages(), api.partnerShareRequests(), api.partner()])
      .then(([nextRecords, nextMessages, nextShares, nextPartner]) => {
        setRecords(Array.isArray(nextRecords) ? nextRecords : []);
        setPartnerMessages(Array.isArray(nextMessages) ? nextMessages : []);
        setShareWire(
          nextShares && typeof nextShares === 'object'
            ? {inbox: nextShares.inbox ?? [], outbox: nextShares.outbox ?? []}
            : {inbox: [], outbox: []},
        );
        setPartnerLink(nextPartner);
        setProfile((p) => ({...p, partnerStatus: nextPartner.status}));
        setApiStatus('connected');
      })
      .catch(() => setApiStatus('offline-demo'));
  };

  useEffect(() => {
    if (authPhase !== 'in') {
      return;
    }
    let ignore = false;
    Promise.all([
      api.me(),
      api.records(),
      api.cycles(),
      api.posts(),
      api.prediction(),
      api.partnerMessages(),
      api.partner(),
      api.reminderSummary(),
      api.partnerShareRequests(),
      api.partnerShareRejectPhrases().catch(() => ({phrases: [] as ShareRejectPhraseOption[]})),
    ])
      .then(
        ([
          nextProfile,
          nextRecords,
          nextCycles,
          nextPosts,
          nextPrediction,
          nextMessages,
          nextPartner,
          nextSummary,
          nextShares,
          rejectPack,
        ]) => {
        if (ignore) {
          return;
        }
        setProfile((prev) => ({
          ...prev,
          ...nextProfile,
          partnerStatus: nextPartner.status,
        }));
        setPartnerLink(nextPartner);
        setRecords(Array.isArray(nextRecords) ? nextRecords : []);
        const cycles = Array.isArray(nextCycles) ? nextCycles : [];
        if (cycles[0]) {
          setCycle(cycles[0]);
        }
        setPosts(Array.isArray(nextPosts) ? nextPosts : []);
        setRemotePrediction(nextPrediction);
        setPartnerMessages(Array.isArray(nextMessages) ? nextMessages : []);
        setShareWire(
          nextShares && typeof nextShares === 'object'
            ? {inbox: nextShares.inbox ?? [], outbox: nextShares.outbox ?? []}
            : {inbox: [], outbox: []},
        );
        setShareRejectPresets(Array.isArray(rejectPack.phrases) ? rejectPack.phrases : []);
        setSummary(nextSummary);
        setApiStatus('connected');
      })
      .catch(() => {
        if (!ignore) {
          setApiStatus('offline-demo');
        }
      });
    return () => {
      ignore = true;
    };
  }, [authPhase]);

  useEffect(() => {
    if (!homeEcho) {
      return;
    }
    const timer = window.setTimeout(() => setHomeEcho(null), 8000);
    return () => window.clearTimeout(timer);
  }, [homeEcho]);

  if (offlineMode) {
    return <OfflineModeView onExit={() => {
      localStorage.setItem('faleme.offline.enabled', 'false');
      setOfflineMode(false);
    }} />;
  }

  if (authPhase === 'boot') {
    return (
      <div className="flex min-h-screen justify-center bg-gradient-to-br from-[#fdf2f8] via-[#f4f4fb] to-[#fffbeb]">
        <div className="flex max-w-[430px] flex-1 items-center justify-center text-sm font-bold text-slate-500">加载中…</div>
      </div>
    );
  }

  if (authPhase === 'anon') {
    return (
      <div className="flex min-h-screen justify-center bg-slate-100">
        <AuthScreen
          onAuthed={() => setAuthPhase('in')}
          onOffline={() => {
            localStorage.setItem('faleme.offline.enabled', 'true');
            setOfflineMode(true);
          }}
        />
      </div>
    );
  }

  const saveRecord = (draft: RecordDraft) => {
    const partnerLinked = partnerLink?.status === 'linked';
    const useShareFlow = Boolean(draft.sharedWithPartner && partnerLinked);

    if (useShareFlow) {
      const body = {
        occurredAt: isoDate(new Date()),
        type: draft.type,
        protection: draft.protection,
        consentChecked: draft.consentChecked,
        senderRating: draft.rating,
        senderRole: profile.role,
      };
      api
        .createPartnerShareRequest(body)
        .then(() => {
          setApiStatus('connected');
          setHomeEcho(getPartnerShareAfterSendBanter(profile.role));
          syncRemotePartnerExtras();
        })
        .catch(() => setApiStatus('offline-demo'));
      setRecordSheetOpen(false);
      return;
    }

    const riskLevel = calculateRisk(draft.protection, draft.type, prediction.todayAdvice.level);
    const optimisticRecord: IntimacyRecord = {
      id: `rec-${Date.now()}`,
      occurredAt: isoDate(new Date()),
      riskLevel,
      noteTags: buildTags(draft, riskLevel),
      ...draft,
    };
    setRecords((prev) => [optimisticRecord, ...prev]);
    api.createRecord(optimisticRecord)
      .then((record) => {
        setRecords((prev) => prev.map((item) => (item.id === optimisticRecord.id ? record : item)));
        setApiStatus('connected');
        setHomeEcho(getAfterSaveBanter(profile.role, draft.rating));
      })
      .catch(() => setApiStatus('offline-demo'));
    setRecordSheetOpen(false);
  };

  const publishPhrase = (phrase: string) => {
    const clipped = Array.from(phrase.trim()).slice(0, 320).join('');
    if (!clipped) return;
    const optimisticPost: SocialPost = {
      id: `p-${Date.now()}`,
      authorAlias: profile.squareAlias?.trim() || '匿名成年人',
      phrase: clipped,
      resonanceCount: 0,
      createdAt: isoDate(new Date()),
    };
    setPosts((prev) => [optimisticPost, ...prev]);
    api.createPost(clipped)
      .then((post) => {
        setPosts((prev) => prev.map((item) => (item.id === optimisticPost.id ? post : item)));
        setApiStatus('connected');
      })
      .catch(() => setApiStatus('offline-demo'));
  };

  const theme = roleTheme(profile.role);

  return (
    <div className="flex h-[100dvh] min-h-0 justify-center overflow-hidden bg-gradient-to-br from-[#fdf2f8] via-[#f4f4fb] to-[#fffbeb]">
      <div className={`ios-safe-top relative flex h-full min-h-0 w-full max-w-[430px] flex-col overflow-hidden ${theme.pageBg} shadow-2xl`}>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          {activeTab === 'home' && (
            <HomeView
              advice={prediction.todayAdvice}
              records={records}
              stats={stats}
              summary={summary}
              role={profile.role}
              homeEcho={homeEcho}
              onDismissHomeEcho={() => setHomeEcho(null)}
              onAddRecord={() => {
                const n = bumpTodayHeroFabClick(profile.id);
                const latestRating = records[0]?.rating ?? null;
                setRecordBanter(getHeroFabBanter({role: profile.role, clickCountToday: n, latestRating}));
                setRecordSheetOpen(true);
              }}
              onEnterOffline={() => {
                localStorage.setItem('faleme.offline.enabled', 'true');
                setOfflineMode(true);
              }}
              onDeleteRecord={(id) => {
                setRecords((prev) => prev.filter((record) => record.id !== id));
                api.deleteRecord(id).catch(() => setApiStatus('offline-demo'));
              }}
            />
          )}
          {activeTab === 'cycle' && (
            <CycleView
              records={records}
              cycle={cycle}
              prediction={prediction}
              onCycleChange={(nextCycle) => {
                setCycle(nextCycle);
                api.createCycle(nextCycle)
                  .then((saved) => {
                    setCycle(saved);
                    setRemotePrediction(null);
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
            />
          )}
          {activeTab === 'partner' && (
            <PartnerView
              partner={partnerLink ?? {status: 'none'}}
              messages={partnerMessages}
              shareWire={shareWire}
              rejectPhrasePresets={shareRejectPresets}
              onSendMessage={(phrase) => {
                const optimistic: PartnerMessage = {
                  id: `msg-${Date.now()}`,
                  userId: profile.id,
                  authorNickname: profile.nickname?.trim() || '我',
                  phrase,
                  scene: 'partner',
                  createdAt: isoDate(new Date()),
                };
                setPartnerMessages((prev) => [optimistic, ...prev]);
                api.createPartnerMessage(phrase)
                  .then((message) => {
                    setPartnerMessages((prev) => prev.map((item) => (item.id === optimistic.id ? message : item)));
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onCreateInvite={async () => {
                try {
                  const link = await api.createPartnerInvite();
                  setPartnerLink(link);
                  setProfile((p) => ({...p, partnerStatus: link.status}));
                  if (link.inviteCode) {
                    await navigator.clipboard?.writeText(link.inviteCode).catch(() => {});
                  }
                  setApiStatus('connected');
                } catch {
                  setApiStatus('offline-demo');
                }
              }}
              onUnlink={async () => {
                try {
                  const link = await api.unlinkPartner();
                  setPartnerLink(link);
                  setProfile((p) => ({...p, partnerStatus: link.status}));
                  setApiStatus('connected');
                } catch {
                  setApiStatus('offline-demo');
                }
              }}
              onAcceptInvite={async (code) => {
                try {
                  const link = await api.acceptPartnerInvite(code);
                  setPartnerLink(link);
                  setProfile((p) => ({...p, partnerStatus: link.status}));
                  setApiStatus('connected');
                } catch {
                  setApiStatus('offline-demo');
                }
              }}
              onAcceptPartnerShare={async (id, receiverRating) => {
                try {
                  await api.acceptPartnerShareRequest(id, {receiverRating});
                  syncRemotePartnerExtras();
                } catch {
                  setApiStatus('offline-demo');
                }
              }}
              onRejectPartnerShare={async (id, phrase) => {
                try {
                  await api.rejectPartnerShareRequest(id, {phrase});
                  syncRemotePartnerExtras();
                } catch {
                  setApiStatus('offline-demo');
                }
              }}
            />
          )}
          {activeTab === 'square' && (
            <SquareView
              posts={posts}
              onPublish={publishPhrase}
              onResonate={(id) => {
                setPosts((prev) =>
                  prev.map((post) =>
                    post.id === id ? {...post, resonanceCount: post.resonanceCount + 1} : post,
                  ),
                );
                api.resonatePost(id)
                  .then((updated) => {
                    setPosts((prev) => prev.map((post) => (post.id === id ? updated : post)));
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onReport={(id) => {
                setPosts((prev) => prev.map((post) => (post.id === id ? {...post, reported: true} : post)));
                api.report(id, '用户主动举报')
                  .then(() => setApiStatus('connected'))
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onBlock={(id) => {
                setPosts((prev) => prev.filter((post) => post.id !== id));
                api.blockPost(id)
                  .then(() => setApiStatus('connected'))
                  .catch(() => setApiStatus('offline-demo'));
              }}
            />
          )}
          {activeTab === 'profile' && (
            <ProfileView
              profile={profile}
              records={records}
              onSaveUsername={(nickname) => {
                const clipped = Array.from(nickname.trim()).slice(0, 32).join('');
                api
                  .updateMe({nickname: clipped})
                  .then((me) => {
                    setProfile((prev) => ({...prev, ...me}));
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onSaveSquareAlias={(squareAlias) => {
                const clipped = Array.from(squareAlias.trim()).slice(0, 24).join('');
                api
                  .updateMe({squareAlias: clipped})
                  .then((me) => {
                    setProfile((prev) => ({...prev, ...me}));
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onRoleChange={(role) => {
                setProfile((prev) => ({...prev, role}));
                api.updateMe({role}).catch(() => setApiStatus('offline-demo'));
              }}
              onPrivacyLockChange={(privacyLock) => {
                setProfile((prev) => ({...prev, privacyLock}));
                api.updateMe({privacyLock}).catch(() => setApiStatus('offline-demo'));
              }}
              onExportData={() => {
                api.exportMe()
                  .then((payload) => {
                    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = `faleme-export-${isoDate(new Date())}.json`;
                    anchor.click();
                    URL.revokeObjectURL(url);
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onDeleteAccount={() => {
                api.deleteMe()
                  .then(() => {
                    setAuthToken(null);
                    setAuthPhase('anon');
                    setRecords([]);
                    setPosts([]);
                    setPartnerLink({status: 'none'});
                    setProfile({id: '', nickname: '', squareAlias: '', role: 'switch', adultConfirmed: true, partnerStatus: 'none'});
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
              onLogout={() => {
                setAuthToken(null);
                setAuthPhase('anon');
              }}
            />
          )}
        </main>

        <nav className="ios-safe-bottom relative z-20 w-full shrink-0 border-t border-white/50 bg-white/80 backdrop-blur-xl">
          <div className="grid h-16 grid-cols-5 px-2">
            <TabItem icon={<Flame size={22} />} label="记录" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <TabItem icon={<CalendarIcon size={22} />} label="法法日历" active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} />
            <TabItem icon={<Heart size={22} />} label="伴侣" active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} />
            <TabItem icon={<MessageCircle size={22} />} label="广场" active={activeTab === 'square'} onClick={() => setActiveTab('square')} />
            <TabItem icon={<User size={22} />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
        </nav>

        <RecordSheet
          isOpen={recordSheetOpen}
          advice={prediction.todayAdvice}
          partnerLinked={partnerLink?.status === 'linked'}
          topBanter={recordBanter}
          onClose={() => {
            setRecordSheetOpen(false);
            setRecordBanter(null);
          }}
          onSave={saveRecord}
        />
      </div>
    </div>
  );
}

function HomeView({
  advice,
  records,
  stats,
  summary,
  role,
  homeEcho,
  onDismissHomeEcho,
  onAddRecord,
  onEnterOffline,
  onDeleteRecord,
}: {
  advice: HealthAdvice;
  records: IntimacyRecord[];
  stats: ReturnType<typeof buildStats>;
  summary: ReminderSummary | null;
  role: UserRole;
  homeEcho?: string | null;
  onDismissHomeEcho?: () => void;
  onAddRecord: () => void;
  onEnterOffline: () => void;
  onDeleteRecord: (id: string) => void;
}) {
  const latest = records[0];
  const theme = roleTheme(role);
  const highRiskCount = records.filter((record) => record.riskLevel === 'high').length;
  const protectedCount = records.filter((record) => record.protection !== 'none').length;
  const soloCount = records.filter((record) => record.type === 'solo').length;
  return (
    <section className="space-y-6 p-5 pt-10">
      <div className={`relative overflow-hidden rounded-[2.4rem] bg-gradient-to-br ${theme.heroBg} p-6 text-white shadow-[0_30px_80px_-30px_rgba(244,63,94,0.85)]`}>
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/20 blur-2xl" />
        <div className="absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <header className="relative flex gap-4">
          <img src="/logo.png" alt={brand.name} width={72} height={72} className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl bg-white/20 object-cover shadow-lg ring-1 ring-white/30" />
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">adult wellness</p>
            <h1 className="mt-3 text-5xl font-black tracking-tight">{brand.name}</h1>
            <p className="mt-3 max-w-[17rem] text-sm font-semibold leading-6 text-white/78">{brand.slogan}</p>
          </div>
        </header>
        <button
          onClick={onAddRecord}
          className="relative mx-auto mt-8 flex h-56 w-56 flex-col items-center justify-center rounded-full border border-white/30 bg-white/18 text-white shadow-2xl shadow-black/20 backdrop-blur-xl transition active:scale-95"
        >
          {theme.isReceiver ? <Heart size={68} strokeWidth={1.5} /> : <Flame size={68} strokeWidth={1.5} />}
          <span className="mt-2 text-4xl font-black tracking-wider">{theme.label}</span>
          <span className="mt-2 max-w-36 text-center text-xs font-bold text-white/75">{theme.subtitle}</span>
        </button>
        <div className="relative mt-6 grid grid-cols-3 gap-2">
          <HeroPill label="保护率" value={`${stats.safeRate}%`} />
          <HeroPill label="本月" value={`${stats.monthCount} 次`} />
          <HeroPill label="最近" value={latest?.occurredAt.slice(5) ?? '暂无'} />
        </div>
        {homeEcho ? (
          <div className="relative mt-5 rounded-2xl border border-white/35 bg-white/14 px-4 py-3 text-left shadow-inner backdrop-blur-md">
            <p className="text-[13px] font-bold leading-relaxed text-white/95">{homeEcho}</p>
            <button
              type="button"
              onClick={() => onDismissHomeEcho?.()}
              className="mt-2 text-[11px] font-black uppercase tracking-wider text-white/60 underline-offset-2 hover:text-white"
            >
              知道了
            </button>
          </div>
        ) : null}
      </div>

      <button onClick={onEnterOffline} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700">
        进入完全离线模式
      </button>

      <Card title="今日安全流程" action="3 步别省">
        <div className="grid gap-3">
          <ChecklistRow done={stats.safeRate >= 70} title="保护措施准备好" body={`${protectedCount}/${records.length || 1} 条记录使用了保护或低风险方式。`} />
          <ChecklistRow done={highRiskCount === 0} title="高风险记录归零" body={highRiskCount === 0 ? '目前没有高风险记录，安全员先不骂人。' : `有 ${highRiskCount} 条高风险记录，别把侥幸当玄学。`} />
          <ChecklistRow done={soloCount > 0} title="单人排解也被允许" body={soloCount > 0 ? '你已经记录过单人排解，身体管理很成年人。' : '无伴侣时可以选择安全、清洁、不过度的单人排解。'} />
        </div>
      </Card>

      <AdviceCard advice={advice} />
      {summary && (
        <div className="rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">safety briefing</p>
          <h2 className="mt-2 text-lg font-black">{summary.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">{summary.body}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <InfoPillDark label="总记录" value={`${summary.recordCount} 条`} />
            <InfoPillDark label="安全率" value={`${summary.safeRate}%`} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="本月" value={`${stats.monthCount}`} suffix="次" icon={<Activity size={18} />} />
        <MetricCard label="安全率" value={`${stats.safeRate}`} suffix="%" icon={<ShieldCheck size={18} />} />
        <MetricCard label="连线" value={`${stats.partnerShared}`} suffix="条" icon={<Users size={18} />} />
      </div>

      <Card title="最近记录" action="只展示给你授权的人">
        <div className="space-y-3">
          {records.slice(0, 6).map((record) => renderRecordRow(record, onDeleteRecord))}
          {!latest && <p className="py-6 text-center text-sm text-slate-400">暂无记录。荒唐可以从今天开始，安全也要从今天开始。</p>}
        </div>
      </Card>
    </section>
  );
}

function OfflineModeView({onExit}: {onExit: () => void}) {
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem('faleme.offline.role') === 'receiver' ? 'receiver' : 'initiator'));
  const [records, setRecords] = useState<OfflineRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(offlineStorageKey) ?? '[]') as OfflineRecord[];
    } catch {
      return [];
    }
  });

  const theme = roleTheme(role);

  const [offlineBanter, setOfflineBanter] = useState<string | null>(null);

  const changeRole = (nextRole: UserRole) => {
    setRole(nextRole);
    localStorage.setItem('faleme.offline.role', nextRole);
  };

  const saveOfflineRecord = () => {
    const next = [
      {
        id: `offline-${Date.now()}`,
        label: theme.label,
        role: theme.mode,
        occurredAt: isoDate(new Date()),
        timestamp: Date.now(),
      },
      ...records,
    ];
    setRecords(next);
    localStorage.setItem(offlineStorageKey, JSON.stringify(next));
  };

  const clearOfflineRecords = () => {
    setRecords([]);
    localStorage.removeItem(offlineStorageKey);
  };

  const todayCount = records.filter((record) => record.occurredAt === isoDate(new Date())).length;

  return (
    <div className="flex min-h-screen justify-center bg-slate-100">
      <div className={`ios-safe-top relative flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden ${theme.pageBg} p-5 shadow-2xl`}>
        <header className="pt-8 text-center">
          <p className={`text-xs font-black uppercase tracking-[0.28em] ${theme.accentText}`}>offline mode</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">完全离线</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
            不联网、不同步、不社交。只记录今天到底是法了，还是被法了。
          </p>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-2 rounded-3xl bg-white/70 p-1 shadow-sm">
          <button onClick={() => changeRole('initiator')} className={`rounded-[1.35rem] py-3 text-xs font-black ${role !== 'receiver' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}>
            我是“法”的一方
          </button>
          <button onClick={() => changeRole('receiver')} className={`rounded-[1.35rem] py-3 text-xs font-black ${role === 'receiver' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400'}`}>
            我是“被法”的一方
          </button>
        </div>

        <button
          onClick={() => {
            const n = bumpTodayHeroFabClick('offline');
            setOfflineBanter(getHeroFabBanter({role, clickCountToday: n, latestRating: null}));
            saveOfflineRecord();
          }}
          className={`mx-auto mt-10 flex h-64 w-64 flex-col items-center justify-center rounded-full bg-gradient-to-tr ${theme.heroBg} text-white shadow-[0_24px_70px_-18px_rgba(244,63,94,0.75)] active:scale-95`}
        >
          {theme.isReceiver ? <Heart size={70} /> : <Flame size={70} />}
          <span className="mt-3 text-4xl font-black">{theme.label}</span>
          <span className="mt-2 text-xs font-bold text-white/75">完全本地，只记这一笔</span>
        </button>

        {offlineBanter ? (
          <p className="mx-auto mt-4 max-w-sm px-3 text-center text-sm font-bold leading-relaxed text-slate-700">{offlineBanter}</p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <MetricCard label="今日" value={`${todayCount}`} suffix="次" icon={<Activity size={18} />} />
          <MetricCard label="离线累计" value={`${records.length}`} suffix="条" icon={<Lock size={18} />} />
        </div>

        <Card title="离线记录" action="只在本机">
          <div className="space-y-3">
            {records.slice(0, 8).map((record) => (
              <div key={record.id} className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-black text-slate-900">{record.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{record.occurredAt}</p>
                </div>
                <span className={`rounded-full bg-white px-3 py-1 text-xs font-black ${record.role === 'receiver' ? 'text-violet-500' : 'text-rose-500'}`}>本地</span>
              </div>
            ))}
            {records.length === 0 && <p className="py-6 text-center text-sm text-slate-400">还没记录。宇宙很安静，你也可以很安静。</p>}
          </div>
        </Card>

        <div className="mt-auto grid grid-cols-2 gap-3 pb-6">
          <button onClick={clearOfflineRecords} className="rounded-2xl bg-white py-3 text-sm font-black text-slate-500">
            清空本地
          </button>
          <button onClick={onExit} className="rounded-2xl bg-slate-950 py-3 text-sm font-black text-white">
            回到完整版
          </button>
        </div>
      </div>
    </div>
  );
}

function CycleView({
  records,
  cycle,
  prediction,
  onCycleChange,
}: {
  records: IntimacyRecord[];
  cycle: CycleRecord;
  prediction: CyclePrediction;
  onCycleChange: (cycle: CycleRecord) => void;
}) {
  const monthDays = buildCalendarDays(records);
  const recentRecords = records.slice(0, 4);
  const activeDays = monthDays.filter((day) => day.count > 0).length;
  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="法法日历" subtitle="该记就记，该停就停。日历只负责诚实，不负责嘴硬。" />
      <AdviceCard advice={prediction.todayAdvice} />

      <div className="overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-white/35">cycle forecast</p>
        <h2 className="mt-2 text-2xl font-black">身体天气预报</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">预测只能提醒，不能替代身体感受。疼痛、异常出血或明显不适时，优先咨询医生。</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <InfoPillDark label="活跃天" value={`${activeDays} 天`} />
          <InfoPillDark label="下次" value={prediction.nextPeriodStart.slice(5)} />
          <InfoPillDark label="易孕窗" value={prediction.fertileStart.slice(5)} />
        </div>
      </div>

      <Card title="本月火力图" action="本机视图">
        <div className="grid grid-cols-7 gap-2">
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <div key={day} className="text-center text-[10px] font-black text-slate-400">{day}</div>
          ))}
          {monthDays.map((day) => (
            <div key={day.key} className="flex justify-center">
              {day.day ? (
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${
                  day.count > 0 ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : day.isToday ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-500'
                }`}>
                  {day.day}
                </div>
              ) : <div className="h-9 w-9" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">粉色代表有记录，黑色代表今天。记录多了不是 KPI，身体舒服才算赢。</p>
      </Card>

      <Card title="本次记录" action="可随时修正">
        <div className="grid grid-cols-2 gap-3">
          <InfoPill label="开始" value={cycle.periodStart} />
          <InfoPill label="结束" value={cycle.periodEnd ?? '未填写'} />
          <InfoPill label="平均周期" value={`${cycle.cycleLength} 天`} />
          <InfoPill label="下次预计" value={prediction.nextPeriodStart} />
        </div>
      </Card>

      <Card title="预测窗口" action="非医疗建议">
        <TimelineItem icon={<CalendarIcon size={18} />} title="预计经期" body={`${prediction.nextPeriodStart} 至 ${prediction.nextPeriodEnd}`} />
        <TimelineItem icon={<Siren size={18} />} title="高风险提醒" body={`${prediction.fertileStart} 至 ${prediction.fertileEnd}，别把侥幸当玄学。`} />
      </Card>

      <Card title="日历回放" action={`${recentRecords.length} 条最近记录`}>
        <div className="space-y-3">
          {recentRecords.map((record) => (
            <div key={record.id} className="flex items-center gap-3 rounded-3xl bg-slate-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                <Flame size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-black text-slate-900">{record.occurredAt}</p>
                <p className="mt-1 text-xs text-slate-500">{intimacyTypeLabels[record.type]} · {riskTone[record.riskLevel]}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">{record.rating}/5</span>
            </div>
          ))}
          {recentRecords.length === 0 && <p className="py-5 text-center text-sm text-slate-400">暂无记录。日历先空着，身体别空转。</p>}
        </div>
      </Card>

      <Card title="快速修正" action="Demo 本地保存">
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500">最近经期开始日期</label>
          <input
            type="date"
            value={cycle.periodStart}
            onChange={(event) => onCycleChange({...cycle, periodStart: event.target.value})}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
          />
          <label className="text-xs font-bold text-slate-500">平均周期长度</label>
          <input
            type="number"
            min={20}
            max={45}
            value={cycle.cycleLength}
            onChange={(event) => onCycleChange({...cycle, cycleLength: Number(event.target.value)})}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
          />
        </div>
      </Card>
    </section>
  );
}

function PartnerView({
  partner,
  messages,
  shareWire,
  rejectPhrasePresets,
  onSendMessage,
  onCreateInvite,
  onUnlink,
  onAcceptInvite,
  onAcceptPartnerShare,
  onRejectPartnerShare,
}: {
  partner: PartnerLinkWire;
  messages: PartnerMessage[];
  shareWire: PartnerShareRequestsWire;
  rejectPhrasePresets: ShareRejectPhraseOption[];
  onSendMessage: (phrase: string) => void;
  onCreateInvite: () => Promise<void>;
  onUnlink: () => Promise<void>;
  onAcceptInvite: (inviteCode: string) => Promise<void>;
  onAcceptPartnerShare: (id: string, receiverRating: number) => Promise<void>;
  onRejectPartnerShare: (id: string, phrase: string) => Promise<void>;
}) {
  const linked = partner.status === 'linked';
  const pending = partner.status === 'pending';
  const displayCode = (partner.inviteCode ?? '').trim();
  const messageList = messages ?? [];
  const inbox = shareWire.inbox ?? [];
  const outbox = shareWire.outbox ?? [];
  const [peerInviteInput, setPeerInviteInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareAcceptId, setShareAcceptId] = useState<string | null>(null);
  const [shareAcceptRating, setShareAcceptRating] = useState(4);
  const [shareRejectId, setShareRejectId] = useState<string | null>(null);
  const [shareRejectDraft, setShareRejectDraft] = useState('');
  const [parts, setParts] = useState<Record<PhraseSlot, string>>(() => randomPhraseParts());
  const [partnerShufflePop, setPartnerShufflePop] = useState(0);
  const phrase = `${parts.tone} / ${parts.subject} / ${parts.action} / ${parts.ending}`;
  const title = linked ? '已绑定心动搭子' : pending ? '邀请已生成' : '等待绑定搭子';
  const subtitle = linked
    ? '共享不是偷看，所有记录都要逐项授权。'
    : pending
      ? '把下方邀请码发给对方，对方在「接受邀请」里输入即可完成绑定。'
      : '生成专属邀请码，交给对方确认后再进入同步模式。';

  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="伴侣绑定" subtitle="两个人的事，权限也要两个人确认。" />
      <div className="overflow-hidden rounded-[2rem] border border-white/30 bg-slate-950/95 p-5 text-white shadow-xl shadow-rose-200/30 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white/40">partner link</p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{subtitle}</p>
          </div>
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-rose-200">
            <Heart className={linked ? 'fill-rose-200' : ''} size={28} />
          </div>
        </div>
        <div className="mt-6 rounded-3xl border border-white/20 bg-white p-4 text-slate-950 shadow-inner">
          <p className="text-xs font-black text-slate-400">绑定邀请码</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="break-all font-mono text-3xl font-black tracking-[0.12em] sm:text-4xl">
              {linked ? '——' : displayCode || '待生成'}
            </span>
            <span className="shrink-0 rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-500">
              {linked ? '已确认' : pending ? '待对方' : '未生成'}
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
          <div className="rounded-2xl bg-white/10 p-3">生成邀请码</div>
          <div className="rounded-2xl bg-white/10 p-3">对方确认</div>
          <div className="rounded-2xl bg-white/10 p-3">逐项共享</div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (linked) {
                await onUnlink();
              } else {
                await onCreateInvite();
              }
            } finally {
              setBusy(false);
            }
          }}
          className="mt-5 w-full rounded-2xl bg-white py-3 text-sm font-black text-slate-950 active:scale-[0.99] disabled:opacity-50"
        >
          {linked ? '解除绑定' : pending ? '重新生成并复制' : '生成并复制邀请码'}
        </button>
      </div>

      <Card title="接受对方邀请" action="输入邀请码">
        <div className="space-y-3">
          <input
            value={peerInviteInput}
            onChange={(event) => setPeerInviteInput(event.target.value.toUpperCase())}
            placeholder="对方发你的邀请码"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-lg font-black tracking-[0.12em] outline-none focus:border-rose-300"
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!peerInviteInput.trim()) {
                return;
              }
              setBusy(true);
              try {
                await onAcceptInvite(peerInviteInput.trim());
                setPeerInviteInput('');
              } finally {
                setBusy(false);
              }
            }}
            className="w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            接受邀请并绑定
          </button>
        </div>
      </Card>

      {linked && (
        <Card title="法法同步收件箱" action={`${inbox.length ? `${inbox.length} 条待你` : '暂无待办'}`}>
          <p className="mb-4 text-xs leading-5 text-slate-500">
            在记录里勾选「共享给已绑定伴侣」会发到这里的申请：对方点「接受」后双方才各有一条同步记录；点「拒绝」会通知发起方，且<strong>不会</strong>留下这条共同记录。
          </p>
          {inbox.length === 0 && outbox.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">还没有法法同步申请。</p>
          ) : null}
          <div className="space-y-3">
            {inbox.map((req) => (
              <div key={req.id} className="rounded-3xl border border-rose-100 bg-rose-50/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-rose-500">待你确认</p>
                    <p className="mt-1 text-sm font-black text-slate-900">{req.occurredAt}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {intimacyTypeLabels[req.type]} · {protectionLabels[req.protection]} · Ta 的评分 {req.senderRating}/5
                    </p>
                    <p className="mt-2 text-xs font-semibold leading-relaxed text-violet-900/85">
                      {getPartnerShareInboxBanter(req.senderRole ?? 'switch')}
                    </p>
                  </div>
                </div>
                {shareAcceptId === req.id ? (
                  <div className="mt-4 space-y-3 rounded-2xl bg-white p-3">
                    <p className="text-xs font-black text-slate-500">你的体验评分（会写入你这条同步记录）</p>
                    <div className="flex justify-between rounded-2xl bg-slate-50 px-2 py-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setShareAcceptRating(n)}
                          className={n <= shareAcceptRating ? 'text-rose-500' : 'text-slate-300'}
                        >
                          <Flame className={n <= shareAcceptRating ? 'fill-rose-500' : ''} size={28} />
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={shareBusy}
                        onClick={() => {
                          setShareAcceptId(null);
                        }}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-600 disabled:opacity-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={shareBusy}
                        onClick={async () => {
                          setShareBusy(true);
                          try {
                            await onAcceptPartnerShare(req.id, shareAcceptRating);
                            setShareAcceptId(null);
                          } finally {
                            setShareBusy(false);
                          }
                        }}
                        className="flex-1 rounded-2xl bg-slate-950 py-2.5 text-xs font-black text-white disabled:opacity-50"
                      >
                        确认接受
                      </button>
                    </div>
                  </div>
                ) : shareRejectId === req.id ? (
                  <div className="mt-4 space-y-3 rounded-2xl bg-white p-3">
                    <p className="text-xs font-black text-slate-500">婉拒留言（会发给发起方，可点预设再改）</p>
                    <div className="flex flex-wrap gap-2">
                      {rejectPhrasePresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            const line = [preset.emoji, preset.text].filter(Boolean).join(' ').trim();
                            setShareRejectDraft(Array.from(line).slice(0, 240).join(''));
                          }}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-bold leading-snug text-slate-700 active:bg-slate-100"
                        >
                          {preset.emoji ? `${preset.emoji} ` : ''}
                          {preset.text}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={shareRejectDraft}
                      onChange={(event) => {
                        const next = Array.from(event.target.value).slice(0, 240).join('');
                        setShareRejectDraft(next);
                      }}
                      rows={3}
                      placeholder="选一句或自己写，支持 emoji"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-rose-300"
                    />
                    <p className="text-right text-[10px] font-bold text-slate-400">{[...shareRejectDraft].length}/240</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={shareBusy}
                        onClick={() => {
                          setShareRejectId(null);
                          setShareRejectDraft('');
                        }}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-600 disabled:opacity-50"
                      >
                        返回
                      </button>
                      <button
                        type="button"
                        disabled={shareBusy}
                        onClick={async () => {
                          const trimmed = shareRejectDraft.trim();
                          if (!trimmed) {
                            return;
                          }
                          setShareBusy(true);
                          try {
                            await onRejectPartnerShare(req.id, trimmed);
                            setShareRejectId(null);
                            setShareRejectDraft('');
                          } finally {
                            setShareBusy(false);
                          }
                        }}
                        className="flex-1 rounded-2xl bg-rose-500 py-2.5 text-xs font-black text-white disabled:opacity-50"
                      >
                        发送婉拒
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={shareBusy}
                      onClick={() => {
                        setShareRejectId(null);
                        setShareRejectDraft('');
                        setShareAcceptId(req.id);
                        setShareAcceptRating(4);
                      }}
                      className="flex-1 rounded-2xl bg-slate-950 py-2.5 text-xs font-black text-white disabled:opacity-50"
                    >
                      接受
                    </button>
                    <button
                      type="button"
                      disabled={shareBusy}
                      onClick={() => {
                        setShareAcceptId(null);
                        setShareRejectId(req.id);
                        setShareRejectDraft('');
                      }}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-black text-slate-700 disabled:opacity-50"
                    >
                      拒绝
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {outbox.length > 0 ? (
            <div className="mt-5 space-y-2">
              <p className="text-xs font-black text-slate-400">我发出的申请</p>
              {outbox.map((req) => {
                const statusLabel =
                  req.status === 'pending' ? '等待对方确认' : req.status === 'accepted' ? '对方已接受' : '对方已婉拒';
                return (
                  <div key={req.id} className="rounded-3xl bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{req.occurredAt}</p>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-slate-500">{statusLabel}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {intimacyTypeLabels[req.type]} · 我的评分 {req.senderRating}/5
                      {typeof req.receiverRating === 'number' ? ` · Ta ${req.receiverRating}/5` : ''}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{getPartnerShareOutboxBanter(req.senderRole ?? 'switch')}</p>
                    {req.status === 'rejected' && req.rejectionPhrase ? (
                      <p className="mt-2 text-xs font-semibold text-rose-600">Ta 的留言：{req.rejectionPhrase}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      )}

      <Card title="伴侣守则" action="默认开启">
        <TimelineItem icon={<CheckCircle2 size={18} />} title="明确同意" body="任何一方说停，就停。气氛不是通行证。" />
        <TimelineItem icon={<ShieldCheck size={18} />} title="保护优先" body="风险窗口、无保护、状态不清醒时，系统会严厉一点。" />
        <TimelineItem icon={<Lock size={18} />} title="隐私边界" body="亲密记录默认只属于本人，共享需要明确开关。" />
      </Card>

      <Card title="共享权限" action="逐项授权">
        <div className="grid grid-cols-2 gap-3">
          <PermissionTile active={linked} title="共享最近记录" body="只同步你主动勾选的记录" />
          <PermissionTile active={false} title="共享周期提醒" body="默认关闭，避免越界关心" />
          <PermissionTile active={linked} title="伴侣留言箱" body="只允许预设短句，不开放自由聊" />
          <PermissionTile active={false} title="位置与通讯录" body="不采集，也不需要" />
        </div>
      </Card>

      <Card title="给伴侣发一句" action="预设短句">
        <div className="relative space-y-4 overflow-hidden rounded-[1.5rem] border border-rose-100/80 bg-gradient-to-br from-[#fff7fb] via-[#f8f4ff] to-[#eefcff] p-3 ring-1 ring-white/80">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute right-2 top-1 text-2xl opacity-20"
            animate={{y: [0, -4, 0]}}
            transition={{duration: 3.5, repeat: Infinity, ease: 'easeInOut'}}
          >
            💌
          </motion.div>
          <div className="rounded-2xl bg-gradient-to-r from-rose-200/70 via-violet-200/60 to-sky-200/70 p-[1.5px] shadow-sm">
            <div className="rounded-[0.9rem] bg-white/90 px-3 py-3 backdrop-blur-sm">
              <motion.p
                key={phrase}
                initial={{opacity: 0.75, y: 6, scale: 0.99}}
                animate={{opacity: 1, y: 0, scale: 1}}
                transition={{type: 'spring', stiffness: 400, damping: 24}}
                className="text-center text-sm font-bold leading-relaxed text-slate-800"
              >
                {phrase}
              </motion.p>
            </div>
          </div>
          <PhraseSelect slot="tone" label="语气" value={parts.tone} values={phraseBook.tones} onChange={(tone) => setParts((prev) => ({...prev, tone}))} />
          <PhraseSelect slot="subject" label="主语" value={parts.subject} values={phraseBook.subjects} onChange={(subject) => setParts((prev) => ({...prev, subject}))} />
          <PhraseSelect slot="action" label="动作" value={parts.action} values={phraseBook.actions} onChange={(action) => setParts((prev) => ({...prev, action}))} />
          <PhraseSelect slot="ending" label="收尾" value={parts.ending} values={phraseBook.endings} onChange={(ending) => setParts((prev) => ({...prev, ending}))} />
          <motion.button
            type="button"
            onClick={() => {
              setParts(randomPhraseParts());
              setPartnerShufflePop((n) => n + 1);
            }}
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.97}}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/80 bg-white/90 py-3 text-sm font-black text-violet-800 shadow-sm"
          >
            <motion.span
              key={partnerShufflePop}
              initial={{rotate: -45, scale: 0.75}}
              animate={{rotate: 0, scale: 1}}
              transition={{type: 'spring', stiffness: 480, damping: 14}}
              className="inline-flex text-violet-600"
            >
              <RefreshCw size={16} />
            </motion.span>
            随机来一句
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSendMessage(phrase)}
            whileHover={{scale: 1.02}}
            whileTap={{scale: 0.97}}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 py-3 text-sm font-black text-white shadow-md shadow-rose-300/40"
          >
            <Sparkles size={16} className="shrink-0" />
            发送给伴侣
          </motion.button>
        </div>
      </Card>

      <Card title="伴侣留言箱" action={`${messageList.length} 条`}>
        <div className="space-y-3">
          {messageList.map((message) => (
            <div key={message.id} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-600">{message.authorNickname?.trim() || '未设置'}</p>
              <p className="mt-1 text-xs font-bold text-slate-400">{message.createdAt}</p>
              <p className="mt-2 text-sm font-black leading-6 text-slate-800">{message.phrase}</p>
            </div>
          ))}
          {messageList.length === 0 && <p className="py-5 text-center text-sm text-slate-400">还没有留言。沉默可以，但别全靠猜。</p>}
        </div>
      </Card>
    </section>
  );
}

function SquareView({
  posts,
  onPublish,
  onResonate,
  onReport,
  onBlock,
}: {
  posts: SocialPost[];
  onPublish: (phrase: string) => void;
  onResonate: (id: string) => void;
  onReport: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  type SquareSheet = 'write' | 'compose' | 'more' | null;
  const [sheet, setSheet] = useState<SquareSheet>(null);
  const [draft, setDraft] = useState('');
  const [menuPostId, setMenuPostId] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchCard | null>(matchSeed);
  const totalResonance = useMemo(() => posts.reduce((sum, post) => sum + post.resonanceCount, 0), [posts]);
  const maxChars = 320;

  useEffect(() => {
    if (!menuPostId) return;
    const onPointerDown = () => setMenuPostId(null);
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuPostId]);

  const shakeMatch = () => {
    api.shake()
      .then(setMatch)
      .catch(() =>
        setMatch({
          ...matchSeed,
          id: `match-${Date.now()}`,
          phrase: `${randomItem(phraseBook.tones)} / ${randomItem(phraseBook.subjects)} / ${randomItem(phraseBook.actions)} / ${randomItem(phraseBook.endings)}`,
        }),
      );
  };

  const closeSheet = () => {
    setSheet(null);
    setDraft('');
  };

  const submitWrite = () => {
    const clipped = Array.from(draft.trim()).slice(0, maxChars).join('');
    if (!clipped) return;
    onPublish(clipped);
    closeSheet();
  };

  const draftRunes = [...draft].length;

  return (
    <>
      <section className="space-y-3 p-5 pt-6 pb-32">
        {posts.length === 0 ? (
          <p className="py-20 text-center text-sm text-slate-400">还没有留言。点下面写一句，或从预设拼一句。</p>
        ) : (
          posts.map((post) => (
            <article
              key={post.id}
              className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 shadow-sm backdrop-blur-md"
            >
              <div className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
                  {(post.authorAlias || '?').slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-xs font-bold text-slate-400">{post.authorAlias}</p>
                    <button
                      type="button"
                      aria-label="更多"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuPostId((id) => (id === post.id ? null : post.id));
                      }}
                      className="shrink-0 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                  {menuPostId === post.id && (
                    <div
                      className="mt-2 flex flex-wrap gap-1.5"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onReport(post.id);
                          setMenuPostId(null);
                        }}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-black ${post.reported ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {post.reported ? '已举报' : '举报'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onBlock(post.id);
                          setMenuPostId(null);
                        }}
                        className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white"
                      >
                        屏蔽
                      </button>
                    </div>
                  )}
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] font-semibold leading-relaxed text-slate-800">
                    {post.phrase}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs font-bold text-slate-400">
                    <button
                      type="button"
                      onClick={() => onResonate(post.id)}
                      className="inline-flex items-center gap-1 rounded-full text-rose-500 hover:text-rose-600"
                    >
                      <Heart size={14} className="shrink-0" />
                      {post.resonanceCount}
                    </button>
                    <span className="tabular-nums">{post.createdAt}</span>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <div className="pointer-events-none fixed bottom-0 left-1/2 z-[25] flex w-full max-w-[430px] -translate-x-1/2 justify-center px-3 pb-[calc(env(safe-area-inset-bottom,0px)+5.25rem)] pt-2">
        <div className="pointer-events-auto flex w-full gap-1.5 rounded-2xl border border-white/70 bg-white/90 p-1.5 shadow-lg backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setMenuPostId(null);
              setSheet('write');
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50"
          >
            <PenLine size={16} />
            写一句
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuPostId(null);
              setSheet('compose');
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50"
          >
            <Sparkles size={16} />
            拼句
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuPostId(null);
              setSheet('more');
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50"
          >
            <MoreHorizontal size={16} />
            更多
          </button>
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              key="square-sheet-bg"
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              className="fixed inset-3 z-40 rounded-2xl bg-slate-950/35 backdrop-blur-[2px] sm:inset-4"
              onClick={closeSheet}
            />
            <motion.div
              key="square-sheet-panel"
              initial={{y: '105%'}}
              animate={{y: 0}}
              exit={{y: '105%'}}
              transition={{type: 'spring', damping: 30, stiffness: 320}}
              className="fixed bottom-3 left-1/2 z-50 flex max-h-[min(88dvh,calc(100dvh-2rem))] w-[min(430px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_12px_48px_rgba(15,23,42,0.14)] sm:bottom-4"
            >
              <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-slate-200" />
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-4">
                {sheet === 'write' && (
                  <div className="space-y-3">
                    <h2 className="text-lg font-black text-slate-900">写一句</h2>
                    <p className="text-xs font-semibold text-slate-500">系统键盘可输入 emoji。轻量发言，最多 {maxChars} 字。</p>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(Array.from(e.target.value).slice(0, maxChars).join(''))}
                      rows={5}
                      placeholder="今天想留一句…"
                      className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[15px] font-semibold leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>
                        {draftRunes}/{maxChars}
                      </span>
                      <button
                        type="button"
                        onClick={submitWrite}
                        disabled={!draft.trim()}
                        className="rounded-full bg-rose-500 px-5 py-2 text-xs font-black text-white disabled:opacity-40"
                      >
                        发布
                      </button>
                    </div>
                  </div>
                )}
                {sheet === 'compose' && (
                  <div className="space-y-2">
                    <h2 className="text-lg font-black text-slate-900">预设拼句</h2>
                    <PhraseComposer
                      variant="plain"
                      onPublish={(phrase) => {
                        onPublish(phrase);
                        closeSheet();
                      }}
                    />
                  </div>
                )}
                {sheet === 'more' && (
                  <div className="space-y-4 pb-2">
                    <h2 className="text-lg font-black text-slate-900">更多</h2>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      广场只做轻展示：共鸣在卡片上点心形；举报与屏蔽在每条右上角菜单。留言 {posts.length} 条，累计共鸣 {totalResonance}。
                    </p>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      {match ? (
                        <>
                          <p className="text-xs font-bold text-slate-400">摇一摇 · {match.alias}</p>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-800">{match.phrase}</p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">暂无匹配。</p>
                      )}
                      <button
                        type="button"
                        onClick={shakeMatch}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-black text-slate-800"
                      >
                        <RefreshCw size={16} />
                        摇一下
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0 border-t border-slate-100 px-5 py-3">
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-full rounded-xl py-2.5 text-sm font-black text-slate-500 hover:bg-slate-50"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ProfileView({
  profile,
  records,
  onSaveUsername,
  onSaveSquareAlias,
  onRoleChange,
  onPrivacyLockChange,
  onExportData,
  onDeleteAccount,
  onLogout,
}: {
  profile: UserProfile;
  records: IntimacyRecord[];
  onSaveUsername: (nickname: string) => void;
  onSaveSquareAlias: (squareAlias: string) => void;
  onRoleChange: (role: UserRole) => void;
  onPrivacyLockChange: (privacyLock: boolean) => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
}) {
  const [usernameDraft, setUsernameDraft] = useState(profile.nickname);
  const [squareDraft, setSquareDraft] = useState(profile.squareAlias ?? '');
  useEffect(() => {
    setUsernameDraft(profile.nickname);
  }, [profile.nickname]);
  useEffect(() => {
    setSquareDraft(profile.squareAlias ?? '');
  }, [profile.squareAlias]);

  const displayName = profile.nickname?.trim() || '未设置用户名';

  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="我的" subtitle="成年人的体面，是知道什么时候该认真。" />
      <Card title={displayName} action="成年确认已完成">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-rose-400 to-pink-500 text-xl font-black text-white shadow-lg">
            法
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900">{roleLabels[profile.role]}</p>
            {profile.email && <p className="mt-1 text-xs font-semibold text-slate-500">{profile.email}</p>}
            <p className="mt-1 text-sm text-slate-500">累计 {records.length} 条私密记录</p>
          </div>
          <ChevronRight className="text-slate-300" />
        </div>
      </Card>

      <Card title="称呼与身份" action="广场与伴侣分开">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-black text-slate-500">用户名（仅自己与伴侣可见）</p>
            <input
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(Array.from(e.target.value).slice(0, 32).join(''))}
              placeholder="例如：家里用的名字"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
            />
            <button
              type="button"
              onClick={() => onSaveUsername(usernameDraft)}
              className="mt-2 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white"
            >
              保存用户名
            </button>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-black text-slate-500">匿名广场身份（对外展示，可与用户名不同）</p>
            <input
              value={squareDraft}
              onChange={(e) => setSquareDraft(Array.from(e.target.value).slice(0, 24).join(''))}
              placeholder="例如：匿名嘴硬人"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-400">留空则服务端会生成默认匿名前缀。最多 24 字。</p>
            <button
              type="button"
              onClick={() => onSaveSquareAlias(squareDraft)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-800"
            >
              保存广场身份
            </button>
          </div>
        </div>
      </Card>

      <Card title="角色偏好" action="只是偏好，不是标签">
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
          {(['initiator', 'receiver', 'switch'] as UserRole[]).map((role) => (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`rounded-xl px-2 py-2 text-xs font-black transition ${
                profile.role === role ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'
              }`}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </Card>

      <Card title="隐私开关" action="默认谨慎">
        <div className="space-y-3">
          <ToggleRow
            checked={profile.privacyLock ?? true}
            label="打开隐私锁提示"
            onChange={onPrivacyLockChange}
          />
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-800">数据只属于你</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">导出会生成本地 JSON 文件；删除账号会清空后端记录和伴侣关系。别怕，跑路也要体面。</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onExportData} className="rounded-2xl bg-slate-950 py-3 text-sm font-black text-white">导出数据</button>
            <button onClick={onDeleteAccount} className="rounded-2xl bg-rose-50 py-3 text-sm font-black text-rose-600">删除账号</button>
          </div>
          <button type="button" onClick={onLogout} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-600">
            退出登录
          </button>
        </div>
      </Card>

      <Card title="健康小抄" action="三张先够用">
        <div className="space-y-3">
          {knowledgeCards.map((card) => (
            <div key={card.id} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-black text-rose-500">{card.category}</p>
              <h3 className="mt-1 font-black text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{card.body}</p>
              <p className="mt-2 text-xs font-bold text-slate-400">{card.tone}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="合规与隐私" action="上架必备">
        <MenuLink href="/privacy" icon={<Lock size={18} />} label="隐私政策" />
        <MenuLink href="/terms" icon={<BookOpen size={18} />} label="服务条款" />
        <MenuLink href="/delete-account" icon={<Siren size={18} />} label="删除账号与数据" />
        <MenuLink href="/support" icon={<MessageCircle size={18} />} label="App Store 支持页" />
      </Card>
    </section>
  );
}

type RecordDraft = Pick<
  IntimacyRecord,
  'type' | 'protection' | 'consentChecked' | 'sharedWithPartner' | 'rating'
>;

function RecordSheet({
  isOpen,
  advice,
  partnerLinked,
  topBanter,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  advice: HealthAdvice;
  partnerLinked?: boolean;
  topBanter?: string | null;
  onClose: () => void;
  onSave: (draft: RecordDraft) => void;
}) {
  const [type, setType] = useState<IntimacyType>('penetrative');
  const [protection, setProtection] = useState<ProtectionMethod>('condom');
  const [rating, setRating] = useState(4);
  const [consentChecked, setConsentChecked] = useState(true);
  const [sharedWithPartner, setSharedWithPartner] = useState(false);
  const linked = Boolean(partnerLinked);
  const shareMode = linked && sharedWithPartner;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            animate={{opacity: 1}}
            className="absolute inset-2 z-40 rounded-2xl bg-slate-950/40 backdrop-blur-sm sm:inset-3"
            exit={{opacity: 0}}
            initial={{opacity: 0}}
            onClick={onClose}
          />
          <motion.div
            animate={{y: 0}}
            className="absolute bottom-2 left-2 right-2 z-50 flex max-h-[min(84dvh,calc(100%-1rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:bottom-3 sm:left-3 sm:right-3"
            exit={{y: '100%'}}
            initial={{y: '100%'}}
            transition={{type: 'spring', damping: 28, stiffness: 300}}
          >
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">记录这次亲密</h2>
                <p className="mt-1 text-xs text-slate-400">数据归你，羞耻心先下班。</p>
              </div>
              <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {topBanter ? (
                <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/80 px-4 py-3 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700/80">安全员插播</p>
                  <p className="mt-1.5 text-sm font-bold leading-relaxed text-amber-950">{topBanter}</p>
                </div>
              ) : null}
              <AdviceCard advice={advice} compact />
              <OptionGroup<IntimacyType>
                label="亲密类型"
                options={Object.keys(intimacyTypeLabels) as IntimacyType[]}
                value={type}
                labels={intimacyTypeLabels}
                onChange={setType}
              />
              <OptionGroup<ProtectionMethod>
                label="保护方式"
                options={Object.keys(protectionLabels) as ProtectionMethod[]}
                value={protection}
                labels={protectionLabels}
                onChange={setProtection}
              />
              <div>
                <p className="mb-3 text-sm font-black text-slate-700">体验评分</p>
                <div className="flex justify-between rounded-3xl bg-slate-50 p-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <button
                      key={item}
                      onClick={() => setRating(item)}
                      className={item <= rating ? 'text-rose-500' : 'text-slate-300'}
                    >
                      <Flame className={item <= rating ? 'fill-rose-500' : ''} size={34} />
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow checked={consentChecked} label="双方明确同意" onChange={setConsentChecked} />
              <ToggleRow
                checked={sharedWithPartner}
                label="共享给已绑定伴侣"
                disabled={!linked && !sharedWithPartner}
                onChange={setSharedWithPartner}
              />
              {!linked ? (
                <p className="text-xs leading-5 text-amber-700">绑定伴侣后，才能向对方发起「法法同步」申请（对方需在收件箱确认）。</p>
              ) : null}
              {linked && sharedWithPartner ? (
                <p className="text-xs leading-5 text-slate-500">
                  不会立刻写入双方记录：对方在「伴侣 → 法法同步收件箱」接受后，才会各自生成一条带评分的同步记录。
                </p>
              ) : null}
            </div>
            <div className="ios-safe-bottom border-t border-slate-100 bg-white p-6">
              <button
                onClick={() => onSave({type, protection, rating, consentChecked, sharedWithPartner})}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-black text-white active:scale-[0.99]"
              >
                {shareMode ? <Send size={22} /> : <CheckCircle2 size={22} />}
                {shareMode ? '发送同步申请' : '保存记录'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PhraseComposer({
  onPublish,
  variant = 'card',
}: {
  onPublish: (phrase: string) => void;
  variant?: 'card' | 'plain';
}) {
  const [parts, setParts] = useState<Record<PhraseSlot, string>>(() => randomPhraseParts());
  const [shufflePop, setShufflePop] = useState(0);
  const phrase = `${parts.tone} / ${parts.subject} / ${parts.action} / ${parts.ending}`;

  const mixer = (
    <div className="relative space-y-5 overflow-hidden rounded-[1.75rem] border border-white/60 bg-gradient-to-br from-[#fff7fb] via-[#f5f0ff] to-[#ecfeff] p-4 shadow-inner ring-1 ring-rose-100/60">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-6 -top-8 text-4xl opacity-[0.18]"
        animate={{y: [0, -5, 0], rotate: [-6, 6, -6]}}
        transition={{duration: 5, repeat: Infinity, ease: 'easeInOut'}}
      >
        🫧
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-4 right-2 text-3xl opacity-20"
        animate={{y: [0, 6, 0], x: [0, 4, 0]}}
        transition={{duration: 4.2, repeat: Infinity, ease: 'easeInOut'}}
      >
        ✿
      </motion.div>

      <div className="relative mx-auto max-w-full">
        <div className="rounded-[1.35rem] bg-gradient-to-r from-rose-200/80 via-violet-200/70 to-amber-200/70 p-[1.5px] shadow-md shadow-rose-200/40">
          <div className="relative overflow-hidden rounded-[1.28rem] bg-white/88 px-4 py-4 backdrop-blur-md">
            <motion.p
              key={phrase}
              initial={{opacity: 0.75, y: 8, scale: 0.985}}
              animate={{opacity: 1, y: 0, scale: 1}}
              transition={{type: 'spring', stiffness: 420, damping: 26}}
              className="text-center text-sm font-bold leading-relaxed text-slate-800"
            >
              {phrase}
            </motion.p>
            <motion.p
              className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.35em] text-rose-400/90"
              animate={{opacity: [0.65, 1, 0.65]}}
              transition={{duration: 2.4, repeat: Infinity}}
            >
              实时预览
            </motion.p>
          </div>
        </div>
      </div>

      <p className="relative text-center text-[11px] font-semibold leading-relaxed text-slate-500">
        {variant === 'plain'
          ? '点点下面的小糖豆拼一句，懒得打字正好～'
          : '像搭乐高一样拼句子：点一下，句子会轻轻蹦一下。'}
      </p>

      <div className="relative space-y-4">
        <PhraseSelect slot="tone" label="语气" value={parts.tone} values={phraseBook.tones} onChange={(tone) => setParts((prev) => ({...prev, tone}))} />
        <PhraseSelect slot="subject" label="主语" value={parts.subject} values={phraseBook.subjects} onChange={(subject) => setParts((prev) => ({...prev, subject}))} />
        <PhraseSelect slot="action" label="动作" value={parts.action} values={phraseBook.actions} onChange={(action) => setParts((prev) => ({...prev, action}))} />
        <PhraseSelect slot="ending" label="收尾" value={parts.ending} values={phraseBook.endings} onChange={(ending) => setParts((prev) => ({...prev, ending}))} />
      </div>

      <div className="relative flex flex-col gap-2.5">
        <motion.button
          type="button"
          onClick={() => {
            setParts(randomPhraseParts());
            setShufflePop((n) => n + 1);
          }}
          whileHover={{scale: 1.02}}
          whileTap={{scale: 0.97}}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200/80 bg-white/90 py-3.5 text-sm font-black text-violet-800 shadow-sm backdrop-blur-sm"
        >
          <motion.span
            key={shufflePop}
            initial={{rotate: -50, scale: 0.7}}
            animate={{rotate: 0, scale: 1}}
            transition={{type: 'spring', stiffness: 460, damping: 12}}
            className="inline-flex text-violet-600"
          >
            <RefreshCw size={17} />
          </motion.span>
          随机重组一句
        </motion.button>
        <motion.button
          type="button"
          onClick={() => onPublish(phrase)}
          whileHover={{scale: 1.02}}
          whileTap={{scale: 0.97}}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-300/50"
        >
          <motion.span
            animate={{rotate: [0, 14, -10, 0]}}
            transition={{duration: 2.2, repeat: Infinity, ease: 'easeInOut'}}
            className="inline-flex"
          >
            <Sparkles size={17} />
          </motion.span>
          {variant === 'plain' ? '发布这句' : '发布到匿名广场'}
        </motion.button>
      </div>
    </div>
  );

  if (variant === 'plain') {
    return mixer;
  }

  return (
    <Card title="预设拼句" action="模板糖豆">
      {mixer}
    </Card>
  );
}

function PublicPage({path}: {path: string}) {
  const page = publicPages[path] ?? publicPages['/'];
  return (
    <main className="min-h-screen bg-[#F2F2F7] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <img src="/logo.png" alt={brand.name} width={64} height={64} className="h-16 w-16 shrink-0 rounded-2xl bg-white object-cover shadow-sm ring-1 ring-slate-100" />
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-900">{brand.name}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{brand.slogan}</p>
          </div>
        </div>
        <a href="/app" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-rose-500 shadow-sm">
          <Sparkles size={16} />
          打开 {brand.name}
        </a>
        <section className="rounded-[2rem] bg-white p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-500">{page.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">{page.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{page.description}</p>
        </section>
        {page.sections.map((section) => (
          <section key={section.title} className="rounded-[2rem] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">{section.title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}

const publicPages: Record<string, {eyebrow: string; title: string; description: string; sections: {title: string; body: string}[]}> = {
  '/': {
    eyebrow: 'landing',
    title: '法了么：亲密生活的幽默安全员',
    description: brand.promise,
    sections: [
      {title: '核心功能', body: '私密记录、伴侣绑定、经期预测、健康知识、预设短句轻社交。'},
      {title: '内容边界', body: '不提供色情内容，不开放自由文本陌生聊天，不服务未成年人。'},
    ],
  },
  '/privacy': {
    eyebrow: 'privacy',
    title: '隐私政策',
    description: '亲密数据默认私密，伴侣共享需要明确授权。',
    sections: [
      {title: '我们收集什么', body: '账号信息、成年确认、亲密记录、周期记录、应用使用偏好和举报记录。'},
      {title: '我们如何使用', body: '用于提供记录、预测、伴侣共享、健康提醒、内容治理和账号安全。不会出售个人亲密数据。'},
      {title: '你的权利', body: '你可以导出、删除账号和数据，也可以随时关闭伴侣共享。'},
    ],
  },
  '/terms': {
    eyebrow: 'terms',
    title: '服务条款',
    description: '成年人可以幽默，但需要尊重同意、隐私和法律。',
    sections: [
      {title: '年龄限制', body: '本服务仅面向成年人。未成年人不得注册或使用。'},
      {title: '禁止行为', body: '禁止骚扰、未成年人相关内容、非自愿内容、色情交易、仇恨或违法内容。'},
      {title: '健康说明', body: '应用提供教育和提醒，不构成医疗诊断或治疗建议。'},
    ],
  },
  '/support': {
    eyebrow: 'support',
    title: 'App Store 支持',
    description: '遇到问题，先别上头，来这里找帮助。',
    sections: [
      {title: '联系方式', body: '支持邮箱：support@example.com。正式部署时请替换为你的域名邮箱。'},
      {title: '常见问题', body: '忘记密码、解绑伴侣、删除账号、举报内容、周期预测不准，都可以在设置中处理。'},
    ],
  },
  '/delete-account': {
    eyebrow: 'data deletion',
    title: '删除账号与数据',
    description: '你可以删除账号及相关亲密记录、周期记录、伴侣关系和社交内容。',
    sections: [
      {title: '删除方式', body: '在 App 的“我的 - 合规与隐私 - 删除账号”发起；也可以联系支持邮箱。'},
      {title: '处理周期', body: '验证身份后将在合理期限内删除可识别个人数据，法律要求保留的安全审计记录除外。'},
    ],
  },
};

function TabItem({icon, label, active, onClick}: {icon: React.ReactNode; label: string; active: boolean; onClick: () => void}) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold ${active ? 'text-rose-500' : 'text-slate-400'}`}>
      {icon}
      {label}
    </button>
  );
}

function Card({title, action, children}: {title: string; action?: string; children: React.ReactNode}) {
  return (
    <section className="rounded-[1.75rem] border border-white/60 bg-white/75 p-5 shadow-sm shadow-rose-100/30 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-black text-slate-950">{title}</h2>
        {action && <span className="text-xs font-bold text-slate-400">{action}</span>}
      </div>
      {children}
    </section>
  );
}

function PageTitle({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <header>
      <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
    </header>
  );
}

function AdviceCard({advice, compact}: {advice: HealthAdvice; compact?: boolean}) {
  return (
    <div className={`rounded-[1.75rem] border p-5 ${advice.level === 'high' ? 'border-red-100 bg-red-50' : advice.level === 'medium' ? 'border-amber-100 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
      <div className="flex gap-3">
        <div className="mt-0.5 text-slate-900">{advice.level === 'high' ? <Siren size={22} /> : <ShieldCheck size={22} />}</div>
        <div>
          <p className="font-black text-slate-950">{advice.title}</p>
          <p className={`mt-1 text-sm leading-6 text-slate-600 ${compact ? 'line-clamp-2' : ''}`}>{advice.body}</p>
          {!compact && <p className="mt-2 text-xs font-black text-slate-500">{advice.action}</p>}
        </div>
      </div>
    </div>
  );
}

function MetricCard({label, value, suffix, icon}: {label: string; value: string; suffix: string; icon: React.ReactNode}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">{icon}</div>
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-950">
        {value}
        <span className="ml-1 text-xs text-slate-400">{suffix}</span>
      </p>
    </div>
  );
}

function HeroPill({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-xl">
      <p className="text-[10px] font-black text-white/50">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ChecklistRow({done, title, body}: {done: boolean; title: string; body: string}) {
  return (
    <div className="flex gap-3 rounded-3xl bg-slate-50 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
        {done ? <CheckCircle2 size={20} /> : <Siren size={20} />}
      </div>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function PermissionTile({active, title, body}: {active: boolean; title: string; body: string}) {
  return (
    <div className={`rounded-3xl p-4 ${active ? 'bg-rose-50' : 'bg-slate-50'}`}>
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-2xl ${active ? 'bg-rose-500 text-white' : 'bg-white text-slate-400'}`}>
        {active ? <CheckCircle2 size={18} /> : <Lock size={18} />}
      </div>
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
    </div>
  );
}

function renderRecordRow(record: IntimacyRecord, onDelete?: (id: string) => void) {
  return (
    <div key={record.id} className="flex items-center justify-between rounded-3xl bg-slate-50 p-4">
      <div>
        <p className="text-sm font-black text-slate-900">{record.occurredAt}</p>
        <p className="mt-1 text-xs text-slate-500">
          {intimacyTypeLabels[record.type]} · {protectionLabels[record.protection]} · {riskTone[record.riskLevel]}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-500">{record.rating}/5</span>
        {onDelete && (
          <button onClick={() => onDelete(record.id)} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-500">
            删除
          </button>
        )}
      </div>
    </div>
  );
}

function InfoPill({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoPillDark({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs font-bold text-white/40">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function buildCalendarDays(records: IntimacyRecord[]) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const counts = records.reduce<Record<string, number>>((acc, record) => {
    acc[record.occurredAt] = (acc[record.occurredAt] ?? 0) + 1;
    return acc;
  }, {});
  const blanks = Array.from({length: firstDay}, (_, index) => ({key: `blank-${index}`, day: 0, count: 0, isToday: false}));
  const days = Array.from({length: daysInMonth}, (_, index) => {
    const day = index + 1;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {key: date, day, count: counts[date] ?? 0, isToday: date === isoDate(now)};
  });
  return [...blanks, ...days];
}

function TimelineItem({icon, title, body}: {icon: React.ReactNode; title: string; body: string}) {
  return (
    <div className="mb-3 flex gap-3 last:mb-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{icon}</div>
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
      </div>
    </div>
  );
}

function MenuLink({href, icon, label}: {href: string; icon: React.ReactNode; label: string}) {
  return (
    <a href={href} className="flex items-center justify-between border-b border-slate-50 py-3 last:border-0">
      <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
        <span className="text-rose-500">{icon}</span>
        {label}
      </span>
      <ChevronRight className="text-slate-300" size={18} />
    </a>
  );
}

function ToggleRow({
  checked,
  label,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onChange(!checked);
        }
      }}
      className={`flex w-full items-center justify-between rounded-3xl bg-slate-50 p-4 text-left ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <span className="text-sm font-black text-slate-800">{label}</span>
      <span className={`h-7 w-12 rounded-full p-1 transition ${checked ? 'bg-rose-500' : 'bg-slate-300'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white transition ${checked ? 'translate-x-5' : ''}`} />
      </span>
    </button>
  );
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-black text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-bold ${value === option ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

const phraseSlotStagger: Record<PhraseSlot, number> = {
  tone: 0,
  subject: 0.06,
  action: 0.11,
  ending: 0.16,
};

function PhraseSelect({
  slot,
  label,
  value,
  values,
  onChange,
}: {
  slot: PhraseSlot;
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  const options = values ?? [];
  const meta = phraseSlotUI[slot];
  const delay = phraseSlotStagger[slot] ?? 0;

  return (
    <motion.div
      className="relative block rounded-2xl border border-white/70 bg-white/50 p-3 shadow-sm backdrop-blur-sm"
      initial={{opacity: 0, y: 14}}
      animate={{opacity: 1, y: 0}}
      transition={{type: 'spring', stiffness: 300, damping: 26, delay}}
    >
      <div className="mb-2.5 flex items-start gap-2">
        <motion.span
          className="select-none text-xl leading-none"
          aria-hidden
          animate={{y: [0, -3, 0]}}
          transition={{duration: 2.2 + delay, repeat: Infinity, ease: 'easeInOut'}}
        >
          {meta.emoji}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="text-[11px] font-semibold text-slate-500">{meta.blurb}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const selected = item === value;
          return (
            <motion.button
              key={item}
              type="button"
              layout
              whileHover={{y: -2, scale: 1.04}}
              whileTap={{scale: 0.93}}
              transition={{type: 'spring', stiffness: 400, damping: 22}}
              onClick={() => onChange(item)}
              className={`max-w-full rounded-2xl border px-3 py-2 text-left text-[11px] font-bold leading-snug transition-colors sm:text-xs ${
                selected ? `${meta.active} ${meta.glow}` : meta.idle
              }`}
            >
              {item}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function predictCycle(cycle: CycleRecord, records: IntimacyRecord[]): CyclePrediction {
  const start = new Date(cycle.periodStart);
  const nextStart = addDays(start, cycle.cycleLength);
  const nextEnd = addDays(nextStart, 5);
  const fertileStart = addDays(nextStart, -15);
  const fertileEnd = addDays(nextStart, -10);
  const now = new Date(isoDate(new Date()));
  const inPeriod = now >= nextStart && now <= nextEnd;
  const inFertile = now >= fertileStart && now <= fertileEnd;
  const tooFrequent = recordCountOnRecentUtcDays(records, new Date(), 2) >= 2;
  let todayAdvice = defaultAdvice;

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

function buildStats(records: IntimacyRecord[]) {
  const month = isoDate(new Date()).slice(0, 7);
  const monthRecords = records.filter((record) => record.occurredAt.startsWith(month));
  const safeRecords = records.filter((record) => record.protection !== 'none');
  return {
    monthCount: monthRecords.length,
    safeRate: records.length ? Math.round((safeRecords.length / records.length) * 100) : 0,
    partnerShared: records.filter((record) => record.sharedWithPartner).length,
  };
}

function calculateRisk(protection: ProtectionMethod, type: IntimacyType, cycleRisk: RiskLevel): RiskLevel {
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

function buildTags(draft: RecordDraft, riskLevel: RiskLevel) {
  return [
    intimacyTypeLabels[draft.type],
    protectionLabels[draft.protection],
    draft.consentChecked ? '同意明确' : '同意待确认',
    riskTone[riskLevel],
  ];
}

/** Count records whose occurredAt (UTC yyyy-MM-dd) falls within the last `daySpan` UTC calendar days ending at `anchor`. */
function recordCountOnRecentUtcDays(records: IntimacyRecord[], anchor: Date, daySpan: number): number {
  if (daySpan < 1 || records.length === 0) return 0;
  const allowed = new Set<string>();
  for (let i = 0; i < daySpan; i++) {
    const d = new Date(anchor.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    allowed.add(isoDate(d));
  }
  return records.filter((r) => allowed.has(r.occurredAt)).length;
}
