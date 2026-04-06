import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

export function RootNavigator() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  )
}
