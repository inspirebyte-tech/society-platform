import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  function handlePhoneChange(text: string) {
    setError('')
    setPhone(formatPhoneDisplay(text))
  }

  async function handleSendOtp() {
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
          <Text style={styles.title}>Welcome</Text>
          <Text style={styles.subtitle}>Enter your mobile number to continue</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Mobile Number"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={11}
            placeholder="98765 43210"
            error={error}
            helper="We'll send a 6-digit OTP to this number"
            autoFocus
          />

          <Button
            label="Send OTP"
            onPress={handleSendOtp}
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
  form: {
    gap: Spacing.itemGap,
  },
  button: {
    marginTop: 8,
  },
})
