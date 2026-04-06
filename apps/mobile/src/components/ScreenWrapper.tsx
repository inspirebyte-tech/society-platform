import React from 'react'
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Platform,
  ViewStyle,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

interface ScreenWrapperProps {
  children: React.ReactNode
  scroll?: boolean
  style?: ViewStyle
  contentStyle?: ViewStyle
}

export function ScreenWrapper({
  children,
  scroll = true,
  style,
  contentStyle,
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={[styles.safe, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <>{children}</>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.screenPadding,
  },
})
