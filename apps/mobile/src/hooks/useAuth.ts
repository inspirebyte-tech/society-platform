import { useState, useEffect, useCallback } from 'react'
import { getMe, clearTokens, getStoredToken } from '../services/auth'

interface User {
  id: string
  phone: string
  name: string
  isProfileComplete: boolean
}

interface Membership {
  org: { id: string; name: string }
  role: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  memberships: Membership[]
  permissions: string[]
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    memberships: [],
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  })

  const loadUser = useCallback(async () => {
    try {
      const token = await getStoredToken()
      if (!token) {
        setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }))
        return
      }
      const data = await getMe()
      const permissions = data.memberships.flatMap((m: Membership) => m.permissions)
      setState({
        user: data.user,
        memberships: data.memberships,
        permissions,
        isLoading: false,
        isAuthenticated: true,
      })
    } catch {
      setState((s) => ({ ...s, isLoading: false, isAuthenticated: false }))
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const signOut = useCallback(async () => {
    await clearTokens()
    setState({
      user: null,
      memberships: [],
      permissions: [],
      isLoading: false,
      isAuthenticated: false,
    })
  }, [])

  const hasPermission = useCallback(
    (permission: string) => state.permissions.includes(permission),
    [state.permissions],
  )

  return { ...state, loadUser, signOut, hasPermission }
}
