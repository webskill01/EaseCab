'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { ChevronLeft, Swap, Info, Shield, Dots, Flag, Lock } from '@/components/ui/icons'
import { ReportSheet } from '@/features/rides/components/ReportSheet'
import { ConfirmSheet } from '@/features/rides/components/ConfirmSheet'
import { RIDE_KIND } from '@/features/rides/lib/rideView'
import { useChatThread } from '../hooks/useChatThread'
import { blockUser } from '../services/chatApi'
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
  const { meta, live, pending, isActive, send, sendImage } = useChatThread(chatId, myId)
  const [menu, setMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  const messages = mergeLiveMessages(live, pending)
  const amPoster = meta.posterId === myId
  const otherRead = otherLastReadAt(meta, amPoster)
  const otherId = amPoster ? meta.initiatorId : meta.posterId

  async function onBlock() {
    setConfirmBlock(false)
    if (otherId) { try { await blockUser(otherId) } catch { /* best-effort; menu already closed */ } }
    qc.invalidateQueries({ queryKey: ['chats'] })
    router.push('/messages')
  }

  const cached = (qc.getQueryData(['chats']) || []).find((c) => c.id === chatId)
  const headerTitle = cached?.otherName || (cached ? `${cached.fromCityName ?? ''} → ${cached.toCityName ?? ''}` : t('list.title'))
  const hasRoute = Boolean(cached?.fromCityName || cached?.toCityName)

  return (
    <div className="flex h-full flex-col bg-ec-bg">
      <header className="flex items-center gap-2.5 border-b border-ec-line bg-white px-3 py-2.5">
        <button type="button" onClick={() => router.push('/messages')} aria-label={t('thread.back')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ec-ink">
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          onClick={() => otherId && router.push(`/u/${otherId}`)}
          disabled={!otherId}
          aria-label={t('thread.viewProfile')}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left disabled:cursor-default"
        >
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${cached?.otherVerified ? 'bg-ec-blue text-white' : 'bg-ec-sky text-ec-blue'}`}>
            {(headerTitle || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[15px] font-extrabold text-ec-ink">{headerTitle}</span>
              {cached?.otherVerified && <span className="shrink-0 text-ec-success"><Shield size={13} /></span>}
            </span>
            {cached?.otherBaseCity && <span className="block truncate text-[11.5px] font-semibold text-ec-ink40">{cached.otherBaseCity}</span>}
          </span>
        </button>
        <button type="button" onClick={() => setMenu((m) => !m)} aria-label={t('thread.menu')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ec-ink60">
          <Dots size={20} />
        </button>
        {menu && (
          <>
            <div onClick={() => setMenu(false)} className="fixed inset-0 z-40" aria-hidden="true" />
            <div className="absolute right-2 top-12 z-50 w-44 overflow-hidden rounded-xl border border-ec-line bg-white py-1 shadow-ec-card">
              <button type="button" onClick={() => { setMenu(false); setShowReport(true) }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] font-bold text-ec-ink">
                <Flag size={16} />{t('thread.report')}
              </button>
              <button type="button" onClick={() => { setMenu(false); setConfirmBlock(true) }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13.5px] font-bold text-ec-danger">
                <Lock size={16} />{t('thread.block')}
              </button>
            </div>
          </>
        )}
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
      <Composer disabled={!isActive} onSend={send} onSendImage={sendImage} />

      {showReport && meta.postedRideId && (
        <ReportSheet ride={{ id: meta.postedRideId, kind: RIDE_KIND.VERIFIED }} onClose={() => setShowReport(false)} />
      )}
      {confirmBlock && (
        <ConfirmSheet
          title={t('thread.blockTitle')}
          body={t('thread.blockBody')}
          confirmLabel={t('thread.block')}
          danger
          onConfirm={onBlock}
          onClose={() => setConfirmBlock(false)}
        />
      )}
    </div>
  )
}
