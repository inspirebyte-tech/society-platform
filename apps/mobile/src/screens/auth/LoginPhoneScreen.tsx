import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { requestOtp } from '../../services/auth'
import { formatPhoneDisplay, normalizePhone, isValidIndianPhone } from '../../utils/validators'
import { getErrorMessage } from '../../utils/errorMessages'
import { getApiErrorCode } from '../../services/api'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginPhone'>

export function LoginPhoneScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  function handlePhoneChange(text: string) {
    setError('')
    setPhone(formatPhoneDisplay(text))
  }

  async function handleContinue() {
    const raw = normalizePhone(phone)
    if (!isValidIndianPhone(raw)) {
      setError('Enter a valid 10-digit mobile number starting with 6–9.')
      return
    }
    setLoading(true)
    try {
      await requestOtp(raw)
      navigation.navigate('LoginOTP', { phone: raw })
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>

        <View style={styles.header}>
          <Text style={styles.title}>Enter your number</Text>
          <Text style={styles.subtitle}>We'll send you a 6-digit code to verify</Text>
        </View>

        <View style={styles.form}>
          {/* ── Phone input with flag prefix ── */}
          <View style={[
            styles.phoneContainer,
            focused && styles.phoneContainerFocused,
            !!error && styles.phoneContainerError,
          ]}>
            <View style={styles.phonePrefix}>
              <Text style={styles.flagEmoji}>🇮🇳</Text>
              <Text style={styles.prefixText}>+91</Text>
            </View>
            <View style={styles.prefixDivider} />
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={11}
              placeholder="98765 43210"
              placeholderTextColor={Colors.subtle}
              autoFocus
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            style={styles.button}
          />
        </View>

      </View>

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onHide={() => setToast(null)}
        />
      ) : null}
    </ScreenWrapper>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.sectionGap,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtle,
    lineHeight: 21,
  },
  form: {
    gap: Spacing.itemGap,
  },

  // ── Phone input row ──
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  phoneContainerFocused: {
    borderColor: Colors.primary,
  },
  phoneContainerError: {
    borderColor: Colors.error,
  },
  phonePrefix: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 7,
  },
  flagEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.subtle,
  },
  prefixDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.text,
    height: '100%',
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginTop: -4,
  },

  button: {
    marginTop: 4,
  },
})
