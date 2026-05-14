import type {UserRole} from '../types/domain';
import {shanghaiCalendarDay} from '../datetime';

function todayISO() {
  return shanghaiCalendarDay(new Date());
}

/** 今日点击首页「法了 / 被法了」大按钮次数（按用户、按自然日）。 */
export function bumpTodayHeroFabClick(userId: string): number {
  const key = `faleme.fabClicks.v1:${userId.trim() || 'anon'}:${todayISO()}`;
  const raw = localStorage.getItem(key);
  const prev = raw == null ? 0 : Math.max(0, parseInt(raw, 10) || 0);
  const next = prev + 1;
  localStorage.setItem(key, String(next));
  return next;
}

function ratingTailInitiator(rating: number | null): string {
  if (rating == null) return '';
  if (rating <= 2) return ' 看你上次打分有点委屈，这次记得：舒服最重要，不行就停，别硬扛。';
  if (rating === 3) return ' 上次三分平淡局——今天要是开心就往上冲，不开心就诚实写低分，数据不丢人。';
  return ' 上次体验不错啊，继续保持「清醒又温柔」的成年人打法。';
}

function ratingTailReceiver(rating: number | null): string {
  if (rating == null) return '';
  if (rating <= 2) return ' 上次分不高，抱抱你：被照顾也可以喊停，你的感受一样算数。';
  if (rating === 3) return ' 上次三分像温吞水——今天想被多宠一点就大胆记，嘴硬留给广场就好。';
  return ' 上次分挺高，说明你会享受也会表达，继续，这是健康的爱商。';
}

function ratingTailSwitch(rating: number | null): string {
  if (rating == null) return '';
  if (rating <= 2) return ' 上次打分有点闷：今天不管是法还是被法，都优先「我舒服吗」三个字。';
  if (rating === 3) return ' 上次三分平平——今天看气氛，记得同意比演技重要。';
  return ' 上次挺满意？那今天继续当「会刹车也会加油」的成年人。';
}

/** 点击大按钮后，弹层顶部插播（含次数梗 + 可选结合上一条记录的评分）。 */
export function getHeroFabBanter(args: {role: UserRole; clickCountToday: number; latestRating: number | null}): string {
  const {role, clickCountToday: c, latestRating} = args;
  const isR = role === 'receiver';
  const isS = role === 'switch';

  if (c >= 18) {
    return isR
      ? '十八次？你这「被法」考勤表是国际邀请赛吗——别装了，我害怕，咱诚实点。'
      : '十八次打卡？兄弟你这根手指是电动圆珠笔吗——你赢了，别法了，我害怕。';
  }
  if (c >= 10) {
    return isR
      ? '十次？「被法全勤奖」颁给你——奖杯没有，只有一句：这频率地球物理学不支持，但我敬你是条汉子（夸张版）。'
      : '十次？今日法了么 MVP 非你莫属——再点下去系统要怀疑你在刷成就：别装了，根本没可能那么多。';
  }
  if (c >= 7) {
    return isR
      ? '第七次了…被温柔照顾也要睡觉的，注意恢复；对方也要喘口气，爱是互相充电不是互相放电。'
      : '第七次点开？再爱也要讲基本法：脱水、睡眠、情绪过载都是真风险，对伴侣多点呵护，别当永动机。';
  }
  if (c >= 4) {
    return isR
      ? '第四次了——记录很勤快，但身体不是无限流量包：记得补水、休息，也和对方确认彼此状态，别硬卷。'
      : '第四次了——热情我懂，频繁亲密会增加摩擦与疲劳风险，温柔点、慢点，记得事后拥抱说人话。';
  }
  if (c === 3) {
    return isR
      ? '今天第三回点「被法了」——被照顾很爽，也要睡觉喝水；记得呵护对方，爱是双向续航。'
      : '今天第三回点「法了」——身体不是打卡机，注意节奏；对伴侣多点体贴，别只顾自己上头。';
  }
  if (c === 2) {
    const base = isR ? '又来？被法记录员今天很勤奋。' : '又来？法了么驻场代表今天很敬业。';
    const tail = isS ? ratingTailSwitch(latestRating) : isR ? ratingTailReceiver(latestRating) : ratingTailInitiator(latestRating);
    return base + tail;
  }

  // c === 1
  if (isR) {
    return '好被法 姐妹/兄弟，敢点「被法了」就很勇——享受被爱也值得被记录。' + ratingTailReceiver(latestRating);
  }
  if (isS) {
    return '好法…也可能是好被，反正先记账——今日剧本自选，但安全与同意不外包。' + ratingTailSwitch(latestRating);
  }
  return '好法兄弟，成年人敢记敢当。' + ratingTailInitiator(latestRating);
}

