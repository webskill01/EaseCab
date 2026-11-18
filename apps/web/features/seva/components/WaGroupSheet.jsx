'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Whatsapp, Chat } from '@/components/ui/icons'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { ProfileSteps } from '@/features/profile/components/ProfileGate'
import { WA_APPROVAL_DISPLAY, waApprovalHref } from '../lib/waGroup'

const BTN = 'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-[14px] font-extrabold leading-tight transition-transform active:scale-[0.98]'

/**
 * "Humara WhatsApp group" popup: no invite link in the app. The driver sends the request
 * template to the admin number; the Manager-Bot replies with the link to that same
 * WhatsApp number, so the later join request comes from a number it knows. An
 * incomplete profile sees the profile steps instead: the approval message and the
 * manager bots' templates need the name.
 * @param {{ onClose: () => void }} props
 */
export function WaGroupSheet({ onClose }) {
  const t = useTranslations('seva.wa')
  const tc = useTranslations('common')
  const profile = useProfile().data
  const prefill = t('prefill', { name: profile?.name || '', phone: profile?.phone ? String(profile.phone).replace(/^\+91/, '') : '' })
  if (profile && !profile.profileComplete) {
    return (
      <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('title')}>
        <ProfileSteps profile={profile} sub={t('needProfile')} />
      </BottomSheet>
    )
  }
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('title')}>
      <SheetTitle icon={<Whatsapp size={22} />} tone="success" title={t('title')} sub={t('sub')} />
      <p className="mb-3 break-words rounded-xl bg-ec-successBg px-3 py-2 text-center text-[13.5px] font-extrabold tracking-wide text-ec-successTx">{t('group')}</p>
      <p className="mb-3 rounded-xl bg-ec-warnBg px-3 py-2 text-center text-[13px] font-bold leading-snug text-ec-warning">{t('sameNumber')}</p>
      <ol className="mb-3 space-y-2">
        {['step1', 'step2', 'step3'].map((k, i) => (
          <li key={k} className="flex items-start gap-2.5 rounded-2xl border border-ec-line bg-ec-bg p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ec-wa text-[12px] font-extrabold text-white">{i + 1}</span>
            <p className="min-w-0 flex-1 pt-0.5 text-[13.5px] font-semibold leading-snug text-ec-ink">
              {t.rich(k, { number: WA_APPROVAL_DISPLAY, b: (c) => <b className="whitespace-nowrap font-extrabold">{c}</b> })}
            </p>
          </li>
        ))}
      </ol>
      <a href={waApprovalHref(prefill)} target="_blank" rel="noopener noreferrer" className={`${BTN} bg-ec-wa text-white`}>
        <Chat size={18} />{t('message')}
      </a>
    </BottomSheet>
  )
}
