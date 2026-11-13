'use client'

import { useTranslations } from 'next-intl'
import { Warning } from '@/components/ui/icons'

/**
 * Why a form can't be submitted yet, shown after a tap on its (still enabled) submit
 * button instead of a silently greyed-out one.
 * @param {{ items: string[] }} props - already-translated lines
 */
export function FormIssues({ items }) {
  const t = useTranslations('common')
  if (!items.length) return null
  return (
    <div role="alert" className="rounded-xl border border-ec-danger/30 bg-ec-dangerBg px-3.5 py-3 text-ec-danger">
      <p className="flex items-center gap-1.5 text-[13px] font-extrabold"><Warning size={15} />{t('form.fixTitle')}</p>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13px] font-semibold">
        {items.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </div>
  )
}
