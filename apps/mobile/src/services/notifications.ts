import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { createNavigationContainerRef } from '@react-navigation/native'
import api from './api'

export async function registerDeviceToken(): Promise<void> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    // User denied — silent degradation, never block app
    if (finalStatus !== 'granted') return

    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    })

    // Only re-register if token changed
    const stored = await SecureStore.getItemAsync('device_token')
    if (stored === pushToken) return

    const platform = Platform.OS === 'ios' ? 'IOS' : 'ANDROID'
    await api.post('/auth/device-token', { token: pushToken, platform })
    await SecureStore.setItemAsync('device_token', pushToken)
  } catch {
    // Silent degradation — never surface notification errors to user
  }
}

// Navigation ref — allows navigation outside React components
export const navigationRef = createNavigationContainerRef<any>()

// ─────────────────────────────────────────────
// Deep link map — add new screens here when
// adding new notification types
// ─────────────────────────────────────────────
const DEEP_LINK_MAP: Record<string, (data: any) => void> = {
  'ComplaintDetail': (data) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('ComplaintDetail' as never, {
        societyId: data.orgId,
        complaintId: data.complaintId,
      } as never)
    }
  },
  'Announcements': (data) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Announcements' as never, {
        societyId: data.orgId,
      } as never)
    }
  },
  'Dashboard': (_data) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Dashboard' as never)
    }
  },
}

// ─────────────────────────────────────────────
// Handle notification tap
// Works for background and killed app states
// ─────────────────────────────────────────────
export const handleNotificationResponse = (
  response: Notifications.NotificationResponse
): void => {
  const data = response.notification.request.content.data as Record<string, string>
  if (!data?.screen) return
  const handler = DEEP_LINK_MAP[data.screen]
  if (handler) handler(data)
}

// ─────────────────────────────────────────────
// Set notification handler for foreground
// Shows notification banner even when app is open
// ─────────────────────────────────────────────
export const setupNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    })
  })
}
