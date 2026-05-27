import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { BottomSheetPicker, PickerOption } from '../../components/BottomSheetPicker'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  getSociety,
  updateSociety,
  updateSocietyPhoto,
  updateSocietySettings,
  SocietyType,
} from '../../services/societies'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'SocietySettings'>

const SOCIETY_TYPES: PickerOption[] = [
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Villa',     value: 'VILLA' },
  { label: 'Mixed',     value: 'MIXED' },
  { label: 'Plotted',   value: 'PLOTTED' },
]

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA:     'Villa',
  MIXED:     'Mixed',
  PLOTTED:   'Plotted',
}

interface SocietyData {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  type: string
  photoUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  description: string | null
}

export function SocietySettingsScreen({ route }: Props) {
  const { societyId } = route.params
  const { memberships } = useAuth()

  const membership = memberships.find((m) => m.org.id === societyId)
  const callerRole = membership?.role ?? null
  const isBuilder = callerRole === 'Builder'

  // ── Data state ──
  const [original, setOriginal] = useState<SocietyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Form fields ──
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [type, setType] = useState<SocietyType | ''>('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [description, setDescription] = useState('')

  // ── Photo state ──
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null)

  // ── UI state ──
  const [isSaving, setIsSaving] = useState(false)
  const [typePicker, setTypePicker] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // ── Errors ──
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      try {
        const data = await getSociety(societyId)
        setOriginal(data)
        setName(data.name ?? '')
        setAddress(data.address ?? '')
        setCity(data.city ?? '')
        setState(data.state ?? '')
        setPincode(data.pincode ?? '')
        setType(data.type ?? '')
        setContactPhone(data.contactPhone ?? '')
        setContactEmail(data.contactEmail ?? '')
        setDescription(data.description ?? '')
      } catch {
        setToast({ message: 'Could not load society details.', type: 'error' })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [societyId])

  async function handlePickPhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setToast({ message: 'Camera permission required.', type: 'info' })
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      })
      if (result.canceled || !result.assets[0]?.base64) return
      setPhotoBase64(result.assets[0].base64)
      setPhotoPreviewUri(result.assets[0].uri)
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setToast({ message: 'Allow photo access to choose an image.', type: 'info' })
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      })
      if (result.canceled || !result.assets[0]?.base64) return
      setPhotoBase64(result.assets[0].base64)
      setPhotoPreviewUri(result.assets[0].uri)
    }
  }

  function showPhotoOptions() {
    Alert.alert('Change Photo', undefined, [
      { text: 'Take Photo',          onPress: () => handlePickPhoto('camera') },
      { text: 'Choose from Gallery', onPress: () => handlePickPhoto('library') },
      { text: 'Cancel',              style: 'cancel' },
    ])
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (isBuilder) {
      if (!name.trim())    next.name    = 'Society name is required.'
      if (!address.trim()) next.address = 'Address is required.'
      if (!city.trim())    next.city    = 'City is required.'
      if (!state.trim())   next.state   = 'State is required.'
      if (!pincode.trim()) {
        next.pincode = 'Pincode is required.'
      } else if (!/^\d{6}$/.test(pincode)) {
        next.pincode = 'Enter a valid 6-digit pincode.'
      }
      if (!type) next.type = 'Please select a society type.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setIsSaving(true)
    try {
      if (photoBase64) {
        await updateSocietyPhoto(societyId, photoBase64)
      }

      if (isBuilder) {
        const structuralPayload: Record<string, string> = {}
        if (name.trim()    !== (original?.name    ?? '')) structuralPayload.name    = name.trim()
        if (address.trim() !== (original?.address ?? '')) structuralPayload.address = address.trim()
        if (city.trim()    !== (original?.city    ?? '')) structuralPayload.city    = city.trim()
        if (state.trim()   !== (original?.state   ?? '')) structuralPayload.state   = state.trim()
        if (pincode.trim() !== (original?.pincode ?? '')) structuralPayload.pincode = pincode.trim()
        if (type           !== (original?.type    ?? '')) structuralPayload.type    = type as SocietyType

        if (Object.keys(structuralPayload).length > 0) {
          await updateSociety(societyId, structuralPayload as any)
        }
      }

      const settingsPayload: Record<string, string> = {}
      if (contactPhone.trim() !== (original?.contactPhone ?? '')) settingsPayload.contactPhone = contactPhone.trim()
      if (contactEmail.trim() !== (original?.contactEmail ?? '')) settingsPayload.contactEmail = contactEmail.trim()
      if (description.trim()  !== (original?.description  ?? '')) settingsPayload.description  = description.trim()

      if (Object.keys(settingsPayload).length > 0) {
        await updateSocietySettings(societyId, settingsPayload)
      }

      setToast({ message: 'Society updated.', type: 'success' })
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return null

  const photoSource = photoPreviewUri ?? original?.photoUrl ?? null
  const avatarLetter = (original?.name ?? '?').trim().charAt(0).toUpperCase()

  return (
    <ScreenWrapper scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Society Photo ── */}
        <SectionHeader title="Society Photo" />
        <View style={styles.photoSection}>
          <Pressable onPress={showPhotoOptions} style={styles.photoWrap}>
            {photoSource ? (
              <Image source={{ uri: photoSource }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{avatarLetter}</Text>
              </View>
            )}
          </Pressable>
          <Pressable onPress={showPhotoOptions} hitSlop={8}>
            <Text style={styles.changePhotoLabel}>Change Photo</Text>
          </Pressable>
        </View>

        {/* ── Basic Info (Builder only) ── */}
        {isBuilder ? (
          <>
            <SectionHeader title="Basic Info" style={styles.sectionGap} />
            <View style={styles.fields}>
              <TextInput
                label="Society Name"
                value={name}
                onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined as any })) }}
                placeholder="e.g. Green Valley Society"
                error={errors.name}
                autoCapitalize="words"
              />
              <TextInput
                label="Address"
                value={address}
                onChangeText={(v) => { setAddress(v); setErrors((e) => ({ ...e, address: undefined as any })) }}
                placeholder="e.g. 123 MG Road"
                error={errors.address}
                autoCapitalize="words"
              />
              <View style={styles.row}>
                <View style={styles.rowHalf}>
                  <TextInput
                    label="City"
                    value={city}
                    onChangeText={(v) => { setCity(v); setErrors((e) => ({ ...e, city: undefined as any })) }}
                    placeholder="Pune"
                    error={errors.city}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.rowHalf}>
                  <TextInput
                    label="State"
                    value={state}
                    onChangeText={(v) => { setState(v); setErrors((e) => ({ ...e, state: undefined as any })) }}
                    placeholder="Maharashtra"
                    error={errors.state}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              <TextInput
                label="Pincode"
                value={pincode}
                onChangeText={(v) => { setPincode(v.replace(/\D/g, '').slice(0, 6)); setErrors((e) => ({ ...e, pincode: undefined as any })) }}
                placeholder="411001"
                error={errors.pincode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <View>
                <Text style={styles.fieldLabel}>Society Type</Text>
                <Pressable
                  onPress={() => setTypePicker(true)}
                  style={({ pressed }) => [
                    styles.typePicker,
                    type ? styles.typePickerFilled : null,
                    errors.type ? styles.typePickerError : null,
                    pressed && styles.typePickerPressed,
                  ]}
                >
                  <Text style={[styles.typePickerText, !type && styles.typePickerPlaceholder]}>
                    {type ? TYPE_LABELS[type] : 'Select type'}
                  </Text>
                  <Text style={styles.typePickerChevron}>⌄</Text>
                </Pressable>
                {errors.type ? <Text style={styles.fieldError}>{errors.type}</Text> : null}
              </View>
            </View>
          </>
        ) : null}

        {/* ── Contact & About ── */}
        <SectionHeader title="Contact & About" style={styles.sectionGap} />
        <View style={styles.fields}>
          <TextInput
            label="Contact Phone"
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            maxLength={15}
          />
          <TextInput
            label="Contact Email"
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="e.g. admin@society.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View>
            <TextInput
              label="Description"
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, 300))}
              placeholder="A brief description of the society…"
              multiline
              numberOfLines={4}
              maxLength={300}
            />
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>
        </View>

        <Button
          label="Save Changes"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />
      </ScrollView>

      <BottomSheetPicker
        visible={typePicker}
        title="Society Type"
        options={SOCIETY_TYPES}
        selected={type || null}
        onSelect={(v) => { setType(v as SocietyType); setErrors((e) => ({ ...e, type: undefined as any })) }}
        onClose={() => setTypePicker(false)}
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, style }: { title: string; style?: object }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    letterSpacing: 0.8,
  },
  sectionGap: {
    marginTop: 8,
  },
  photoSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  photoWrap: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
  },
  photo: {
    width: 80,
    height: 80,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  changePhotoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  fields: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.itemGap + 2,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.screenPadding,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowHalf: {
    flex: 1,
  },
  fieldLabel: {
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
  fieldError: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 4,
  },
  charCount: {
    fontSize: 12,
    color: Colors.subtle,
    textAlign: 'right',
    marginTop: 4,
  },
  saveBtn: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.sectionGap,
  },
})
