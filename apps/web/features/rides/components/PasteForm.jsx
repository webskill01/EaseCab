'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 pt-3">
        <div className="flex flex-col gap-1.5">
          <p className="text-[14px] font-bold leading-snug text-ec-ink">{t('paste.prompt')}</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            aria-label={t('paste.boxLabel')}
            placeholder={t('paste.placeholder')}
            className="w-full rounded-ec-card border border-ec-line bg-white p-4 text-[14px] font-semibold text-ec-ink outline-none"
          />
        </div>

        {failed && (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-ec-sky p-3 text-center">
            <p className="text-[13.5px] font-bold text-ec-blueInk">{t('paste.failed')}</p>
            <button type="button" onClick={() => onEdit(null)} className="text-[13.5px] font-extrabold text-ec-blue underline">
              {t('paste.useForm')}
            </button>
          </div>
        )}
      </div>

      {/* Pinned action bar — shrink-0 flex footer outside the scroll body (P13-1). */}
      <div className="shrink-0 border-t border-ec-line bg-white px-4 py-3">
        <Button
          type="button"
          size="lg"
          disabled={text.trim() === '' || parse.isPending}
          onClick={() => parse.mutate(text.trim())}
          className="w-full"
        >
          {parse.isPending ? '…' : t('paste.read')}
        </Button>
      </div>
    </div>
  )
}