/** 保存本地记录成功后，首页短暂飘一句。 */
export function getAfterSaveBanter(role: UserRole, rating: number): string {
  if (role === 'receiver') {
    if (rating <= 2) return '分不高也没事：被法也可以喊停，你的感受一样珍贵。';
    if (rating === 3) return '三分平淡局——下次想要多一点温柔，就写进记录里，别全靠对方猜。';
    return '高分！被照顾得很开心就大声…写在评分里，这也是一种双向夸奖。';
  }
  if (role === 'switch') {
    if (rating <= 2) return '这次一般般？没关系，身体会诚实，下次把节奏和保护再调一调。';
    if (rating === 3) return '三分像温吞泡面：能饱但不香，下次试试把「想要」说清楚。';
    return '体验拉满！记得把温柔也留给对方——法了么鼓励会夸人的成年人。';
  }
  if (rating <= 2) return '这次不太爽？先抱抱你。下次慢一点、多问一句，别把面子看得比舒服重。';
  if (rating === 3) return '三分说明还有上升空间：沟通、保护、节奏，随便升级一样都能涨分。';
  return '高分现场！记得事后抱抱、说人话——别拔枪无情，拥抱彼此才是完整剧情。';
}

/** 发出「法法同步申请」成功后飘一句（按发送方自我角色）。 */
export function getPartnerShareAfterSendBanter(senderRole: UserRole): string {
  if (senderRole === 'receiver') {
    return '申请已发出：大胆记录「被法」超酷，对方确认后你们就各有一条同步分——继续享受被爱的底气。';
  }
  if (senderRole === 'initiator') {
    return '申请已发出：记得对 Ta 多点呵护与善后，别拔枪无情——确认后各记一条，拥抱比战绩重要。';
  }
  return '申请已发出：不管是法还是被法，记得把「同意」和「体贴」一起打包发给对方。';
}

/** 收件箱里：对方申请上的角色标签旁白（senderRole 为对方填的角色）。 */
export function getPartnerShareInboxBanter(senderRole: UserRole): string {
  if (senderRole === 'receiver') {
    return '对方以「被法」视角发起同步——夸夸 Ta 敢记录、敢享受亲密，接受前你们再对齐感受就好。';
  }
  if (senderRole === 'initiator') {
    return '对方以「法」视角发起同步——提醒 Ta 多照顾你的节奏与情绪，别赢了场面输了体贴。';
  }
  return '对方是「看气氛发挥」型选手——读申请时多一句温柔，少一句审判。';
}

/** 我发出的申请卡片下的小字（senderRole 是我当时选的角色）。 */
export function getPartnerShareOutboxBanter(mySenderRole: UserRole): string {
  if (mySenderRole === 'receiver') {
    return '你以「被法」身份发起：记录被照顾不是示弱，是爱自己——对方接受后一起留痕。';
  }
  if (mySenderRole === 'initiator') {
    return '你以「法」身份发起：记得事后多哄多抱，别让亲密只剩「过程」没有「善后」。';
  }
  return '你以「切换」身份发起：同步是两个人的合写，不是一个人的独角戏。';
}
