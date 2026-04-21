import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useFonts, Montserrat_700Bold, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { updateProfile, saveCurrentOrg } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'

type Props = NativeStackScreenProps<AuthStackParamList, 'SetName'>

const BRAND = '#4338ca'

export function SetNameScreen({ route, navigation }: Props) {
  const { requiresOrgSelection, memberships, currentOrgId } = route.params
  const { loadUser } = useAuth()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)

  const insets = useSafeAreaInsets()
  const [fontsLoaded] = useFonts({ Montserrat_700Bold, Montserrat_600SemiBold })

  async function handleContinue() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }
    setLoading(true)
    try {
      await updateProfile(trimmed)

      if (requiresOrgSelection) {
        navigation.navigate('SelectSociety', { memberships })
      } else {
        if (currentOrgId) {
          await saveCurrentOrg(currentOrgId)
        }
        await loadUser(true)
      }
    } catch (e) {
      const code = getApiErrorCode(e)
      if (code === 'missing_field' || code === 'invalid_name') {
        setError(getErrorMessage(code))
      } else if (code === 'no_token' || code === 'invalid_token') {
        navigation.reset({ index: 0, routes: [{ name: 'LoginPhone' }] })
      } else {
        setError(getErrorMessage(code))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!fontsLoaded) return null

  return (
    <LinearGradient colors={['#4338ca', '#3730a3']} style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent={false} />

      {/* ── Top: gradient header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.heading}>Almost there</Text>
        <Text style={styles.subheading}>Tell us your name to get started</Text>
      </View>

      {/* ── Bottom: white form card ── */}
      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 32) }]}>

        <Text style={styles.label}>Your name</Text>

        <TextInput
          style={[
            styles.nameInput,
            focused && styles.nameInputFocused,
            !!error && styles.nameInputError,
          ]}
          value={name}
          onChangeText={(v) => { setName(v); setError('') }}
          placeholder="e.g. Arjun Mehta"
          placeholderTextColor={Colors.subtle}
          autoCapitalize="words"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Continue button */}
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            name.trim().length < 2 && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
          onPress={handleContinue}
          disabled={loading || name.trim().length < 2}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Continue</Text>
          }
        </Pressable>

        <Text style={styles.hint}>This is how you'll appear to others</Text>
      </View>
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

  // ── Name input ──
  nameInput: {
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  nameInputFocused: {
    borderColor: BRAND,
  },
  nameInputError: {
    borderColor: Colors.error,
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
