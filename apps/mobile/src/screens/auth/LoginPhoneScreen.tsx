import React, { useState } from 'react'
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
import { requestOtp } from '../../services/auth'
import { formatPhoneDisplay, normalizePhone, isValidIndianPhone } from '../../utils/validators'
import { getErrorMessage } from '../../utils/errorMessages'
import { getApiErrorCode } from '../../services/api'
import { Colors } from '../../constants/colors'

type Props = NativeStackScreenProps<AuthStackParamList, 'LoginPhone'>

const BRAND = '#2f3e4e'

export function LoginPhoneScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_700Bold, Montserrat_600SemiBold })

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

  if (!fontsLoaded) return null

  return (
    <LinearGradient colors={['#2f3e4e', '#4a5d73']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Top: gradient header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {/* Back button — absolute so it doesn't shift the centred content */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.backBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>

        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.heading}>Welcome to Vaastio</Text>
        <Text style={styles.subheading}>Enter your number to continue</Text>
      </View>

      {/* ── Bottom: white form card ── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 32) }]}>

        <Text style={styles.label}>Mobile Number</Text>

        {/* Phone input row */}
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

        {/* Continue button */}
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue</Text>
          }
        </Pressable>

        <Text style={styles.hint}>We'll send a 6-digit OTP to verify</Text>
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

  // ── Phone input row ──
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  phoneContainerFocused: {
    borderColor: BRAND,
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
    marginTop: 8,
  },

  // ── Continue button ──
  btn: {
    height: 56,
    backgroundColor: BRAND,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
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

  // ── OTP hint ──
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
})
