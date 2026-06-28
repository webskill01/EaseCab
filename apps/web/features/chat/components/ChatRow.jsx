'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Shield } from '@/components/ui/icons'

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
  const showRoute = Boolean(chat.otherName) && (chat.fromCityName || chat.toCityName)
  const preview = chat.lastMessageText || t('row.noMessages')
  return (
    <button
      type="button"
      onClick={() => router.push(`/messages/${chat.id}`)}
      className="flex w-full items-center gap-3 border-b border-ec-line bg-white px-4 py-[11px] text-left"
    >
      <span className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold ${chat.otherVerified ? 'bg-ec-blue text-white' : 'bg-ec-sky text-ec-blue'}`}>
        {(title || '?').slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[15px] font-extrabold text-ec-ink">{title}</span>
          {chat.otherVerified && <span className="shrink-0 text-ec-success"><Shield size={14} /></span>}
          {chat.isActive === false && (
            <span className="shrink-0 rounded-[5px] bg-ec-bg px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-ec-ink40">{t('row.closed')}</span>
          )}
        </span>
        {showRoute && (
          <span className="mt-px block truncate text-[11.5px] font-semibold text-ec-blueInk">{route}</span>
        )}
        <span className={`mt-[3px] block truncate text-[13px] ${chat.unreadCount > 0 ? 'font-bold text-ec-ink' : 'font-medium text-ec-ink60'}`}>{preview}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-[5px]">
        <span className="text-[11px] font-semibold text-ec-ink40">{shortTime(chat.lastMessageAt)}</span>
        {chat.unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ec-blue px-1.5 text-[11px] font-extrabold text-white">
            {chat.unreadCount}
          </span>
        )}
      </span>
    </button>
  )
}
