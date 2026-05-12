import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, Calendar as CalendarIcon, BarChart2, User, ChevronRight, Activity, CheckCircle2, Heart, Settings, X, Star, Check } from 'lucide-react';

type RecordDetails = {
  ejaculation: string;
  method: string;
  rating: number;
};

type Record = {
  id: string;
  date: string;
  timestamp: number;
  details?: RecordDetails;
};

// Simulated dynamic date strings for realistic default state
const createMockData = () => {
  const d = new Date();
  const d1 = new Date(d); d1.setDate(d.getDate() - 2);
  const d2 = new Date(d); d2.setDate(d.getDate() - 6);
  const d3 = new Date(d); d3.setDate(d.getDate() - 10);
  
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  return [
    { id: '1', date: format(d1), timestamp: d1.getTime(), details: { ejaculation: '体内', method: '传统', rating: 4 } },
    { id: '2', date: format(d2), timestamp: d2.getTime(), details: { ejaculation: '避孕套', method: '浪漫', rating: 5 } },
    { id: '3', date: format(d3), timestamp: d3.getTime(), details: { ejaculation: '体外', method: '越轨', rating: 3 } },
  ];
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [records, setRecords] = useState<Record[]>(createMockData());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [role, setRole] = useState<'active' | 'passive'>('active');

  const openDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleSaveRecord = (details: RecordDetails) => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    setRecords(prev => {
      return [...prev, { id: Date.now().toString(), date: dateStr, timestamp: d.getTime(), details }];
    });
    setIsDrawerOpen(false);
  };

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      {/* Mobile constraint container */}
      <div className="w-full max-w-[430px] bg-[#F2F2F7] min-h-screen relative shadow-2xl overflow-hidden flex flex-col ios-safe-top">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto pb-24">
          {activeTab === 'home' && <HomeView records={records} onAddRecord={openDrawer} role={role} />}
          {activeTab === 'calendar' && <CalendarView records={records} />}
          {activeTab === 'stats' && <StatsView records={records} />}
          {activeTab === 'profile' && <ProfileView role={role} onRoleChange={setRole} />}
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 ios-safe-bottom z-10">
          <div className="flex justify-around items-center h-16 px-2">
            <TabItem icon={<Flame size={24} />} label="记录" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
            <TabItem icon={<CalendarIcon size={24} />} label="日历" isActive={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
            <TabItem icon={<BarChart2 size={24} />} label="统计" isActive={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
            <TabItem icon={<User size={24} />} label="我的" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>
        </div>

        {/* Drawer overlay & content */}
        <RecordSheet isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} onSave={handleSaveRecord} role={role} />
      </div>
    </div>
  );
}

function TabItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center space-y-1 w-full h-full ${isActive ? 'text-rose-500' : 'text-gray-400'}`}
    >
      <div className={`${isActive ? 'fill-rose-500' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// --- Views ---

function HomeView({ records, onAddRecord, role }: { records: Record[], onAddRecord: () => void, role: 'active' | 'passive' }) {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayStr();
  const todayRecords = records.filter(r => r.date === todayStr);
  const hasDoneToday = todayRecords.length > 0;

  const buttonText = role === 'active' ? '法了！' : '被法了！';

  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);
  
  // To find days since last time BEFORE today (or incl today)
  const lastTime = sortedRecords[0];
  
  // Calculate days difference safely by zeroing out time
  const getDaysDiff = (ts: number) => {
    const today = new Date(todayStr).getTime();
    const lastDate = new Date(new Date(ts).toDateString()).getTime(); // simplified zeroing
    return Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  };

  const daysSince = lastTime ? getDaysDiff(lastTime.timestamp) : null;

  return (
    <div className="flex flex-col items-center justify-between p-6 h-full pt-12 pb-6">
      <div className="text-center space-y-2 w-full">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">法了么</h1>
        <p className="text-gray-500">{hasDoneToday ? `今日完成 ${todayRecords.length} 次~` : "今天发生奇妙反应了吗？"}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full relative">
        {hasDoneToday && (
          <div className="absolute top-4 left-0 right-0 flex flex-col items-center space-y-2 animate-in fade-in duration-500 z-0">
             <div className="flex items-center space-x-2 text-rose-500 bg-rose-50 px-4 py-1.5 rounded-full font-bold">
               <CheckCircle2 size={16} />
               <span>今日已记录 {todayRecords.length} 次</span>
             </div>
          </div>
        )}
        
        <button 
          onClick={onAddRecord}
          className="w-64 h-64 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 text-white shadow-[0_20px_60px_-15px_rgba(244,63,94,0.6)] active:scale-90 transition-all duration-300 flex flex-col items-center justify-center border-4 border-white/20 z-10"
        >
          <Flame size={72} className="mb-2 drop-shadow-md" strokeWidth={1.5} />
          <span className="font-bold text-4xl tracking-wider drop-shadow-md">{buttonText}</span>
          {hasDoneToday && <span className="mt-2 text-sm text-white/80 font-medium">再记一次</span>}
        </button>
      </div>

      <div className="w-full bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
        <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">STATUS</p>
        {!lastTime ? (
          <p className="text-lg font-medium text-gray-800">还没有任何记录哦</p>
        ) : hasDoneToday ? (
          <p className="text-lg font-medium text-gray-800">状态火热，生命不息 🔥</p>
        ) : (
          <div className="flex items-baseline space-x-1">
            <span className="text-gray-600">距离上次已过去</span>
            <span className="text-4xl font-bold text-rose-500 font-mono px-2">{daysSince}</span>
            <span className="text-gray-600">天</span>
          </div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ records }: { records: Record[] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasRecord = records.some(r => r.date === dateStr);
    return { day, dateStr, hasRecord };
  });

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight py-2">打卡日历</h1>
      
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">{currentYear}年{currentMonth + 1}月</h2>
        </div>
        
        <div className="grid grid-cols-7 gap-y-4 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-bold text-gray-400">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-y-4 gap-x-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(d => (
            <div key={d.day} className="flex justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${d.hasRecord ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'text-gray-600 bg-gray-50'}`}>
                {d.day}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-3 mt-6">
        <h3 className="text-sm font-bold text-gray-900 ml-1">最近记录</h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {records.slice().sort((a, b) => b.timestamp - a.timestamp).slice(0, 5).map(r => (
            <div key={r.id} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                  <Flame size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-800 text-sm">{r.date}</span>
                  {r.details && (
                    <span className="text-xs text-gray-400 mt-0.5 flex items-center space-x-1.5">
                      <span>{r.details.method}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{r.details.ejaculation}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="flex items-center space-x-0.5 text-rose-400">
                        {r.details.rating} <Flame size={10} className="fill-rose-400 ml-0.5" />
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-rose-500 font-bold bg-rose-50 px-2 py-1 rounded-full">已打卡</span>
            </div>
          ))}
          {records.length === 0 && (
             <div className="p-6 text-center text-gray-400 text-sm">暂无记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsView({ records }: { records: Record[] }) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const total = records.length;
  const thisMonth = records.filter(r => r.date.startsWith(monthPrefix)).length;
  
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight py-2">数据统计</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center border border-blue-100">
            <Activity size={20} />
          </div>
          <p className="text-xs text-gray-400 font-bold mt-2">本月次数</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold font-mono text-gray-900">{thisMonth}</span>
            <span className="text-sm font-medium text-gray-500">次</span>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
            <Flame size={20} />
          </div>
          <p className="text-xs text-gray-400 font-bold mt-2">累计总数</p>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold font-mono text-gray-900">{total}</span>
            <span className="text-sm font-medium text-gray-500">次</span>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">月度趋势</h3>
          {/* Mocked chart bars for visual flair */}
          <div className="h-40 flex items-end space-x-3 justify-between mt-6">
             {[4, 2, 5, 3, 7, thisMonth].map((val, i) => (
                <div key={i} className="w-full flex flex-col items-center justify-end h-full space-y-2">
                   <div 
                     className={`w-full rounded-t-md transition-all duration-500 ${i === 5 ? 'bg-rose-500' : 'bg-rose-200'}`} 
                     style={{ height: `${Math.max((val / 7) * 100, 10)}%` }} 
                   />
                   <span className="text-[10px] text-gray-400">{i + 1}月</span>
                </div>
             ))}
          </div>
      </div>
    </div>
  );
}

function ProfileView({ role, onRoleChange }: { role: 'active' | 'passive', onRoleChange: (r: 'active' | 'passive') => void }) {
  const [partnerLinked, setPartnerLinked] = React.useState(false);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight py-2">我的</h1>
      
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 border-4 border-white shadow-md flex items-center justify-center text-white font-bold text-xl">
           VIP
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">老司机</h2>
          <p className="text-xs text-gray-400 mt-1">另一半：{partnerLinked ? <span className="text-rose-500 font-bold">小仙女 🥰</span> : '未绑定 🔗'}</p>
        </div>
        <ChevronRight size={20} className="text-gray-400" />
      </div>

      {/* Role Switcher */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4">
        <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold text-gray-800">我的角色</h3>
           <span className="text-xs text-gray-400">目前倾向: {role === 'active' ? '主动出发' : '被动享受'}</span>
        </div>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-2xl w-full">
           <button 
             onClick={() => onRoleChange('active')}
             className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${role === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
           >
              我是“法”的一方
           </button>
           <button 
             onClick={() => onRoleChange('passive')}
             className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${role === 'passive' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
           >
              我是“被法”的一方
           </button>
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div onClick={() => setPartnerLinked(!partnerLinked)}>
          <MenuItem 
            icon={<Heart className="text-rose-500" size={20} />} 
            label={partnerLinked ? "解除关联" : "关联伴侣 (同步记录)"} 
          />
        </div>
        <MenuItem icon={<Activity className="text-blue-500" size={20} />} label="健康数据同步" />
        <MenuItem icon={<Settings className="text-gray-500" size={20} />} label="隐私设置 (密码锁)" />
      </div>
      
      <div className="text-center text-xs text-gray-400 mt-8">
        法了么 v2.0.0
      </div>
    </div>
  );
}

function MenuItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0 active:bg-gray-50 cursor-pointer">
      <div className="flex items-center space-x-3">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <ChevronRight size={18} className="text-gray-300" />
    </div>
  );
}

function RecordSheet({ isOpen, onClose, onSave, role }: { isOpen: boolean, onClose: () => void, onSave: (details: RecordDetails) => void, role: 'active' | 'passive' }) {
  const [ejaculation, setEjaculation] = React.useState('体内');
  const [method, setMethod] = React.useState('传统');
  const [rating, setRating] = React.useState(3);

  const methods = ['传统', '口部', '走旱道', '玩具辅助', '刺激野战'];
  const ejaculations = role === 'active' 
    ? ['体内', '体外', '避孕套', '其他'] 
    : ['被内射', '体外排精', '带套', '其他'];

  React.useEffect(() => {
    if (role === 'passive' && !ejaculations.includes(ejaculation)) {
      setEjaculation('被内射');
    } else if (role === 'active' && !ejaculations.includes(ejaculation)) {
      setEjaculation('体内');
    }
  }, [role]);

  const handleSubmit = () => {
    onSave({ ejaculation, method, rating });
    // Reset after save
    setTimeout(() => {
      setEjaculation(role === 'active' ? '体内' : '被内射');
      setMethod('传统');
      setRating(3);
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          
          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 h-[80vh] flex flex-col"
          >
            {/* Handle/Drag bar indicator */}
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            <div className="flex justify-between items-center px-6 pb-2 border-b border-gray-100">
              <h2 className="text-xl font-bold">记录详情</h2>
              <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Rating */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">体验评分 (感受如何？)</label>
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button 
                      key={i} 
                      onClick={() => setRating(i)}
                      className={`transition-all ${rating >= i ? 'scale-110 text-rose-500' : 'scale-100 text-gray-300'} active:scale-95`}
                    >
                      <Flame size={36} className={`${rating >= i ? 'fill-rose-500 drop-shadow-sm' : ''}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Method */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">主要方式</label>
                <div className="flex flex-wrap gap-3">
                  {methods.map(m => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                        method === m 
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-200' 
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ejaculation */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-gray-700">{role === 'active' ? '射精方式' : '对方射精方式'}</label>
                <div className="grid grid-cols-2 gap-3">
                  {ejaculations.map(e => (
                    <button
                      key={e}
                      onClick={() => setEjaculation(e)}
                      className={`p-4 rounded-2xl text-center font-medium transition-all flex items-center justify-center space-x-2 ${
                        ejaculation === e 
                          ? 'bg-blue-50 text-blue-600 border-2 border-blue-500' 
                          : 'bg-gray-50 text-gray-600 border-2 border-transparent'
                      }`}
                    >
                      {ejaculation === e && <Check size={18} strokeWidth={3} />}
                      <span>{e}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="p-6 bg-white border-t border-gray-100 pb-12">
              <button 
                onClick={handleSubmit}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl active:scale-95 transition-all flex justify-center items-center space-x-2 shadow-lg"
              >
                <CheckCircle2 size={24} />
                <span className="text-lg">保存记录</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

