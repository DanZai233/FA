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
  Plus,
  RefreshCw,
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
import {api} from './api/client';
import type {
  CyclePrediction,
  CycleRecord,
  HealthAdvice,
  IntimacyRecord,
  IntimacyType,
  KnowledgeCard,
  MatchCard,
  PartnerMessage,
  PartnerLinkStatus,
  PhraseSlot,
  ProtectionMethod,
  ReminderSummary,
  RiskLevel,
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
    phrase: '安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感',
    scene: 'partner',
    createdAt: isoDate(addDays(today, -1)),
  },
];

type TabKey = 'home' | 'cycle' | 'partner' | 'square' | 'profile';

type OfflineRecord = {
  id: string;
  label: '法了！' | '被法了！';
  occurredAt: string;
  timestamp: number;
};

const offlineStorageKey = 'faleme.offline.records';

export default function App() {
  const path = window.location.pathname;

  if (path === '/' || path === '/app') {
    return <MobileApp />;
  }

  return <PublicPage path={path} />;
}

function MobileApp() {
  const [offlineMode, setOfflineMode] = useState(() => localStorage.getItem('faleme.offline.enabled') === 'true');
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [profile, setProfile] = useState<UserProfile>({
    id: 'u-demo',
    nickname: '嘴硬但健康的成年人',
    role: 'switch',
    adultConfirmed: true,
    partnerStatus: 'linked',
  });
  const [records, setRecords] = useState<IntimacyRecord[]>(seedRecords);
  const [cycle, setCycle] = useState<CycleRecord>(seedCycle);
  const [posts, setPosts] = useState<SocialPost[]>(socialSeed);
  const [partnerMessages, setPartnerMessages] = useState<PartnerMessage[]>(seedMessages);
  const [summary, setSummary] = useState<ReminderSummary | null>(null);
  const [recordSheetOpen, setRecordSheetOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'connected' | 'offline-demo'>('offline-demo');

  const localPrediction = useMemo(() => predictCycle(cycle, records), [cycle, records]);
  const [remotePrediction, setRemotePrediction] = useState<CyclePrediction | null>(null);
  const prediction = remotePrediction ?? localPrediction;
  const stats = useMemo(() => buildStats(records), [records]);

  if (offlineMode) {
    return <OfflineModeView onExit={() => {
      localStorage.setItem('faleme.offline.enabled', 'false');
      setOfflineMode(false);
    }} />;
  }

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api.me(),
      api.records(),
      api.cycles(),
      api.posts(),
      api.prediction(),
      api.partnerMessages(),
      api.reminderSummary(),
    ])
      .then(([nextProfile, nextRecords, nextCycles, nextPosts, nextPrediction, nextMessages, nextSummary]) => {
        if (ignore) {
          return;
        }
        setProfile((prev) => ({
          ...prev,
          ...nextProfile,
          partnerStatus: prev.partnerStatus,
        }));
        setRecords(nextRecords);
        if (nextCycles[0]) {
          setCycle(nextCycles[0]);
        }
        setPosts(nextPosts);
        setRemotePrediction(nextPrediction);
        setPartnerMessages(nextMessages);
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
  }, []);

  const saveRecord = (draft: RecordDraft) => {
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
      })
      .catch(() => setApiStatus('offline-demo'));
    setRecordSheetOpen(false);
  };

  const publishPhrase = (phrase: string) => {
    const optimisticPost: SocialPost = {
      id: `p-${Date.now()}`,
      authorAlias: '匿名成年人',
      phrase,
      resonanceCount: 0,
      createdAt: isoDate(new Date()),
    };
    setPosts((prev) => [optimisticPost, ...prev]);
    api.createPost(phrase)
      .then((post) => {
        setPosts((prev) => prev.map((item) => (item.id === optimisticPost.id ? post : item)));
        setApiStatus('connected');
      })
      .catch(() => setApiStatus('offline-demo'));
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-100">
      <div className="ios-safe-top relative flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[#F2F2F7] shadow-2xl">
        <main className="flex-1 overflow-y-auto pb-28">
          {activeTab === 'home' && (
            <HomeView
              advice={prediction.todayAdvice}
              records={records}
              stats={stats}
              apiStatus={apiStatus}
              summary={summary}
              onAddRecord={() => setRecordSheetOpen(true)}
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
              status={profile.partnerStatus}
              messages={partnerMessages}
              onSendMessage={(phrase) => {
                const optimistic: PartnerMessage = {
                  id: `msg-${Date.now()}`,
                  userId: profile.id,
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
              onStatusChange={(partnerStatus) => {
                setProfile((prev) => ({...prev, partnerStatus}));
                if (partnerStatus === 'linked') {
                  api.createPartnerInvite()
                    .then((link) => {
                      setProfile((prev) => ({...prev, partnerStatus: link.status}));
                      setApiStatus('connected');
                    })
                    .catch(() => setApiStatus('offline-demo'));
                } else {
                  api.unlinkPartner()
                    .then((link) => {
                      setProfile((prev) => ({...prev, partnerStatus: link.status}));
                      setApiStatus('connected');
                    })
                    .catch(() => setApiStatus('offline-demo'));
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
                    setRecords([]);
                    setPosts([]);
                    setProfile((prev) => ({...prev, nickname: '已删除用户', partnerStatus: 'none'}));
                    setApiStatus('connected');
                  })
                  .catch(() => setApiStatus('offline-demo'));
              }}
            />
          )}
        </main>

        <nav className="ios-safe-bottom absolute bottom-0 z-20 w-full border-t border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="grid h-16 grid-cols-5 px-2">
            <TabItem icon={<Flame size={22} />} label="记录" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <TabItem icon={<CalendarIcon size={22} />} label="周期" active={activeTab === 'cycle'} onClick={() => setActiveTab('cycle')} />
            <TabItem icon={<Heart size={22} />} label="伴侣" active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} />
            <TabItem icon={<MessageCircle size={22} />} label="广场" active={activeTab === 'square'} onClick={() => setActiveTab('square')} />
            <TabItem icon={<User size={22} />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
        </nav>

        <RecordSheet
          isOpen={recordSheetOpen}
          advice={prediction.todayAdvice}
          onClose={() => setRecordSheetOpen(false)}
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
  apiStatus,
  summary,
  onAddRecord,
  onEnterOffline,
  onDeleteRecord,
}: {
  advice: HealthAdvice;
  records: IntimacyRecord[];
  stats: ReturnType<typeof buildStats>;
  apiStatus: 'connected' | 'offline-demo';
  summary: ReminderSummary | null;
  onAddRecord: () => void;
  onEnterOffline: () => void;
  onDeleteRecord: (id: string) => void;
}) {
  const latest = records[0];
  return (
    <section className="space-y-6 p-5 pt-10">
      <header className="space-y-2 text-center">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-500">adult wellness</p>
        <h1 className="text-4xl font-black tracking-tight text-slate-950">{brand.name}</h1>
        <p className="mx-auto max-w-xs text-sm leading-6 text-slate-500">{brand.slogan}</p>
        <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-slate-400 shadow-sm">
          {apiStatus === 'connected' ? '后端已连接' : '本地演示模式'}
        </span>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onAddRecord}
          className="flex h-44 flex-col items-center justify-center rounded-[2rem] border-4 border-white/30 bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-[0_24px_70px_-18px_rgba(244,63,94,0.75)] transition active:scale-95"
        >
          <Flame size={52} strokeWidth={1.5} />
          <span className="mt-2 text-3xl font-black tracking-wider">法了！</span>
          <span className="mt-1 text-xs font-semibold text-white/80">主动出发</span>
        </button>
        <button
          onClick={onAddRecord}
          className="flex h-44 flex-col items-center justify-center rounded-[2rem] border-4 border-white/50 bg-white text-rose-500 shadow-sm transition active:scale-95"
        >
          <Heart size={52} strokeWidth={1.5} />
          <span className="mt-2 text-3xl font-black tracking-wider">被法了！</span>
          <span className="mt-1 text-xs font-semibold text-slate-400">被温柔照顾</span>
        </button>
      </div>
      <button onClick={onEnterOffline} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700">
        进入完全离线模式
      </button>

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
  const [records, setRecords] = useState<OfflineRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(offlineStorageKey) ?? '[]') as OfflineRecord[];
    } catch {
      return [];
    }
  });

  const saveOfflineRecord = (label: OfflineRecord['label']) => {
    const next = [
      {
        id: `offline-${Date.now()}`,
        label,
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
      <div className="ios-safe-top relative flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[#F2F2F7] p-5 shadow-2xl">
        <header className="pt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-500">offline mode</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">完全离线</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
            不联网、不同步、不社交。只记录今天到底是法了，还是被法了。
          </p>
        </header>

        <div className="mt-10 grid grid-cols-2 gap-4">
          <button
            onClick={() => saveOfflineRecord('法了！')}
            className="flex h-52 flex-col items-center justify-center rounded-[2.25rem] bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-[0_24px_70px_-18px_rgba(244,63,94,0.75)] active:scale-95"
          >
            <Flame size={62} className="drop-shadow-sm" />
            <span className="mt-3 text-4xl font-black">法了！</span>
            <span className="mt-2 text-xs font-bold text-white/75">本地记一笔</span>
          </button>
          <button
            onClick={() => saveOfflineRecord('被法了！')}
            className="flex h-52 flex-col items-center justify-center rounded-[2.25rem] bg-white text-rose-500 shadow-sm active:scale-95"
          >
            <Heart size={62} />
            <span className="mt-3 text-3xl font-black">被法了！</span>
            <span className="mt-2 text-xs font-bold text-slate-400">本地记一笔</span>
          </button>
        </div>

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
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-500">本地</span>
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
  cycle,
  prediction,
  onCycleChange,
}: {
  cycle: CycleRecord;
  prediction: CyclePrediction;
  onCycleChange: (cycle: CycleRecord) => void;
}) {
  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="周期雷达" subtitle="预测不是算命，身体信号优先。" />
      <AdviceCard advice={prediction.todayAdvice} />

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
  status,
  messages,
  onStatusChange,
  onSendMessage,
}: {
  status: PartnerLinkStatus;
  messages: PartnerMessage[];
  onStatusChange: (status: PartnerLinkStatus) => void;
  onSendMessage: (phrase: string) => void;
}) {
  const linked = status === 'linked';
  const [parts, setParts] = useState<Record<PhraseSlot, string>>({
    tone: phraseBook.tones[2],
    subject: phraseBook.subjects[2],
    action: phraseBook.actions[2],
    ending: phraseBook.endings[3],
  });
  const phrase = `${parts.tone} / ${parts.subject} / ${parts.action} / ${parts.ending}`;
  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="伴侣绑定" subtitle="两个人的事，权限也要两个人确认。" />
      <Card title={linked ? '已绑定：匿名心动搭子' : '还没绑定'} action={linked ? '共享开启' : '邀请码 6 位'}>
        <div className="rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
              <Heart className={linked ? 'fill-rose-500' : ''} size={26} />
            </div>
            <div>
              <p className="font-black text-slate-900">{linked ? '共享记录需要逐项授权' : '生成邀请码给对方'}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {linked ? '对方看不到你的全部历史，别让亲密关系变成后台审计。' : '对方接受后才能同步，不玩偷看那套。'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onStatusChange(linked ? 'none' : 'linked')}
            className="mt-5 w-full rounded-2xl bg-slate-950 py-3 text-sm font-black text-white active:scale-[0.99]"
          >
            {linked ? '解除绑定' : '生成邀请码 FALV1'}
          </button>
        </div>
      </Card>

      <Card title="伴侣守则" action="默认开启">
        <TimelineItem icon={<CheckCircle2 size={18} />} title="明确同意" body="任何一方说停，就停。气氛不是通行证。" />
        <TimelineItem icon={<ShieldCheck size={18} />} title="保护优先" body="风险窗口、无保护、状态不清醒时，系统会严厉一点。" />
        <TimelineItem icon={<Lock size={18} />} title="隐私边界" body="亲密记录默认只属于本人，共享需要明确开关。" />
      </Card>

      <Card title="给伴侣发一句" action="预设短句">
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-950 p-4 text-sm font-bold leading-6 text-white">{phrase}</div>
          <PhraseSelect label="语气" value={parts.tone} values={phraseBook.tones} onChange={(tone) => setParts((prev) => ({...prev, tone}))} />
          <PhraseSelect label="动作" value={parts.action} values={phraseBook.actions} onChange={(action) => setParts((prev) => ({...prev, action}))} />
          <button onClick={() => onSendMessage(phrase)} className="w-full rounded-2xl bg-rose-500 py-3 text-sm font-black text-white">
            发送给伴侣
          </button>
        </div>
      </Card>

      <Card title="伴侣留言箱" action={`${messages.length} 条`}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">{message.createdAt}</p>
              <p className="mt-2 text-sm font-black leading-6 text-slate-800">{message.phrase}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="py-5 text-center text-sm text-slate-400">还没有留言。沉默可以，但别全靠猜。</p>}
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
  const [match, setMatch] = useState<MatchCard | null>(matchSeed);
  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="预设广场" subtitle="不开放自由聊天。成年人发言，也要带刹车。" />
      <PhraseComposer onPublish={onPublish} />

      <Card title="摇一摇轻匹配" action="只给预设短句">
        <div className="space-y-3">
          {match ? (
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-400">匹配到：{match.alias}</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{match.phrase}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂时没有匹配。宇宙建议你先喝水。</p>
          )}
          <button
            onClick={() => setMatch((prev) => (prev ? null : matchSeed))}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-800"
          >
            <RefreshCw size={16} />
            摇一下，但不乱来
          </button>
        </div>
      </Card>

      <Card title="匿名留言" action="可举报">
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{post.authorAlias}</span>
                <span>{post.createdAt}</span>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-slate-800">{post.phrase}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => onResonate(post.id)}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-500"
                >
                  共鸣 {post.resonanceCount}
                </button>
                <button
                  onClick={() => onReport(post.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black ${post.reported ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {post.reported ? '已举报' : '举报'}
                </button>
                <button
                  onClick={() => onBlock(post.id)}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white"
                >
                  屏蔽
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ProfileView({
  profile,
  records,
  onRoleChange,
  onPrivacyLockChange,
  onExportData,
  onDeleteAccount,
}: {
  profile: UserProfile;
  records: IntimacyRecord[];
  onRoleChange: (role: UserRole) => void;
  onPrivacyLockChange: (privacyLock: boolean) => void;
  onExportData: () => void;
  onDeleteAccount: () => void;
}) {
  return (
    <section className="space-y-5 p-5 pt-8">
      <PageTitle title="我的" subtitle="成年人的体面，是知道什么时候该认真。" />
      <Card title={profile.nickname} action="成年确认已完成">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-rose-400 to-pink-500 text-xl font-black text-white shadow-lg">
            法
          </div>
          <div className="flex-1">
            <p className="font-black text-slate-900">{roleLabels[profile.role]}</p>
            <p className="mt-1 text-sm text-slate-500">累计 {records.length} 条私密记录</p>
          </div>
          <ChevronRight className="text-slate-300" />
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
  onClose,
  onSave,
}: {
  isOpen: boolean;
  advice: HealthAdvice;
  onClose: () => void;
  onSave: (draft: RecordDraft) => void;
}) {
  const [type, setType] = useState<IntimacyType>('penetrative');
  const [protection, setProtection] = useState<ProtectionMethod>('condom');
  const [rating, setRating] = useState(4);
  const [consentChecked, setConsentChecked] = useState(true);
  const [sharedWithPartner, setSharedWithPartner] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            animate={{opacity: 1}}
            className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
            exit={{opacity: 0}}
            initial={{opacity: 0}}
            onClick={onClose}
          />
          <motion.div
            animate={{y: 0}}
            className="absolute bottom-0 left-0 right-0 z-50 flex h-[84vh] flex-col rounded-t-[2rem] bg-white shadow-2xl"
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
              <ToggleRow checked={sharedWithPartner} label="共享给已绑定伴侣" onChange={setSharedWithPartner} />
            </div>
            <div className="ios-safe-bottom border-t border-slate-100 bg-white p-6">
              <button
                onClick={() => onSave({type, protection, rating, consentChecked, sharedWithPartner})}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-black text-white active:scale-[0.99]"
              >
                <CheckCircle2 size={22} />
                保存记录
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PhraseComposer({onPublish}: {onPublish: (phrase: string) => void}) {
  const [parts, setParts] = useState<Record<PhraseSlot, string>>({
    tone: phraseBook.tones[0],
    subject: phraseBook.subjects[0],
    action: phraseBook.actions[0],
    ending: phraseBook.endings[0],
  });
  const phrase = `${parts.tone} / ${parts.subject} / ${parts.action} / ${parts.ending}`;

  return (
    <Card title="预设拼句" action="模板槽位">
      <div className="space-y-4">
        <div className="rounded-3xl bg-slate-950 p-4 text-sm font-bold leading-6 text-white">{phrase}</div>
        <p className="text-xs font-bold leading-5 text-slate-400">
          用固定模板和分类词库拼一句话，不开放自由输入。简单句负责提醒，复杂句负责嘴硬。
        </p>
        <PhraseSelect label="语气" value={parts.tone} values={phraseBook.tones} onChange={(tone) => setParts((prev) => ({...prev, tone}))} />
        <PhraseSelect label="主语" value={parts.subject} values={phraseBook.subjects} onChange={(subject) => setParts((prev) => ({...prev, subject}))} />
        <PhraseSelect label="动作" value={parts.action} values={phraseBook.actions} onChange={(action) => setParts((prev) => ({...prev, action}))} />
        <PhraseSelect label="收尾" value={parts.ending} values={phraseBook.endings} onChange={(ending) => setParts((prev) => ({...prev, ending}))} />
        <button
          onClick={() => onPublish(phrase)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 py-3 text-sm font-black text-white"
        >
          <Plus size={16} />
          发布到匿名广场
        </button>
      </div>
    </Card>
  );
}

function PublicPage({path}: {path: string}) {
  const page = publicPages[path] ?? publicPages['/'];
  return (
    <main className="min-h-screen bg-[#F2F2F7] px-5 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl space-y-6">
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
    <section className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
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

function ToggleRow({checked, label, onChange}: {checked: boolean; label: string; onChange: (checked: boolean) => void}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-3xl bg-slate-50 p-4 text-left"
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

function PhraseSelect({label, value, values, onChange}: {label: string; value: string; values: string[]; onChange: (value: string) => void}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-rose-300"
      >
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function predictCycle(cycle: CycleRecord, records: IntimacyRecord[]): CyclePrediction {
  const start = new Date(cycle.periodStart);
  const nextStart = addDays(start, cycle.cycleLength);
  const nextEnd = addDays(nextStart, 5);
  const fertileStart = addDays(nextStart, -15);
  const fertileEnd = addDays(nextStart, -10);
  const now = new Date(isoDate(new Date()));
  const latestRecord = records[0];
  const inPeriod = now >= nextStart && now <= nextEnd;
  const inFertile = now >= fertileStart && now <= fertileEnd;
  const tooFrequent = latestRecord ? daysBetween(new Date(latestRecord.occurredAt), now) <= 1 : false;
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

function daysBetween(a: Date, b: Date) {
  const ms = new Date(isoDate(b)).getTime() - new Date(isoDate(a)).getTime();
  return Math.floor(ms / 86_400_000);
}
