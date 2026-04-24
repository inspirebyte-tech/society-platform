import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useFonts, Montserrat_700Bold, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Toast } from '../../components/Toast'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { verifyOtp, saveTokens, saveCurrentOrg, requestOtp } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginOTP'>

const OTP_LENGTH = 6
const BRAND = '#2f3e4e'

export function LoginOTPScreen({ route, navigation }: Props) {
  const { phone } = route.params
  const { loadUser } = useAuth()
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [countdown, setCountdown] = useState(30)
  const inputRefs = useRef<TextInput[]>([])

  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_700Bold, Montserrat_600SemiBold })

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

      if (data.isNewUser) {
        navigation.navigate('SetName', {
          requiresOrgSelection: data.requiresOrgSelection ?? false,
          memberships: data.memberships ?? [],
          currentOrgId: data.currentOrg?.id,
        })
      } else if (data.requiresOrgSelection) {
        navigation.navigate('SelectSociety', { memberships: data.memberships })
      } else {
        if (data.currentOrg?.id) {
          await saveCurrentOrg(data.currentOrg.id)
        }
        await loadUser(true)
      }
    } catch (e) {
      const code = getApiErrorCode(e)
      const msg = getErrorMessage(code)
      setToast({ message: msg, type: 'error' })
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

  if (!fontsLoaded) return null

  return (
    <LinearGradient colors={['#2f3e4e', '#4a5d73']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Top: gradient header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.backBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Verify your number</Text>
        <Text style={styles.subheading}>{displayPhone}</Text>
      </View>

      {/* ── Bottom: white form card ── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 32) }]}>

        <Text style={styles.label}>Enter OTP</Text>

        {/* OTP boxes */}
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

        {/* Resend */}
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

        {/* Verify button */}
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            otp.join('').length < OTP_LENGTH && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={() => handleVerify()}
          disabled={loading || otp.join('').length < OTP_LENGTH}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verify</Text>
          }
        </Pressable>

        <Text style={styles.hint}>OTP valid for 10 minutes</Text>
      </View>

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onHide={() => setToast(null)}
        />
      ) : null}
    </LinearGradient>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // ── Gradient header ──
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    padding: 8,
    zIndex: 1,
  },
  logo: {
    width: 48,
    height: 60,
    tintColor: '#fff',
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── White form card ──
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 32,
    paddingHorizontal: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
    marginBottom: 24,
  },

  // ── OTP boxes ──
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
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
    borderColor: BRAND,
    backgroundColor: '#ede9fe',
  },

  // ── Resend ──
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  resendText: {
    fontSize: 14,
    color: Colors.subtle,
  },
  resendLink: {
    color: BRAND,
    fontWeight: '600',
  },

  // ── Verify button ──
  btn: {
    height: 56,
    backgroundColor: BRAND,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Hint ──
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
})
