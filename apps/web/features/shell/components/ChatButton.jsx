'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Chat } from '@/components/ui/icons'
import { useChats } from '@/features/chat/hooks/useChats'

/**
 * Top-bar Chats button (chrome.jsx TopBar). Routes to the messages list and shows a
 * total-unread badge (Step 22) driven by the chat list query.
 */
export function ChatButton() {
  const router = useRouter()
  const t = useTranslations('common')
  const { totalUnread } = useChats()
  return (
    <button
      type="button"
      onClick={() => router.push('/messages')}
      aria-label={t('shell.chats')}
      className="relative flex shrink-0 flex-col items-center gap-0.5 px-1 text-ec-ink60"
    >
      <Chat size={21} />
      {totalUnread > 0 && (
        <span className="absolute -right-0.5 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-ec-blue px-1 text-[10px] font-extrabold text-white">
          {totalUnread}
        </span>
      )}
      <span className="text-[9px] font-extrabold tracking-wide text-ec-ink60">{t('shell.chats')}</span>
    </button>
  )
}
