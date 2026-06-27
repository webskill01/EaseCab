'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { BellEdit } from '@/components/ui/icons'
import { useRidesFeed, FEED_SUB } from '../hooks/useRidesFeed'
import { readCityLock, writeCityLock } from '../lib/cityLock'
import { getMembership } from '@/features/subscription/services/subscriptionApi'
import { membershipView } from '@/features/subscription/lib/membership'
import { SubTabs } from './SubTabs'
import { CityFilter } from './CityFilter'
import { FeedBanner } from './FeedBanner'
import { RideCard } from './RideCard'
import { RideCardSkeleton, CatchingUp, EmptyFeed } from './FeedStates'
import { NewRidesPill } from './NewRidesPill'
import { ContactSheet } from './ContactSheet'
import { ReportSheet } from './ReportSheet'
import { useRideViewTracker } from '@/features/notifications/hooks/useRideViewTracker'
import { useEnableAlerts } from '@/features/notifications/hooks/useEnableAlerts'
import { NotificationPrePrompt } from '@/features/notifications/components/NotificationPrePrompt'
import { permissionState, shouldShowPrePrompt } from '@/features/notifications/lib/pushFlow'
import { isPrePromptDismissed, dismissPrePrompt } from '@/features/notifications/lib/pushStorage'

/**
 * Rides feed — the hero surface (SCREENS §2). Composes the sub-tabs, the live
 * city-filter lock, the membership banner, the live SSE-driven card list with all
 * states, the new-rides pill, and the contact soft-gate sheet. The TopBar + bottom
 * nav are app chrome (rendered by the layout / future steps).
 */
export function FeedScreen() {
  const router = useRouter()
  const t = useTranslations('rides')
  const [sub, setSub] = useState(FEED_SUB.RIDES)
  const [lockedCity, setLockedCity] = useState(null)
  const [contactRideVM, setContactRideVM] = useState(null)
  const [reportRideVM, setReportRideVM] = useState(null)

  // Hydrate the persisted lock after mount (cookie read can't run on the server).
  useEffect(() => { setLockedCity(readCityLock()) }, [])

  const feed = useRidesFeed({ sub, cityId: lockedCity?.id ?? null })

  const membershipQuery = useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
  const membership = membershipView(membershipQuery.data)

  const pickCity = (city) => { writeCityLock(city); setLockedCity(city) }
  const goMembership = () => router.push('/membership')

  // Push pre-prompt (Step 23): count viewed cards; once enough are seen and the OS
  // permission is still undecided, surface the soft pre-prompt. Either action closes it.
  const [prePromptOpen, setPrePromptOpen] = useState(true)
  const alerts = useEnableAlerts()
  const tracker = useRideViewTracker({ enabled: prePromptOpen })
  const showPrePrompt =
    prePromptOpen &&
    shouldShowPrePrompt({ viewedCount: tracker.viewedCount, dismissed: isPrePromptDismissed(), permission: permissionState() })
  const dismissPre = () => { dismissPrePrompt(); setPrePromptOpen(false) }
  const enableAlerts = async () => { await alerts.enable(); setPrePromptOpen(false) }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      {/* Location buttons row (SCREENS §2): Duty Alerts overlay + the city-filter lock. */}
      <div className="flex gap-3 bg-ec-bg px-4 pb-1 pt-2.5">
        <button
          type="button"
          onClick={() => router.push('/notifications')}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ec-line bg-white text-[14px] font-bold text-ec-blueInk shadow-ec-card"
        >
          <span className="inline-flex text-ec-blue"><BellEdit size={18} /></span>{t('filter.notifications')}
        </button>
        <div className="flex-1">
          <CityFilter locked={lockedCity} onPick={pickCity} />
        </div>
      </div>
      <SubTabs sub={sub} onChange={setSub} />
      <FeedBanner membership={membership} onUpgrade={goMembership} />

      <div
        ref={feed.scrollRef}
        onScroll={feed.onScroll}
        className="relative flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4"
      >
        <NewRidesPill count={feed.atTop ? 0 : feed.pendingCount} onClick={feed.flushPending} />
        <div className="h-1.5 shrink-0" />

        {showPrePrompt && (
          <NotificationPrePrompt onEnable={enableAlerts} onDismiss={dismissPre} enabling={alerts.isEnabling} />
        )}

        {feed.isLoading ? (
          [0, 1, 2, 3].map((i) => <RideCardSkeleton key={i} />)
        ) : feed.isError ? (
          <CatchingUp />
        ) : feed.isEmpty ? (
          <EmptyFeed />
        ) : (
          <>
            {feed.isReconnecting && <CatchingUp />}
            {feed.rides.map((ride) => (
              <div key={ride.id} ref={(el) => tracker.observe(el, ride.id)}>
                <RideCard
                  ride={ride}
                  now={feed.now}
                  onContact={(r) => setContactRideVM(r)}
                  onReport={(r) => setReportRideVM(r)}
                />
              </div>
            ))}
          </>
        )}
      </div>

      {contactRideVM && (
        <ContactSheet
          ride={contactRideVM}
          membershipState={membership.state}
          onClose={() => setContactRideVM(null)}
          onUpgrade={() => { setContactRideVM(null); goMembership() }}
        />
      )}

      {reportRideVM && (
        <ReportSheet ride={reportRideVM} onClose={() => setReportRideVM(null)} />
      )}
    </div>
  )
}
