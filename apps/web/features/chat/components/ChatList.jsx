'use client'

import { useTranslations } from 'next-intl'
import { useChats } from '../hooks/useChats'
import { ChatRow } from './ChatRow'
import { EmptyList, ListSkeleton } from './ChatStates'

/** Chat list screen (/messages): the caller's conversations, newest activity first. */
export function ChatList() {
  const t = useTranslations('chat')
  const { chats, isLoading } = useChats()
  return (
    <div className="flex h-full flex-col bg-ec-bg">
      <header className="border-b border-ec-line bg-white px-4 py-3 text-[16px] font-extrabold text-ec-ink">
        {t('list.title')}
      </header>
      {isLoading ? (
        <ListSkeleton />
      ) : chats.length === 0 ? (
        <EmptyList />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {chats.map((c) => (
            <ChatRow key={c.id} chat={c} />
          ))}
        </div>
      )}
    </div>
  )
}
