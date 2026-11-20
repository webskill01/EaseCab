'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Flag, Phone, Whatsapp, Check } from '@/components/ui/icons'
import { ReportSheet } from '@/features/rides/components/ReportSheet'

const COPIED_CLOSE_MS = 700
const ROW = 'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-bold active:bg-ec-bg'

/** Long-press menu on a group bubble: call, copy, share to WhatsApp, report. */
export function BubbleActions({ target, onClose, onContact }) {
  const t = useTranslations('rides.group.actions')
  const tc = useTranslations('common')
  const [copied, setCopied] = useState(false)
  const [reporting, setReporting] = useState(false)
  if (reporting) return <ReportSheet ride={target.vm} onClose={onClose} />

  const copy = async () => {
    try { await navigator.clipboard.writeText(target.text) } catch (err) { console.warn('copy failed', err?.name); return }
    setCopied(true)
    setTimeout(onClose, COPIED_CLOSE_MS)
  }
  const share = () => { window.open(`https://wa.me/?text=${encodeURIComponent(target.text)}`, '_blank', 'noopener'); onClose() }
  const canCall = !target.vm.done
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('title')}>
      <p className="line-clamp-2 pr-9 text-[13px] font-semibold text-ec-ink60">{target.text}</p>
      <div className="mt-2 flex flex-col pb-2">
        {canCall && <button type="button" className={`${ROW} text-ec-ink`} onClick={() => { onClose(); onContact(target.vm) }}><span className="text-ec-waDeep"><Phone size={20} /></span>{t('call')}</button>}
        <button type="button" className={`${ROW} text-ec-ink`} onClick={copy}>
          <span className="text-ec-blue">{copied ? <Check size={20} /> : <CopyGlyph />}</span>{copied ? t('copied') : t('copy')}
        </button>
        <button type="button" className={`${ROW} text-ec-ink`} onClick={share}><span className="text-ec-waDeep"><Whatsapp size={20} /></span>{t('share')}</button>
        <button type="button" className={`${ROW} text-ec-danger`} onClick={() => setReporting(true)}><Flag size={20} />{t('report')}</button>
      </div>
    </BottomSheet>
  )
}

// ponytail: one inline glyph instead of growing the shared icon set for a single use.
function CopyGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  )
}
