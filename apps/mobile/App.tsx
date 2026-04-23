import React, { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { AuthProvider } from './src/context/AuthContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import {
  handleNotificationResponse,
  setupNotificationHandler,
} from './src/services/notifications'

setupNotificationHandler()

export default function App() {
  useEffect(() => {
    // Handle notification tap when app is open or background
    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    )
    return () => subscription.remove()
  }, [])

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
