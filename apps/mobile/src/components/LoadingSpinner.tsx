import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Colors } from '../constants/colors'

interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'small' | 'large'
}

export function LoadingSpinner({ fullScreen = false, size = 'large' }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={Colors.primary} />
      </View>
    )
  }
  return <ActivityIndicator size={size} color={Colors.primary} />
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
})
