import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { getMe, clearTokens, getStoredToken } from '../services/auth'
import { registerDeviceToken } from '../services/notifications'

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
  currentOrgId: string | null
  isLoading: boolean
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  loadUser: () => Promise<void>
  signOut: () => Promise<void>
  hasPermission: (permission: string) => boolean
}

const AuthContext = createContext<AuthContextValue>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    memberships: [],
    permissions: [],
    currentOrgId: null,
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
      const [data, storedOrgId] = await Promise.all([
        getMe(),
        SecureStore.getItemAsync('current_org_id'),
      ])
      const permissions = data.memberships.flatMap((m: Membership) => m.permissions)

      // Validate stored org — discard if user no longer has that membership
      const orgIdValid = storedOrgId
        ? data.memberships.some((m: Membership) => m.org.id === storedOrgId)
        : false
      if (storedOrgId && !orgIdValid) {
        await SecureStore.deleteItemAsync('current_org_id')
      }
      const currentOrgId = orgIdValid ? storedOrgId : null

      setState({
        user: data.user,
        memberships: data.memberships,
        permissions,
        currentOrgId,
        isLoading: false,
        isAuthenticated: true,
      })

      // Register push token — fire-and-forget, never blocks auth flow
      registerDeviceToken()
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
      currentOrgId: null,
      isLoading: false,
      isAuthenticated: false,
    })
  }, [])

  const hasPermission = useCallback(
    (permission: string) => state.permissions.includes(permission),
    [state.permissions],
  )

  return (
    <AuthContext.Provider value={{ ...state, loadUser, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
