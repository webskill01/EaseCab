'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Send } from '@/components/ui/icons'

/**
 * Thread composer. Disabled (read-only) once the ride expires — the placeholder then
 * explains why. Submits on Enter or the send button; trims + clears on send.
 */
export function Composer({ disabled, onSend }) {
  const t = useTranslations('chat')
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const v = text.trim()
    if (!v || disabled) return
    onSend(v)
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-ec-line bg-white px-3 py-2.5">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        placeholder={disabled ? t('thread.readOnly') : t('thread.composerPlaceholder')}
        className="h-11 flex-1 rounded-full border border-ec-line bg-ec-bg px-4 text-[14px] font-medium text-ec-ink placeholder:text-ec-ink40 disabled:opacity-70"
      />
      <button
        type="submit"
        disabled={disabled}
        aria-label={t('thread.send')}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ec-blue text-white disabled:opacity-40"
      >
        <Send size={18} />
      </button>
    </form>
  )
}
