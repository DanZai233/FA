import type {
  HealthAdvice,
  IntimacyType,
  ProtectionMethod,
  RiskLevel,
  UserRole,
} from '../types/domain';

export const brand = {
  name: '法了么',
  slogan: '嘴上很荒唐，身体很诚实，安全要更诚实。',
  promise: '记录亲密、照顾伴侣、学习性健康。成年人可以幽默，但不能糊涂。',
};

export const roleLabels: Record<UserRole, string> = {
  initiator: '主动出发',
  receiver: '被温柔照顾',
  switch: '看气氛发挥',
};

export const protectionLabels: Record<ProtectionMethod, string> = {
  condom: '安全套上岗',
  oral_contraceptive: '短效避孕药',
  iud: '宫内节育器',
  none: '没有保护',
  not_sure: '记不清了',
};

export const intimacyTypeLabels: Record<IntimacyType, string> = {
  cuddle: '抱抱充电',
  kiss: '亲亲升温',
  manual: '手动挡',
  oral: '口头表扬',
  penetrative: '正片开始',
  solo: '单人排解',
  other: '奇妙支线',
};

export const riskTone: Record<RiskLevel, string> = {
  low: '今天脑子在线，继续保持。',
  medium: '别装没看见，先把安全措施补上。',
  high: '暂停冲锋。欲望可以有，风险不能赌。',
};

export const defaultAdvice: HealthAdvice = {
  level: 'medium',
  title: '先确认，再上车',
  body: '同意、保护、清醒、舒适，这四样缺一项都别硬演偶像剧。',
  action: '先问一句“这样可以吗”，再检查保护措施。',
};

export const phraseBook = {
  tones: ['今晚月色不错', '理智正在下线', '安全员已上线', '嘴硬但诚实'],
  subjects: ['我的荷尔蒙', '这位成年人', '今日小火苗', '伴侣雷达'],
  actions: ['申请抱抱', '建议冷静三分钟', '提醒戴好装备', '发出心动警报'],
  endings: ['但安全第一', '请勿无证驾驶', '先喝水再说', '尊重同意最性感'],
};
