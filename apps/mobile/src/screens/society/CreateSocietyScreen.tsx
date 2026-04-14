import React, { useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { BottomSheetPicker, PickerOption } from '../../components/BottomSheetPicker'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { createSociety, SocietyType } from '../../services/societies'
import { selectOrg, saveSessionToken, saveCurrentOrg } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode, getApiErrorDetails } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'CreateSociety'>

const SOCIETY_TYPES: PickerOption[] = [
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Villa', value: 'VILLA' },
  { label: 'Mixed', value: 'MIXED' },
  { label: 'Plotted', value: 'PLOTTED' },
]

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  MIXED: 'Mixed',
  PLOTTED: 'Plotted',
}

interface FormState {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  type: SocietyType | ''
}

interface FormErrors {
  name?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  type?: string
}

export function CreateSocietyScreen({ route, navigation }: Props) {
  const source = route.params?.source
  const { loadUser, signOut } = useAuth()
  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    type: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  function setField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.name.trim()) next.name = 'Society name is required.'
    if (!form.address.trim()) next.address = 'Address is required.'
    if (!form.city.trim()) next.city = 'City is required.'
    if (!form.state.trim()) next.state = 'State is required.'
    if (!form.pincode.trim()) {
      next.pincode = 'Pincode is required.'
    } else if (!/^\d{6}$/.test(form.pincode)) {
      next.pincode = 'Enter a valid 6-digit pincode.'
    }
    if (!form.type) next.type = 'Please select a society type.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    setLoading(true)
    try {
      const society = await createSociety({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        type: form.type as SocietyType,
      })
      // Get a session token that includes orgId for this society
      const session = await selectOrg(society.id)
      await saveSessionToken(session.token)
      await saveCurrentOrg(society.id)
      await loadUser()
      if (source === 'dashboard') {
        navigation.replace('SwitchSociety')
      } else {
        navigation.replace('Dashboard', { societyId: society.id })
      }
    } catch (e) {
      const code = getApiErrorCode(e)
      const details = getApiErrorDetails(e)
      // map field-level errors from API
      if (code === 'missing_field' && details.field) {
        setErrors({ [details.field as string]: getErrorMessage(code) })
      } else if (code === 'invalid_type') {
        setErrors({ type: getErrorMessage(code) })
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.title}>Create Society</Text>
        <Text style={styles.subtitle}>Set up your residential society in minutes</Text>
      </View>

      <View style={styles.form}>
        {/* Society Name */}
        <TextInput
          label="Society Name"
          value={form.name}
          onChangeText={(v) => setField('name', v)}
          placeholder="e.g. Green Valley Society"
          error={errors.name}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Address */}
        <TextInput
          label="Address"
          value={form.address}
          onChangeText={(v) => setField('address', v)}
          placeholder="e.g. 123 MG Road"
          error={errors.address}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* City + State row */}
        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <TextInput
              label="City"
              value={form.city}
              onChangeText={(v) => setField('city', v)}
              placeholder="Pune"
              error={errors.city}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
          <View style={styles.rowHalf}>
            <TextInput
              label="State"
              value={form.state}
              onChangeText={(v) => setField('state', v)}
              placeholder="Maharashtra"
              error={errors.state}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Pincode */}
        <TextInput
          label="Pincode"
          value={form.pincode}
          onChangeText={(v) => setField('pincode', v.replace(/\D/g, '').slice(0, 6))}
          placeholder="411001"
          error={errors.pincode}
          keyboardType="number-pad"
          maxLength={6}
          returnKeyType="done"
        />

        {/* Society Type — tap to open picker */}
        <View>
          <Text style={styles.label}>Society Type</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.typePicker,
              form.type ? styles.typePickerFilled : null,
              errors.type ? styles.typePickerError : null,
              pressed && styles.typePickerPressed,
            ]}
          >
            <Text style={[styles.typePickerText, !form.type && styles.typePickerPlaceholder]}>
              {form.type ? TYPE_LABELS[form.type] : 'Select type'}
            </Text>
            <Text style={styles.typePickerChevron}>⌄</Text>
          </Pressable>
          {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}
        </View>
      </View>

      <Button
        label="Create Society"
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitBtn}
      />

      <TouchableOpacity onPress={signOut} hitSlop={12} style={styles.signOutRow}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <BottomSheetPicker
        visible={pickerOpen}
        title="Society Type"
        options={SOCIETY_TYPES}
        selected={form.type || null}
        onSelect={(v) => setField('type', v)}
        onClose={() => setPickerOpen(false)}
      />

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
  header: {
    marginBottom: Spacing.sectionGap,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtle,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.itemGap + 2,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  typePicker: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  typePickerFilled: {
    borderColor: Colors.primary,
  },
  typePickerError: {
    borderColor: Colors.error,
  },
  typePickerPressed: {
    backgroundColor: Colors.background,
  },
  typePickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  typePickerPlaceholder: {
    color: Colors.subtle,
  },
  typePickerChevron: {
    fontSize: 20,
    color: Colors.subtle,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: Spacing.sectionGap,
    marginBottom: 8,
  },
  signOutRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 14,
    color: Colors.subtle,
    fontWeight: '500',
  },
})
