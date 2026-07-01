import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithIntl } from '@/test/intl'

// Mock the heavy feed deps so the test targets the Step-23 pre-prompt wiring only.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../../hooks/useRidesFeed', () => ({
  FEED_SUB: { RIDES: 'rides', POSTED: 'posted' },
  useRidesFeed: () => ({
    isLoading: false, isError: false, isEmpty: true, rides: [], now: Date.now(),
    scrollRef: { current: null }, onScroll: () => {}, atTop: true, pendingCount: 0,
    flushPending: () => {}, isReconnecting: false,
  }),
}))
vi.mock('../../lib/cityLock', () => ({ readCityLock: () => [], writeCityLock: vi.fn() }))
vi.mock('@/features/subscription/services/subscriptionApi', () => ({ getMembership: vi.fn().mockResolvedValue({}) }))
vi.mock('@/features/notifications/hooks/useRideViewTracker', () => ({
  useRideViewTracker: () => ({ observe: () => {}, viewedCount: 3 }),
}))
const enable = vi.fn()
vi.mock('@/features/notifications/hooks/useEnableAlerts', () => ({
  useEnableAlerts: () => ({ enable, isEnabling: false }),
}))
vi.mock('@/features/notifications/hooks/useSyncPushToken', () => ({ useSyncPushToken: () => {} }))

import { FeedScreen } from '../FeedScreen'

beforeEach(() => { global.Notification = { permission: 'default' }; localStorage.clear() })
afterEach(() => { delete global.Notification })

it('shows the pre-prompt once enough rides are viewed and permission is undecided', async () => {
  renderWithIntl(<FeedScreen />)
  expect(await screen.findByRole('button', { name: /enable alerts/i })).toBeInTheDocument()
})

it('hides the pre-prompt when notifications are already granted', () => {
  global.Notification = { permission: 'granted' }
  renderWithIntl(<FeedScreen />)
  expect(screen.queryByRole('button', { name: /enable alerts/i })).not.toBeInTheDocument()
})
