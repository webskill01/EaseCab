'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { Whatsapp } from '@/components/ui/icons'
import { useGroupMode } from '../hooks/useGroupMode'

// Sample rows for the free preview — never real data (numbers are the paid part).
const PREVIEW_ROWS = [
  ['EC', 'previewDuties', 'previewDutiesMsg', 3],
  ['C', 'previewCity1', 'previewMsg1', 12],
  ['D', 'previewCity2', 'previewMsg2', 27],
  ['A', 'previewCity3', 'previewMsg3', 5],
]

/** Free users: one-screen look at Group Mode + the pay CTA. */
function PreviewSheet({ onClose }) {
  const t = useTranslations('rides.group')
  const tc = useTranslations('common')
  const router = useRouter()
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('preview.title')}>
      <h2 className="pr-9 text-[18px] font-extrabold leading-tight text-ec-ink">{t('preview.title')}</h2>
      <p className="mt-1 text-[13px] font-semibold leading-snug text-ec-ink60">{t('preview.sub')}</p>
      <ul aria-hidden className="mt-3 overflow-hidden rounded-ec-card border border-ec-line bg-white">
        {PREVIEW_ROWS.map(([icon, name, msg, n]) => (
          <li key={name} className="flex items-center gap-3 border-b border-ec-line px-3 py-2.5 last:border-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ec-successBg text-[15px] font-extrabold text-ec-successTx">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold text-ec-ink">{t(`preview.${name}`)}</p>
              <p className="truncate text-[12.5px] text-ec-ink60">{t(`preview.${msg}`)}</p>
            </div>
            <span className="min-w-[22px] rounded-full bg-ec-wa px-1.5 text-center text-[11px] font-extrabold leading-[22px] text-white">{n}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-col gap-2 pb-2">
        <Button type="button" size="lg" variant="wa" className="w-full" onClick={() => router.push('/membership')}>{t('preview.cta')}</Button>
        <Button type="button" variant="ghost" onClick={onClose} className="w-full bg-ec-bg font-bold text-ec-ink60">{t('preview.notNow')}</Button>
      </div>
    </BottomSheet>
  )
}

/**
 * Feed header switch (far right): normal view = solid green, switch off; Group Mode on =
 * grey, switch on. Paid → flips the saved toggle; free → the preview sheet.
 */
export function GroupModeToggle() {
  const t = useTranslations('rides.group')
  const gm = useGroupMode()
  const [preview, setPreview] = useState(false)
  const onClick = () => (gm.paid ? gm.put({ enabled: !gm.on }) : setPreview(true))
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={gm.on}
        onClick={onClick}
        disabled={!gm.ready}
        className={`relative flex h-10 shrink-0 items-center gap-1 rounded-xl border-[1.5px] px-2 text-[12.5px] font-extrabold shadow-ec-card transition-colors ${
          gm.on ? 'border-ec-line bg-white text-ec-ink' : 'border-transparent bg-ec-wa text-white'
        }`}
      >
        <span className={`inline-flex ${gm.on ? 'text-ec-waDeep' : 'text-white'}`}><Whatsapp size={17} /></span>
        {/* Label names where the tap goes: "Group" from the feed, "App" back from Group Mode. */}
        <span className="min-w-[2.4rem] whitespace-nowrap text-center">{gm.on ? t('toApp') : t('toggle')}</span>
        <span className={`relative ml-0.5 h-[18px] w-8 shrink-0 rounded-full transition-colors ${gm.on ? 'bg-ec-wa' : 'bg-white/40'}`}>
          <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-[left] duration-200 ${gm.on ? 'left-[16px]' : 'left-[2px]'}`} />
        </span>
        {!gm.on && <span className="absolute -right-1.5 -top-2 rounded-full bg-ec-danger px-1.5 text-[9.5px] font-extrabold leading-4 text-white ring-2 ring-white">{t('new')}</span>}
      </button>
      {preview && <PreviewSheet onClose={() => setPreview(false)} />}
    </>
  )
}
