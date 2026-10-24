import { it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const update = vi.fn()
let prefs = null
vi.mock('@/features/notifications/hooks/usePushPreferences', () => ({ usePushPreferences: () => ({ prefs, update }) }))
vi.mock('../../lib/cityLock', () => ({ readCityLock: vi.fn(() => []), writeCityLock: vi.fn() }))

import { readCityLock, writeCityLock } from '../../lib/cityLock'
import { useCityFilter } from '../useCityFilter'

const PATIALA = { id: 'p1', name: 'Patiala' }
const MOHALI = { id: 'm1', name: 'Mohali' }

beforeEach(() => { vi.clearAllMocks(); prefs = null; readCityLock.mockReturnValue([]) })

it('server list wins and is mirrored into the cookie', () => {
  readCityLock.mockReturnValue([MOHALI])
  prefs = { cities: [PATIALA] }
  const { result } = renderHook(() => useCityFilter())
  expect(result.current.selected).toEqual([PATIALA])
  expect(writeCityLock).toHaveBeenCalledWith([PATIALA])
  expect(update).not.toHaveBeenCalled()
})

it('adopts an old device-only filter once when the server list is empty', () => {
  readCityLock.mockReturnValue([PATIALA])
  prefs = { cities: [] }
  renderHook(() => useCityFilter())
  expect(update).toHaveBeenCalledWith({ notificationCities: ['p1'] })
})

it('toggle/clear save the same list as alert cities (empty = all rides)', () => {
  prefs = { cities: [] }
  const { result } = renderHook(() => useCityFilter())
  act(() => result.current.toggle(PATIALA))
  expect(update).toHaveBeenLastCalledWith({ notificationCities: ['p1'] })
  expect(result.current.selected).toEqual([PATIALA])
  act(() => result.current.toggle(PATIALA))
  expect(update).toHaveBeenLastCalledWith({ notificationCities: [] })
  act(() => result.current.toggle(MOHALI))
  act(() => result.current.clear())
  expect(update).toHaveBeenLastCalledWith({ notificationCities: [] })
  expect(result.current.selected).toEqual([])
})

it('ignores adds beyond the server cap', () => {
  prefs = { cities: Array.from({ length: 25 }, (_, i) => ({ id: `c${i}`, name: `C${i}` })) }
  const { result } = renderHook(() => useCityFilter())
  act(() => result.current.toggle(PATIALA))
  expect(update).not.toHaveBeenCalled()
})
