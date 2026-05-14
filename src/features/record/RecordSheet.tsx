import {CheckCircle2, Flame, Send, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useEffect, useMemo, useState} from 'react';
import {AdviceCard} from '../../components/AdviceCard';
import {ExpandableHelp} from '../../components/ExpandableHelp';
import {OptionGroup} from '../../components/OptionGroup';
import {ToggleRow} from '../../components/ToggleRow';
import {intimacyTypeLabels, protectionLabels} from '../../design/copy';
import {polyRecordPickerFlair} from '../../design/modeFlair';
import type {HealthAdvice, IntimacyType, PartnerHub, ProtectionMethod, RecordDraft} from '../../types/domain';
import {normalizeRelationshipMode} from '../../types/domain';

export function RecordSheet({
  isOpen,
  advice,
  partnerHub,
  topBanter,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  advice: HealthAdvice;
  partnerHub: PartnerHub;
  topBanter?: string | null;
  onClose: () => void;
  onSave: (draft: RecordDraft) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [type, setType] = useState<IntimacyType>('penetrative');
  const [protection, setProtection] = useState<ProtectionMethod>('condom');
  const [rating, setRating] = useState(4);
  const [consentChecked, setConsentChecked] = useState(true);
  const [sharedWithPartner, setSharedWithPartner] = useState(false);
  const [targetPartnerId, setTargetPartnerId] = useState('');

  const mode = normalizeRelationshipMode(partnerHub.relationshipMode);
  const linkedRows = useMemo(
    () => (partnerHub.partners ?? []).filter((p) => p.status === 'linked' && p.partnerId),
    [partnerHub],
  );
  const partnerLinked = linkedRows.length > 0;
  const shareMode = partnerLinked && sharedWithPartner;
  const pickPartner = mode === 'poly' && linkedRows.length > 1;
  const twoStep = partnerLinked;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setStep(1);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const ids = linkedRows.map((r) => r.partnerId).filter(Boolean) as string[];
    setTargetPartnerId((prev) => (ids.includes(prev) ? prev : ids[0] ?? ''));
  }, [isOpen, linkedRows]);

  const submitDraft = () => {
    onSave({
      type,
      protection,
      rating,
      consentChecked,
      sharedWithPartner,
      ...(pickPartner && targetPartnerId ? {targetPartnerId} : {}),
    });
  };

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
            animate={{y: 0, scale: 1}}
            className="absolute bottom-2 left-2 right-2 z-50 flex max-h-[min(84dvh,calc(100%-1rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:bottom-3 sm:left-3 sm:right-3"
            exit={{y: '100%'}}
            initial={{y: '100%'}}
            transition={{type: 'spring', damping: 30, stiffness: 320}}
          >
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">记录这次亲密</h2>
                <ExpandableHelp
                  summary="一句话：记清楚，才好对自己负责。"
                  detail="数据默认只在你账号里；勾选「法法同步」才会向对方发起确认申请，对方接受后双方才各有一条同步记录。"
                />
              </div>
              <button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500" aria-label="关闭记录面板">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {topBanter ? (
                <motion.div
                  initial={{scale: 0.98, opacity: 0.9}}
                  animate={{scale: 1, opacity: 1}}
                  transition={{type: 'spring', stiffness: 420, damping: 28}}
                  className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/80 px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800/80">安全员插播</p>
                  <p className="mt-1.5 text-sm font-bold leading-relaxed text-amber-950">{topBanter}</p>
                </motion.div>
              ) : null}

              {step === 1 ? (
                <>
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
                    <p className="mb-3 text-sm font-black text-slate-800">体验评分</p>
                    <div className="flex justify-between rounded-3xl bg-slate-50 p-4" role="group" aria-label="体验评分 1 到 5 星">
                      {[1, 2, 3, 4, 5].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setRating(item)}
                          aria-label={`评分 ${item} 星`}
                          aria-pressed={item <= rating}
                          className={item <= rating ? 'text-rose-600' : 'text-slate-300'}
                        >
                          <Flame className={item <= rating ? 'fill-rose-500' : ''} size={34} strokeWidth={item <= rating ? 2 : 1.5} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <ToggleRow checked={consentChecked} label="双方明确同意" onChange={setConsentChecked} />
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-slate-900">更多选项</p>
                  <p className="text-xs font-semibold text-slate-500">大多数人只记私密一条；需要同步给搭子时再打开下面开关。</p>
                  <ToggleRow
                    checked={sharedWithPartner}
                    label="发起法法同步（共享给已绑定伴侣）"
                    disabled={!partnerLinked && !sharedWithPartner}
                    onChange={setSharedWithPartner}
                  />
                  {!partnerLinked ? (
                    <p className="text-xs leading-5 text-amber-800">绑定伴侣后，才能向对方发起「法法同步」申请（对方需在收件箱确认）。</p>
                  ) : null}
                  {mode === 'poly' ? <p className="text-xs font-semibold text-violet-800">{polyRecordPickerFlair()}</p> : null}
                  {pickPartner ? (
                    <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                      <p className="text-xs font-black text-violet-900">选择本次搭子</p>
                      <label htmlFor="record-partner-select" className="sr-only">
                        选择关联伴侣
                      </label>
                      <select
                        id="record-partner-select"
                        value={targetPartnerId}
                        onChange={(e) => setTargetPartnerId(e.target.value)}
                        className="mt-3 w-full rounded-2xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-violet-400"
                      >
                        {linkedRows.map((r) => (
                          <option key={r.partnerId} value={r.partnerId}>
                            {r.peerNickname?.trim() || r.partnerId}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {partnerLinked && sharedWithPartner ? (
                    <ExpandableHelp
                      summary="不会立刻写入双方记录。"
                      detail="对方在「伴侣 → 法法同步收件箱」点接受后，才会各自生成一条带评分的同步记录；点拒绝则只通知你，不留共同记录。"
                    />
                  ) : null}
                </>
              )}
            </div>
            <div className="ios-safe-bottom border-t border-slate-100 bg-white p-6">
              {twoStep && step === 1 ? (
                <motion.button
                  type="button"
                  whileTap={{scale: 0.985}}
                  onClick={() => setStep(2)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-black text-white"
                >
                  下一步：共享与搭子
                </motion.button>
              ) : twoStep && step === 2 ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-black text-slate-700"
                  >
                    上一步
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{scale: 0.985}}
                    onClick={submitDraft}
                    className="flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-black text-white"
                  >
                    {shareMode ? <Send size={22} aria-hidden /> : <CheckCircle2 size={22} aria-hidden />}
                    {shareMode ? '发送同步申请' : '保存记录'}
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  type="button"
                  whileTap={{scale: 0.985}}
                  onClick={submitDraft}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-lg font-black text-white"
                >
                  <CheckCircle2 size={22} aria-hidden />
                  保存记录
                </motion.button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
