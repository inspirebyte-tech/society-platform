import React, { useState, useRef, useEffect } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { verifyOtp, saveTokens, requestOtp } from '../../services/auth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginOTP'>

const OTP_LENGTH = 6

export function LoginOTPScreen({ route, navigation }: Props) {
  const { phone } = route.params
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [countdown, setCountdown] = useState(30)
  const inputRefs = useRef<TextInput[]>([])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  function handleOtpChange(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    if (digit && index === OTP_LENGTH - 1) {
      // auto submit when last digit filled
      const filled = next.join('')
      if (filled.length === OTP_LENGTH) {
        handleVerify(filled)
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify(code?: string) {
    const otpCode = code ?? otp.join('')
    if (otpCode.length < OTP_LENGTH) return
    setLoading(true)
    try {
      const data = await verifyOtp(phone, otpCode)
      await saveTokens(data.token, data.refreshToken)

      if (data.isNewUser && data.memberships.length === 0) {
        // new user, no society
        navigation.reset({ index: 0, routes: [{ name: 'LoginPhone' }] })
        // The RootNavigator will re-evaluate and navigate to CreateSociety
      } else if (data.requiresOrgSelection) {
        navigation.navigate('SelectSociety', { memberships: data.memberships })
      } else {
        // single society — token already has orgId, RootNavigator handles the rest
        navigation.reset({ index: 0, routes: [{ name: 'LoginPhone' }] })
      }
    } catch (e) {
      const code = getApiErrorCode(e)
      const msg = getErrorMessage(code)
      setToast({ message: msg, type: 'error' })
      // clear otp on wrong code
      if (code === 'invalid_otp' || code === 'otp_expired' || code === 'otp_blocked') {
        setOtp(Array(OTP_LENGTH).fill(''))
        inputRefs.current[0]?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await requestOtp(phone)
      setCountdown(30)
      setOtp(Array(OTP_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
      setToast({ message: 'OTP resent successfully.', type: 'success' })
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setResending(false)
    }
  }

  const displayPhone = '+91 ' + phone.slice(0, 5) + ' ' + phone.slice(5)

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            Sent to <Text style={styles.phone}>{displayPhone}</Text>
          </Text>
        </View>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputRefs.current[i] = ref }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(t) => handleOtpChange(t, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={i === 0}
            />
          ))}
        </View>

        <Button
          label="Verify"
          onPress={() => handleVerify()}
          loading={loading}
          disabled={otp.join('').length < OTP_LENGTH}
          style={styles.button}
        />

        <View style={styles.resendRow}>
          {countdown > 0 ? (
            <Text style={styles.resendText}>Resend OTP in {countdown}s</Text>
          ) : (
            <Pressable onPress={handleResend} disabled={resending}>
              <Text style={[styles.resendText, styles.resendLink]}>
                {resending ? 'Sending...' : 'Resend OTP'}
              </Text>
            </Pressable>
          )}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    marginBottom: Spacing.sectionGap,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.subtle,
    lineHeight: 24,
  },
  phone: {
    color: Colors.text,
    fontWeight: '600',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: Spacing.sectionGap,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: '#ede9fe',
  },
  button: {
    marginBottom: 16,
  },
  resendRow: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: Colors.subtle,
  },
  resendLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
})
