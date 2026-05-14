import {Sparkles} from 'lucide-react';
import {brand} from './design/copy';

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

export function PublicPage({path}: {path: string}) {
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
