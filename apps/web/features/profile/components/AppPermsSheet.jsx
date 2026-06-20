'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Lock, Pin, BellEdit, Battery, Check } from '@/components/ui/icons'
import { PERM } from '../lib/appPerms'
import { useAppPerms } from '../hooks/useAppPerms'

/** Left icon tile — green/filled once granted, sky/outline otherwise (mockup PermsSheet). */
function PermTile({ icon, granted }) {
  return (
    <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl ${granted ? 'bg-ec-success text-white' : 'bg-ec-sky text-ec-blue'}`}>
      {granted ? <Check size={20} /> : icon}
    </span>
  )
}

/**
 * One permission row. `state` is a PERM value; `onAllow` (when given) requests it.
 * GRANTED shows a check; PROMPT shows an Allow button; DENIED/UNSUPPORTED are read-only
 * with a hint (a denied web permission can't be re-prompted; battery has no web API).
 */
function PermRow({ icon, title, sub, state, hint, onAllow }) {
  const t = useTranslations('profile')
  const granted = state === PERM.GRANTED
  return (
    <div className={`flex items-center gap-3 rounded-2xl border-[1.5px] p-3 ${granted ? 'border-ec-success/40 bg-ec-successBg/40' : 'border-ec-line bg-white'}`}>
      <PermTile icon={icon} granted={granted} />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-extrabold text-ec-ink">{title}</div>
        <div className="mt-0.5 text-[12px] font-medium leading-snug text-ec-ink60">{sub}</div>
      </div>
      {granted ? (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ec-success text-white"><Check size={13} /></span>
      ) : state === PERM.PROMPT && onAllow ? (
        <button type="button" onClick={onAllow} className="shrink-0 rounded-[10px] bg-ec-blue px-3.5 py-2 text-[12.5px] font-extrabold text-white shadow-ec-blue">
          {t('perms.allow')}
        </button>
      ) : (
        <span className="shrink-0 text-[11.5px] font-bold text-ec-ink40">{hint}</span>
      )}
    </div>
  )
}

/**
 * App permissions sheet (Profile → App permissions, T2-D / profile.jsx PermsSheet).
 * Shows the real browser state for Notifications + Location with an Allow prompt;
 * battery optimization is informational (an Android/TWA phone setting, no web API).
 * @param {{ onClose: () => void }} props
 */
export function AppPermsSheet({ onClose }) {
  const t = useTranslations('profile')
  const { push, location, requestPush, requestLocation } = useAppPerms()
  const blockedHint = (state) => (state === PERM.DENIED ? t('perms.blocked') : t('perms.phoneHint'))
  return (
    <BottomSheet onClose={onClose} label={t('perms.title')}>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ec-sky text-ec-blue"><Lock size={20} /></span>
        <div>
          <h2 className="text-[17px] font-extrabold text-ec-ink">{t('perms.title')}</h2>
          <p className="text-[12.5px] font-medium text-ec-ink60">{t('perms.sub')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <PermRow icon={<Pin size={20} />} title={t('perms.location')} sub={t('perms.locationSub')} state={location} hint={blockedHint(location)} onAllow={requestLocation} />
        <PermRow icon={<BellEdit size={20} />} title={t('perms.push')} sub={t('perms.pushSub')} state={push} hint={blockedHint(push)} onAllow={requestPush} />
        <PermRow icon={<Battery size={20} />} title={t('perms.battery')} sub={t('perms.batterySub')} state={PERM.UNSUPPORTED} hint={t('perms.phoneHint')} />
      </div>

      <button type="button" onClick={onClose} className="mt-4 h-[52px] w-full rounded-xl bg-ec-blue text-[15px] font-extrabold text-white shadow-ec-blue">
        {t('perms.done')}
      </button>
      <p className="mt-2.5 text-center text-[11.5px] font-medium text-ec-ink40">{t('perms.hint')}</p>
    </BottomSheet>
  )
}
