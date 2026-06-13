import { useState } from 'react'
import { getCurrentPosition } from '../services/geoClient'
import { nearestCity } from '@/features/rides/services/citiesApi'

/**
 * Geo → nearest alert city (Step 23). `locate()` runs the OS geo prompt, resolves
 * the nearest city, and returns it (or null on denial / none-in-range).
 */
export function useNearestCity() {
  const [suggestion, setSuggestion] = useState(null)
  const [isLocating, setIsLocating] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  async function locate() {
    setIsLocating(true)
    setErrorKey(null)
    try {
      const pos = await getCurrentPosition()
      const city = await nearestCity(pos)
      setSuggestion(city)
      if (!city) setErrorKey('error.noCity')
      return city
    } catch {
      setErrorKey('error.geo')
      return null
    } finally {
      setIsLocating(false)
    }
  }

  return { suggestion, isLocating, errorKey, locate }
}
