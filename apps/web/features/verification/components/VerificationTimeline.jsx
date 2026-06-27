'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { OverlayHeader } from '@/components/ui/Overlay'
import { Steer, Shield, User, List, Car, Check, Info, ChevR, Headset } from '@/components/ui/icons'

/** One timeline node circle: filled green check when done, else outlined blue-ink. */
function StepNode({ done, Icon }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${done ? 'bg-ec-success text-white shadow-[0_2px_6px_rgba(16,185,129,0.35)]' : 'border-2 border-ec-blueInk bg-white text-ec-blueInk'}`}>
      {done ? <Check size={20} /> : <Icon size={18} />}
    </div>
  )
}

/**
 * Verification-status timeline (SCREENS §7, mockup verification.jsx VerificationStatusScreen).
 * Replaces the old DriverHub: shows all four credentials — Aadhaar + profile photo
 * (required to post) and DL + RC (verified-driver badge) — with done/pending state and
 * per-node actions. All state is data-backed from the profile verification block.
 */
export function VerificationTimeline({ profile }) {
  const t = useTranslations('verification')
  const tc = useTranslations('common')
  const router = useRouter()
  const v = profile?.verification ?? {}
  const hasPhoto = Boolean(profile?.profilePicUrl)
  const dl = v.dl ?? { status: v.dlSubmitted ? 'submitted' : 'none', rejectionReason: null }
  const rc = v.rc ?? { status: v.rcSubmitted ? 'submitted' : 'none', rejectionReason: null }
  // submitted/approved both read as "done" (progress); a rejection is called out in red.
  const docDone = (s) => s === 'approved' || s === 'submitted'

  const steps = [
    { key: 'aadhaar', title: t('timeline.aadhaar'), Icon: Shield, done: Boolean(v.aadhaarVerified), group: 'post', onView: () => router.push('/verify?intent=aadhaar-detail'), onComplete: () => router.push('/verify?intent=l1') },
    { key: 'photo', title: t('timeline.photo'), Icon: User, done: hasPhoto, group: 'post', hint: t('timeline.photoHint'), onComplete: () => router.push('/profile') },
    { key: 'dl', title: t('driver.dlTitle'), Icon: List, done: docDone(dl.status), rejected: dl.status === 'rejected', reason: dl.rejectionReason, group: 'badge', onView: () => router.push('/verify?intent=dl-detail'), onComplete: () => router.push('/verify?intent=dl') },
    { key: 'rc', title: t('driver.rcTitle'), Icon: Car, done: docDone(rc.status), rejected: rc.status === 'rejected', reason: rc.rejectionReason, group: 'badge', onView: () => router.push('/verify?intent=rc-detail'), onComplete: () => router.push('/verify?intent=rc') },
  ]
  const completed = steps.filter((s) => s.done).length
  const postReady = steps[0].done && steps[1].done
  let lastGroup = null

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <OverlayHeader title={t('timeline.pageTitle')} onBack={() => router.push('/profile')} backLabel={tc('actions.back')} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3.5 pb-6">
      {/* summary */}
      <div className="flex items-center gap-3 rounded-2xl border border-ec-blue/20 bg-ec-sky px-4 py-[15px]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-ec-blueInk shadow-ec-card"><Steer size={26} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-extrabold text-ec-blueInk">{t('timeline.title')}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ec-ink60">{t('timeline.stepsDone', { done: completed, total: steps.length })}</p>
        </div>
      </div>

      {/* posting-unlock status */}
      <div className={`mx-0.5 mb-1 mt-3 flex items-center gap-2 text-[12px] font-bold ${postReady ? 'text-ec-successTx' : 'text-ec-amberTx'}`}>
        <span className="inline-flex">{postReady ? <Check size={15} /> : <Info size={14} />}</span>
        {postReady ? t('timeline.postUnlocked') : t('timeline.postPending')}
      </div>

      {/* timeline */}
      <div className="mt-2.5">
        {steps.map((s, i) => {
          const groupHead = s.group !== lastGroup ? (s.group === 'post' ? t('timeline.groupPost') : t('timeline.groupBadge')) : null
          lastGroup = s.group
          return (
            <div key={s.key}>
              {groupHead && (
                <div className={`flex items-center gap-2 pl-0.5 ${i === 0 ? 'mb-3 mt-1' : 'mb-3 mt-1.5'}`}>
                  <span className={`text-[10.5px] font-extrabold uppercase tracking-[0.06em] ${s.group === 'post' ? 'text-ec-blueInk' : 'text-ec-ink60'}`}>{groupHead}</span>
                  <div className="h-px flex-1 bg-ec-line" />
                </div>
              )}
              <div className="flex gap-3.5">
                <div className="flex shrink-0 flex-col items-center">
                  <StepNode done={s.done} Icon={s.Icon} />
                  {i < steps.length - 1 && <div className={`mt-1 min-h-[14px] w-0.5 flex-1 ${s.done ? 'bg-ec-success' : 'bg-ec-line'}`} />}
                </div>
                <div className="min-w-0 flex-1 pb-3.5">
                  <div className={`rounded-2xl border bg-white p-3.5 shadow-ec-card ${s.rejected ? 'border-ec-danger/40' : s.done ? 'border-ec-success/30' : 'border-ec-line'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex ${s.done ? 'text-ec-successTx' : 'text-ec-ink'}`}><s.Icon size={20} /></span>
                      <span className={`flex-1 text-[15px] font-extrabold ${s.done ? 'text-ec-successTx' : 'text-ec-ink'}`}>{s.title}</span>
                      {s.rejected ? (
                        <span className="inline-flex items-center rounded-full bg-ec-dangerBg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ec-danger">{t('center.rejected')}</span>
                      ) : s.done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ec-successBg px-2.5 py-1 text-[11.5px] font-extrabold text-ec-successTx"><Check size={12} />{t('timeline.verified')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ec-warnBg px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ec-amberTx"><span className="h-1.5 w-1.5 rounded-full bg-ec-warning" />{t('timeline.pending')}</span>
                      )}
                    </div>
                    {s.done ? (
                      s.onView && (
                        <button type="button" onClick={s.onView} className="mt-2.5 flex w-full items-center gap-2 rounded-[10px] bg-ec-successBg/60 px-2.5 py-2 text-[12.5px] font-bold text-ec-successTx">
                          <Shield size={16} /><span className="flex-1 text-left">{t('timeline.view')}</span><ChevR size={15} />
                        </button>
                      )
                    ) : (
                      <>
                        {s.rejected && s.reason && <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-ec-danger">{t('center.reasonLabel', { reason: s.reason })}</p>}
                        {s.hint && !s.rejected && <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-ec-ink60">{s.hint}</p>}
                        <button type="button" onClick={s.onComplete} className="mt-2.5 h-11 w-full rounded-[10px] bg-ec-blueInk text-[14px] font-extrabold text-white">{t('timeline.completeNow')}</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* help */}
      <button type="button" onClick={() => router.push('/membership')} className="mt-1 flex w-full items-center gap-3 rounded-2xl bg-ec-sky px-4 py-3.5 text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ec-blueInk"><Headset size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-extrabold text-ec-blueInk">{t('timeline.needHelp')}</p>
          <p className="mt-0.5 text-[12px] font-semibold text-ec-ink60">{t('timeline.contactSupport')}</p>
        </div>
        <span className="inline-flex text-ec-blueInk"><ChevR size={18} /></span>
      </button>
      </div>
    </div>
  )
}
