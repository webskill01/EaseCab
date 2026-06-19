'use client'

import { useTranslations } from 'next-intl'
import { Check, CheckCheck } from '@/components/ui/icons'
import { tickState } from '../lib/chatView'

/** Short clock time for a bubble's sent stamp. */
function bubbleTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * One chat bubble. Mine align right (blue, tail bottom-right); inbound align left
 * (white, tail bottom-left). The footer row carries the sent time, plus a read tick
 * on my own bubbles — single (sent) vs double (read), driven by the other party's
 * lastReadAt.
 */
export function MessageBubble({ message, myId, otherLastReadAt }) {
  const t = useTranslations('chat')
  const mine = message.senderId === myId
  const tick = tickState(message, myId, otherLastReadAt)
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-[14px] font-medium ${
          mine ? 'rounded-br-[5px] bg-ec-blue text-white' : 'rounded-bl-[5px] border border-ec-line bg-white text-ec-ink'
        }`}
      >
        <span className="block whitespace-pre-wrap break-words leading-[1.4]">{message.messageText}</span>
        <span className="mt-[3px] flex items-center justify-end gap-1">
          <span className={`text-[10px] font-semibold ${mine ? 'text-white/70' : 'text-ec-ink40'}`}>{bubbleTime(message.sentAt)}</span>
          {mine && tick !== 'none' && (
            <span className={`inline-flex ${tick === 'read' ? 'text-[#93C5FD]' : 'text-white/60'}`} aria-label={t(`tick.${tick}`)}>
              {tick === 'read' ? <CheckCheck size={14} /> : <Check size={13} />}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
