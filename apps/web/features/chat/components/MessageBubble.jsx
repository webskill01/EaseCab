'use client'

import { useTranslations } from 'next-intl'
import { Check, CheckCheck } from '@/components/ui/icons'
import { tickState } from '../lib/chatView'

/**
 * One chat bubble. Mine align right (blue); inbound align left (white). Ticks render
 * only on my own bubbles — single (sent) vs double (read), driven by the other
 * party's lastReadAt.
 */
export function MessageBubble({ message, myId, otherLastReadAt }) {
  const t = useTranslations('chat')
  const mine = message.senderId === myId
  const tick = tickState(message, myId, otherLastReadAt)
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13.5px] font-medium ${mine ? 'bg-ec-blue text-white' : 'border border-ec-line bg-white text-ec-ink'}`}>
        <span className="whitespace-pre-wrap break-words">{message.messageText}</span>
        {mine && tick !== 'none' && (
          <span className="ml-1 inline-flex align-middle text-white/80" aria-label={t(`tick.${tick}`)}>
            {tick === 'read' ? <CheckCheck size={14} /> : <Check size={13} />}
          </span>
        )}
      </div>
    </div>
  )
}
