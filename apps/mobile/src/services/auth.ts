import * as SecureStore from 'expo-secure-store'
import api from './api'

export async function requestOtp(phone: string) {
  const res = await api.post('/auth/request-otp', { phone })
  return res.data.data
}

export async function verifyOtp(phone: string, otp: string) {
  const res = await api.post('/auth/verify-otp', { phone, otp })
  return res.data.data
}

export async function selectOrg(orgId: string) {
  const res = await api.post('/auth/select-org', { orgId })
  return res.data.data
}

export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data.data
}

export async function refreshToken(refreshToken: string) {
  const res = await api.post('/auth/refresh', { refreshToken })
  return res.data.data
}

export async function logout() {
  await api.post('/auth/logout')
}

export async function saveTokens(token: string, refresh: string) {
  await SecureStore.setItemAsync('session_token', token)
  await SecureStore.setItemAsync('refresh_token', refresh)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync('session_token')
  await SecureStore.deleteItemAsync('refresh_token')
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync('session_token')
}
