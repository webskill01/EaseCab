'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
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

/**
 * Rides feed — the hero surface (SCREENS §2). Composes the sub-tabs, the live
 * city-filter lock, the membership banner, the live SSE-driven card list with all
 * states, the new-rides pill, and the contact soft-gate sheet. The TopBar + bottom
 * nav are app chrome (rendered by the layout / future steps).
 */
export function FeedScreen() {
  const router = useRouter()
  const [sub, setSub] = useState(FEED_SUB.RIDES)
  const [lockedCity, setLockedCity] = useState(null)
  const [contactRideVM, setContactRideVM] = useState(null)

  // Hydrate the persisted lock after mount (cookie read can't run on the server).
  useEffect(() => { setLockedCity(readCityLock()) }, [])

  const feed = useRidesFeed({ sub, cityId: lockedCity?.id ?? null })

  const membershipQuery = useQuery({ queryKey: ['membership'], queryFn: getMembership, staleTime: 300000 })
  const membership = membershipView(membershipQuery.data)

  const pickCity = (city) => { writeCityLock(city); setLockedCity(city) }
  const goMembership = () => router.push('/membership')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="bg-ec-bg px-4 pb-1 pt-2.5">
        <CityFilter locked={lockedCity} onPick={pickCity} />
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
              <RideCard
                key={ride.id}
                ride={ride}
                now={feed.now}
                onContact={(r) => setContactRideVM(r)}
                onReport={() => { /* report sheet + API deferred (admin Step 24) */ }}
              />
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
    </div>
  )
}
