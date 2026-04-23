import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { createAnnouncement, AnnouncementCategory } from '../../services/announcements'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'CreateAnnouncement'>

const MAX_IMAGES = 5

const CATEGORIES: { label: string; value: AnnouncementCategory }[] = [
  { label: 'General', value: 'GENERAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Emergency', value: 'EMERGENCY' },
  { label: 'Celebration', value: 'CELEBRATION' },
]

interface SelectedImage {
  uri: string
  base64: string
}

interface FieldErrors {
  title?: string
  body?: string
}

export function CreateAnnouncementScreen({ route, navigation }: Props) {
  const { societyId } = route.params

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<AnnouncementCategory>('GENERAL')
  const [images, setImages] = useState<SelectedImage[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!title.trim()) next.title = 'Title is required.'
    if (!body.trim()) next.body = 'Body is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function pickImages() {
    if (images.length >= MAX_IMAGES) {
      setToast({ message: `Maximum ${MAX_IMAGES} images allowed.`, type: 'error' })
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      setToast({ message: 'Allow photo access to attach images.', type: 'info' })
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      base64: true,
      quality: 0.7,
    })

    if (result.canceled) return

    const picked: SelectedImage[] = (result.assets as Array<{ uri: string; base64?: string | null }>)
      .filter((a) => !!a.base64)
      .map((a) => ({ uri: a.uri, base64: a.base64! }))

    setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES))
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await createAnnouncement(societyId, {
        title: title.trim(),
        body: body.trim(),
        category,
        images: images.map((img) => img.base64),
      })

      setToast({ message: 'Announcement posted.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      const code = getApiErrorCode(e)
      if (code === 'missing_field') {
        setToast({ message: 'Please fill in all required fields.', type: 'error' })
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ScreenWrapper contentStyle={styles.content}>
      {/* Title */}
      <TextInput
        label="Title"
        placeholder="What is this announcement about?"
        value={title}
        onChangeText={(t) => {
          setTitle(t)
          if (errors.title) clearError('title')
        }}
        error={errors.title}
        maxLength={120}
        returnKeyType="next"
      />

      {/* Body */}
      <TextInput
        label="Body"
        placeholder="Write the announcement details..."
        value={body}
        onChangeText={(t) => {
          setBody(t)
          if (errors.body) clearError('body')
        }}
        error={errors.body}
        multiline
        numberOfLines={4}
        style={styles.bodyInput}
        textAlignVertical="top"
      />

      {/* Category chips */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => setCategory(c.value)}
              style={[styles.categoryChip, category === c.value && styles.categoryChipActive]}
            >
              <Text style={[styles.categoryChipText, category === c.value && styles.categoryChipTextActive]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Image picker */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>
          Photos{' '}
          <Text style={styles.fieldLabelOptional}>(optional, up to {MAX_IMAGES})</Text>
        </Text>
        <View style={styles.imagesRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.thumbnailWrapper}>
              <Image source={{ uri: img.uri }} style={styles.thumbnail} />
              <Pressable style={styles.removeBtn} onPress={() => removeImage(i)} hitSlop={8}>
                <Text style={styles.removeBtnText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {images.length < MAX_IMAGES ? (
            <Pressable onPress={pickImages} style={styles.addPhotoBtn}>
              <Text style={styles.addPhotoPlus}>+</Text>
              <Text style={styles.addPhotoLabel}>Add Photos</Text>
              <Text style={styles.addPhotoCount}>
                {images.length}/{MAX_IMAGES}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Submit */}
      <Button
        label="Post Announcement"
        onPress={handleSubmit}
        loading={isSubmitting}
        style={styles.submitBtn}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    gap: Spacing.sectionGap,
    paddingBottom: 40,
  },

  bodyInput: {
    height: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },

  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  fieldLabelOptional: { fontSize: 13, fontWeight: '400', color: Colors.subtle },

  categoryChips: { gap: 8, paddingVertical: 2 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: { fontSize: 14, fontWeight: '500', color: Colors.subtle },
  categoryChipTextActive: { color: Colors.surface },

  imagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 10, backgroundColor: Colors.border },
  removeBtn: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: Colors.surface, fontWeight: '700' },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: 2,
  },
  addPhotoPlus: { fontSize: 22, color: Colors.subtle, lineHeight: 26 },
  addPhotoLabel: { fontSize: 10, color: Colors.subtle, fontWeight: '500' },
  addPhotoCount: { fontSize: 10, color: Colors.subtle },

  submitBtn: { marginTop: 4 },
})
