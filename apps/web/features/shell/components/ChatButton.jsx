'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Chat } from '@/components/ui/icons'

/**
 * Top-bar Chats button (chrome.jsx TopBar). Routes to the messages list. The unread
 * badge + real chat list land with the Chat UI (Step 22) — routes to a placeholder
 * until then.
 */
export function ChatButton() {
  const router = useRouter()
  const t = useTranslations('common')
  return (
    <button
      type="button"
      onClick={() => router.push('/messages')}
      aria-label={t('shell.chats')}
      className="flex shrink-0 flex-col items-center gap-0.5 px-1 text-ec-ink60"
    >
      <Chat size={21} />
      <span className="text-[9px] font-extrabold tracking-wide text-ec-ink60">{t('shell.chats')}</span>
    </button>
  )
}
