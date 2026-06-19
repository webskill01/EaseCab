'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { parsePost } from '../services/postApi'
import { ParsePreview } from './ParsePreview'

/** A draft has nothing usable when no route fragment, vehicle, or phone was read. */
function isEmptyDraft(d) {
  return !d.fromCityId && !d.fromCityRaw && !d.toCityId && !d.toCityRaw && !d.vehicleType && !d.phone
}

/**
 * WhatsApp-style free-text tab (SCREENS §5): paste a message → "Read message" →
 * backend parse → structured preview → continue into the prefilled form (paste
 * never posts directly, #9 / F5). On a failed/empty parse it offers the form.
 *
 * @param {object} props
 * @param {(draft: ?object) => void} props.onEdit - switch to the form, prefilled
 *   from the draft (or null to start blank)
 */
export function PasteForm({ onEdit }) {
  const t = useTranslations('post')
  const [text, setText] = useState('')
  const parse = useMutation({ mutationFn: (msg) => parsePost(msg) })

  const draft = parse.data
  const failed = parse.isError || (draft && isEmptyDraft(draft))

  if (draft && !failed) {
    return <ParsePreview draft={draft} onEdit={() => onEdit(draft)} />
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        aria-label={t('paste.boxLabel')}
        placeholder={t('paste.placeholder')}
        className="w-full rounded-ec-card border border-ec-line bg-white p-4 text-[14px] font-semibold text-ec-ink outline-none"
      />

      {failed && (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-ec-sky p-3 text-center">
          <p className="text-[13.5px] font-bold text-ec-blueInk">{t('paste.failed')}</p>
          <button type="button" onClick={() => onEdit(null)} className="text-[13.5px] font-extrabold text-ec-blue underline">
            {t('paste.useForm')}
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={text.trim() === '' || parse.isPending}
        onClick={() => parse.mutate(text.trim())}
        className="h-[54px] w-full rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue disabled:bg-ec-disabled disabled:shadow-none"
      >
        {parse.isPending ? '…' : t('paste.read')}
      </button>
    </div>
  )
}
