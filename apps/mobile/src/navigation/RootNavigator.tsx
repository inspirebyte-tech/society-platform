import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { AuthNavigator } from './AuthNavigator'
import { AppNavigator } from './AppNavigator'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { Button } from '../components/Button'
import { useAuth } from '../hooks/useAuth'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

export function RootNavigator() {
  const { isLoading, isAuthenticated, currentOrgId, memberships, hasAnyMembership, signOut } = useAuth()

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  // Authenticated but no active memberships, and has been in a society before
  // → deactivated / moved-out member, not a brand-new user
  if (isAuthenticated && memberships.length === 0 && hasAnyMembership) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Access Removed</Text>
          <Text style={styles.message}>
            Your access to this society has been removed.{'\n'}
            Please contact your admin to restore access.
          </Text>
          <Button label="Sign out" onPress={signOut} style={styles.button} />
        </View>
      </View>
    )
  }

  return (
    <NavigationContainer>
      {isAuthenticated
        ? <AppNavigator initialSocietyId={currentOrgId ?? undefined} />
        : <AuthNavigator />
      }
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPadding * 2,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: Colors.subtle,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  button: {
    alignSelf: 'stretch',
  },
})
