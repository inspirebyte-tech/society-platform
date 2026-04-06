import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? Colors.primary : Colors.surface} />
      ) : (
        <Text style={[labelStyles[variant]]}>{label}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    height: Spacing.buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  danger: {
    backgroundColor: Colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
})

const labelStyles = StyleSheet.create({
  primary: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  secondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
  danger: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  } as TextStyle,
})
