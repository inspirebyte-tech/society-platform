import { useState, useCallback } from 'react'
import { getSociety } from '../services/societies'

interface Society {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  type: string
  isActive: boolean
  totalUnits: number
  totalMembers: number
}

export function useSociety(societyId: string | null) {
  const [society, setSociety] = useState<Society | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!societyId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSociety(societyId)
      setSociety(data)
    } catch {
      setError('Could not load society. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [societyId])

  return { society, isLoading, error, load }
}
