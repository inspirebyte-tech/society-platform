import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'

const AVATAR_COLORS = [
  '#2f3e4e', '#0D9488', '#6366F1',
  '#F59E0B', '#EF4444', '#22C55E',
]

function getAvatarColor(name: string): string {
  const sum = name.trim().split('').reduce(
    (acc, c) => acc + c.charCodeAt(0), 0
  )
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

interface AvatarProps {
  name: string
  photoUrl?: string | null
  size?: number
  borderRadius?: number
}

export function Avatar({
  name,
  photoUrl,
  size = 40,
  borderRadius = 12,
}: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase()
  const color = getAvatarColor(name)

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius }}
      />
    )
  }

  return (
    <View style={[
      styles.circle,
      { width: size, height: size, borderRadius, backgroundColor: color },
    ]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>
        {initial}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '600',
  },
})
