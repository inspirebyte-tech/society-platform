import React, { useEffect, useRef } from 'react'
import { Animated, Text, StyleSheet, Platform } from 'react-native'
import { Colors } from '../constants/colors'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  visible: boolean
  onHide: () => void
  duration?: number
}

export function Toast({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(duration),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => onHide())
    }
  }, [visible])

  if (!visible) return null

  return (
    <Animated.View style={[styles.container, styles[type], { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 16,
    right: 16,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  success: {
    backgroundColor: Colors.success,
  },
  error: {
    backgroundColor: Colors.error,
  },
  info: {
    backgroundColor: Colors.text,
  },
  text: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
})
