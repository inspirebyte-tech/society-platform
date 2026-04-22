import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
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
