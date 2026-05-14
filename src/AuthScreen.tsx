import React, {useCallback, useEffect, useState} from 'react';
import {brand} from './design/copy';
import {api, getAuthToken, setAuthToken} from './api/client';

type Mode = 'login' | 'register';

export function AuthScreen({
  onAuthed,
  onOffline,
}: {
  onAuthed: () => void;
  onOffline: () => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [adult, setAdult] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadCaptcha = useCallback(async () => {
    try {
      const c = await api.captcha();
      setCaptchaId(c.id);
      setCaptchaUrl(c.dataUrl);
      setCaptchaInput('');
    } catch {
      setErr('验证码加载失败，请检查网络或稍后再试');
    }
  }, []);

  useEffect(() => {
    void loadCaptcha();
  }, [loadCaptcha, mode]);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        await api.register({
          email: email.trim(),
          password,
          nickname: nickname.trim() || undefined,
          captchaId,
          captcha: captchaInput.trim(),
          adultConfirmed: adult,
        });
      } else {
        await api.loginEmail({email: email.trim(), password});
      }
      if (getAuthToken()) {
        onAuthed();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : '请求失败');
      void loadCaptcha();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ios-safe-top relative flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-gradient-to-br from-[#fdf2f8] via-[#f4f4fb] to-[#fffbeb] shadow-2xl">
      <div className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-rose-300/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
      <main className="relative flex flex-1 flex-col px-6 pb-10 pt-14">
        <div className="mb-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-rose-400/80">faleme</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{brand.name}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">{brand.slogan}</p>
        </div>

        <div className="mb-5 flex rounded-[1.35rem] border border-white/60 bg-white/55 p-1 shadow-sm backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-[1.1rem] py-2.5 text-sm font-black transition ${mode === 'login' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 rounded-[1.1rem] py-2.5 text-sm font-black transition ${mode === 'register' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500'}`}
          >
            注册
          </button>
        </div>

        <div className="space-y-3 rounded-[1.75rem] border border-white/70 bg-white/70 p-5 shadow-lg shadow-rose-100/40 backdrop-blur-xl">
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-400">邮箱</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-black text-slate-400">密码</span>
            <input
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
              placeholder={mode === 'register' ? '至少 8 位' : ''}
            />
          </label>
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-400">昵称（可选）</span>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
                placeholder="嘴硬但健康的成年人"
              />
            </label>
          )}
          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-14 flex-1 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90">
                  {captchaUrl ? (
                    <img src={captchaUrl} alt="验证码" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">加载验证码…</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void loadCaptcha()}
                  className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600"
                >
                  换一张
                </button>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-slate-400">输入图中字符</span>
                <input
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm font-semibold outline-none focus:border-rose-300"
                  placeholder="不区分大小写"
                  autoCapitalize="none"
                />
              </label>
              <label className="flex items-start gap-3 pt-1">
                <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-1" />
                <span className="text-xs font-semibold leading-5 text-slate-600">我已满 18 周岁，理解本产品为成人向健康与记录工具。</span>
              </label>
            </>
          )}
          {err && <p className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{err}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-2 w-full rounded-2xl bg-rose-500 py-3.5 text-sm font-black text-white shadow-lg shadow-rose-300/50 disabled:opacity-50"
          >
            {busy ? '请稍候…' : mode === 'register' ? '注册并进入' : '登录'}
          </button>
        </div>

        <button
          type="button"
          onClick={onOffline}
          className="mt-6 w-full rounded-2xl border border-slate-200/80 bg-white/50 py-3 text-sm font-black text-slate-600 backdrop-blur-md"
        >
          使用完全离线模式（不同步账号）
        </button>
      </main>
    </div>
  );
}
