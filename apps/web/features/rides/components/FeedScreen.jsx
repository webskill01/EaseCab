'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { useRidesFeed, FEED_SUB } from '../hooks/useRidesFeed'
import { useCityFilter } from '../hooks/useCityFilter'
import { getMembership } from '@/features/subscription/services/subscriptionApi'
import { countVerifiedRides } from '../services/ridesApi'
import { membershipView } from '@/features/subscription/lib/membership'
import { SubTabs } from './SubTabs'
import { CityFilter } from './CityFilter'
import { FeedBanner } from './FeedBanner'
import { NotificationsButton } from './NotificationsButton'
import { PromoBanner } from './PromoBanner'
import { PromoSheet } from './PromoSheet'
import { activePromo, shouldPopup, readPromoState, markPromo, istDay } from '../lib/promos'
import { RideCard } from './RideCard'
import { RideCardSkeleton, CatchingUp, EmptyFeed } from './FeedStates'
import { NewRidesPill } from './NewRidesPill'
import { ContactSheet } from './ContactSheet'
import { ReportSheet } from './ReportSheet'
import { useRideViewTracker } from '@/features/notifications/hooks/useRideViewTracker'
import { useEnableAlerts } from '@/features/notifications/hooks/useEnableAlerts'
import { useSyncPushToken } from '@/features/notifications/hooks/useSyncPushToken'
import { useSyncGeoCity } from '@/features/notifications/hooks/useSyncGeoCity'
import { NotificationPrePrompt } from '@/features/notifications/components/NotificationPrePrompt'
import { permissionState, shouldShowPrePrompt } from '@/features/notifications/lib/pushFlow'
import { isPrePromptDismissed, dismissPrePrompt } from '@/features/notifications/lib/pushStorage'

const DUTIES_COUNT_POLL_MS = 30000

/**
 * Rides feed — the hero surface (SCREENS §2). Composes the sub-tabs, the live
 * city-filter lock, the membership banner, the live SSE-driven card list with all
 * states, the new-rides pill, and the contact soft-gate sheet. The TopBar + bottom
 * nav are app chrome (rendered by the layout / future steps).
 */
export function FeedScreen() {
  const router = useRouter()
  const [sub, setSub] = useState(FEED_SUB.RIDES)
  const [contactRideVM, setContactRideVM] = useState(null)
  const [reportRideVM, setReportRideVM] = useState(null)

  // Feed filter = alert cities (one server-side list, empty = All rides).
  const { selected: selectedCities, toggle: toggleCity, clear: clearCities } = useCityFilter()

  const feed = useRidesFeed({ sub, cityIds: selectedCities.map((c) => c.id) })

  // Driver Duties tab badge. Posted rides have no SSE, so poll (also refetches on focus).
  const cityKey = selectedCities.map((c) => c.id).join(',')
  const dutiesCountQuery = useQuery({
    queryKey: ['dutiesCount', cityKey || 'all'],
    queryFn: () => countVerifiedRides({ cityIds: cityKey ? cityKey.split(',') : [] }),
    refetchInterval: DUTIES_COUNT_POLL_MS,
  })

  const membershipQuery = useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
  // Until the query resolves, `data` is undefined → membershipView() would read it
  // as EXPIRED and flash the red banner. Hold a neutral state while loading.
  const membership = membershipQuery.data ? membershipView(membershipQuery.data) : { state: null }

  const goMembership = () => router.push('/membership')

  // Push pre-prompt (Step 23): count viewed cards; once enough are seen and the OS
  // permission is still undecided, surface the soft pre-prompt. Either action closes it.
  const [prePromptOpen, setPrePromptOpen] = useState(true)
  const alerts = useEnableAlerts()
  useSyncPushToken() // re-mint + re-register the token on load when permission is already granted
  useSyncGeoCity() // geo alerts follow the driver's current city
  const tracker = useRideViewTracker({ enabled: prePromptOpen })
  const showPrePrompt =
    prePromptOpen &&
    shouldShowPrePrompt({ viewedCount: tracker.viewedCount, dismissed: isPrePromptDismissed(), permission: permissionState() })
  const dismissPre = () => { dismissPrePrompt(); setPrePromptOpen(false) }
  const enableAlerts = async () => { await alerts.enable(); setPrePromptOpen(false) }

  // New-feature promo: banner for the promo's window + a random once-a-day popup.
  // Picked after mount (Date + localStorage) so server and client markup match.
  const [promo, setPromo] = useState(null)
  const [promoPopup, setPromoPopup] = useState(false)
  useEffect(() => {
    const now = new Date()
    const p = activePromo(now)
    setPromo(p)
    if (shouldPopup(p, readPromoState(), now)) { markPromo('shownDay', p.id, istDay(now)); setPromoPopup(true) }
  }, [])
  const openPromo = () => { markPromo('opened', promo.id, true); setPromoPopup(false); router.push(promo.href) }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      {promo && <PromoBanner promo={promo} onOpen={openPromo} />}
      {/* Location buttons row (SCREENS §2): Duty Alerts overlay + the city-filter lock. */}
      <div className="flex gap-3 bg-ec-bg px-4 pb-1 pt-2.5">
        <NotificationsButton onClick={() => router.push('/notifications')} />
        <div className="flex-1">
          <CityFilter selected={selectedCities} onToggle={toggleCity} onClear={clearCities} />
        </div>
      </div>
      <SubTabs sub={sub} onChange={setSub} dutiesCount={dutiesCountQuery.data ?? 0} />
      <FeedBanner membership={membership} onUpgrade={goMembership} />

      <div
        ref={feed.scrollRef}
        onScroll={feed.onScroll}
        className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-4"
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
          <EmptyFeed filtered={selectedCities.length > 0} onClear={clearCities} />
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
            {feed.isFetchingMore && <RideCardSkeleton />}
          </>
        )}
      </div>

      {contactRideVM && (
        <ContactSheet
          ride={contactRideVM}
          membershipState={membership.state}
          membershipLoading={membershipQuery.isPending}
          onClose={() => setContactRideVM(null)}
          onUpgrade={() => { setContactRideVM(null); goMembership() }}
          onVerify={() => { setContactRideVM(null); router.push(env.NEXT_PUBLIC_VERIFICATION_ENABLED ? '/verify?intent=l1' : '/profile/edit') }}
        />
      )}

      {promoPopup && promo && <PromoSheet promo={promo} onOpen={openPromo} onClose={() => setPromoPopup(false)} />}

      {reportRideVM && (
        <ReportSheet ride={reportRideVM} onClose={() => setReportRideVM(null)} />
      )}
    </div>
  )
}
