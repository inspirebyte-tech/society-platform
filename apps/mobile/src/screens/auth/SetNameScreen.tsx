import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { updateProfile, saveCurrentOrg } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AuthStackParamList, 'SetName'>

export function SetNameScreen({ route, navigation }: Props) {
  const { requiresOrgSelection, memberships, currentOrgId } = route.params
  const { loadUser } = useAuth()

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        // showLoading=true: covers AuthNavigator→AppNavigator swap with spinner,
        // preventing the flash between SetNameScreen and the first app screen
        await loadUser(true)
      }
    } catch (e) {
      const code = getApiErrorCode(e)
      if (code === 'missing_field' || code === 'invalid_name') {
        setError(getErrorMessage(code))
      } else if (code === 'no_token' || code === 'invalid_token') {
        // Token issue — back to login
        navigation.reset({ index: 0, routes: [{ name: 'LoginPhone' }] })
      } else {
        setError(getErrorMessage(code))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>This is how others will see you</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={(v) => { setName(v); setError('') }}
            placeholder="e.g. Arjun Mehta"
            error={error}
            autoCapitalize="words"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <Button
            label="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={name.trim().length < 2}
            style={styles.button}
          />
        </View>
      </View>
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
