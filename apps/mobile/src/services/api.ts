import axios, { AxiosError } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL } from '../constants/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('session_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function getApiErrorCode(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error ?? 'unknown_error'
  }
  return 'unknown_error'
}

export function getApiErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof AxiosError) {
    return error.response?.data?.details ?? {}
  }
  return {}
}

export function isUnauthorized(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.response?.status === 401
  }
  return false
}

export default api
