'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { ChevronLeft, Swap, Info } from '@/components/ui/icons'
import { useChatThread } from '../hooks/useChatThread'
import { mergeLiveMessages, otherLastReadAt } from '../lib/chatView'
import { MessageBubble } from './MessageBubble'
import { Composer } from './Composer'
import { EmptyThread } from './ChatStates'

/**
 * Live chat thread (/messages/[id]). Messages stream from Firestore via useChatThread;
 * sends go through the API. The header title comes from the chats-list cache when the
 * user navigated from the list, else falls back to a generic label (deep link).
 */
export function ChatThread({ chatId }) {
  const t = useTranslations('chat')
  const router = useRouter()
  const qc = useQueryClient()
  const { data: profile } = useProfile()
  const myId = profile?.id
  const { meta, live, pending, isActive, send } = useChatThread(chatId, myId)

  const messages = mergeLiveMessages(live, pending)
  const amPoster = meta.posterId === myId
  const otherRead = otherLastReadAt(meta, amPoster)

  const cached = (qc.getQueryData(['chats']) || []).find((c) => c.id === chatId)
  const headerTitle = cached?.otherName || (cached ? `${cached.fromCityName ?? ''} → ${cached.toCityName ?? ''}` : t('list.title'))
  const hasRoute = Boolean(cached?.fromCityName || cached?.toCityName)

  return (
    <div className="flex h-full flex-col bg-ec-bg">
      <header className="flex items-center gap-2 border-b border-ec-line bg-white px-2 py-2.5">
        <button type="button" onClick={() => router.push('/messages')} aria-label={t('thread.back')} className="flex h-9 w-9 items-center justify-center rounded-full text-ec-ink60">
          <ChevronLeft size={22} />
        </button>
        <span className="truncate text-[15px] font-extrabold text-ec-ink">{headerTitle}</span>
      </header>
      {hasRoute && (
        <div className="flex items-center gap-2 border-b border-ec-line bg-ec-sky px-3.5 py-2">
          <span className="inline-flex text-ec-blue"><Swap size={15} /></span>
          <span className="truncate text-[12.5px] font-extrabold text-ec-blueInk">{cached.fromCityName} → {cached.toCityName}</span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <EmptyThread />
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} message={m} myId={myId} otherLastReadAt={otherRead} />
          ))
        )}
      </div>
      {!isActive && (
        <div className="flex items-center justify-center gap-1.5 border-t border-ec-line bg-ec-bg px-4 py-2.5 text-center text-[12.5px] font-semibold text-ec-ink60">
          <Info size={14} />{t('thread.readOnly')}
        </div>
      )}
      <Composer disabled={!isActive} onSend={send} />
    </div>
  )
}
