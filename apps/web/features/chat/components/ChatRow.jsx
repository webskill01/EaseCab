'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

/** Short clock time for the last-activity stamp. */
function shortTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * One conversation row in the chat list (Step 22): avatar initial, other-party name
 * (or route as fallback), last-message preview, time, and an unread pill. Tapping
 * opens the thread.
 */
export function ChatRow({ chat }) {
  const router = useRouter()
  const t = useTranslations('chat')
  const route = `${chat.fromCityName ?? ''} → ${chat.toCityName ?? ''}`
  const title = chat.otherName || route
  const preview = chat.lastMessageText || t('row.noMessages')
  return (
    <button
      type="button"
      onClick={() => router.push(`/messages/${chat.id}`)}
      className="flex w-full items-center gap-3 border-b border-ec-line bg-white px-3.5 py-3 text-left"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ec-sky text-[15px] font-extrabold text-ec-blue">
        {(title || '?').slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[14px] font-extrabold text-ec-ink">{title}</span>
          <span className="shrink-0 text-[11px] font-semibold text-ec-ink40">{shortTime(chat.lastMessageAt)}</span>
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span className="truncate text-[12.5px] font-semibold text-ec-ink60">{preview}</span>
          {chat.unreadCount > 0 && (
            <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-ec-blue px-1 text-[11px] font-extrabold text-white">
              {chat.unreadCount}
            </span>
          )}
        </span>
        {chat.otherName && (chat.fromCityName || chat.toCityName) && (
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-ec-ink40">{route}</span>
        )}
      </span>
    </button>
  )
}
