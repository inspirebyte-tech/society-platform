// Requires: npx expo install expo-image-picker
import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { BottomSheetPicker } from '../../components/BottomSheetPicker'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { raiseComplaint, ComplaintCategory, ComplaintVisibility } from '../../services/complaints'
import { ALL_CATEGORIES, CATEGORY_LABEL } from '../../utils/complaintMeta'
import { getApiErrorCode, getApiErrorDetails } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'RaiseComplaint'>

const MAX_IMAGES = 5

interface SelectedImage {
  uri: string
  base64: string
}

interface FieldErrors {
  title?: string
  description?: string
  category?: string
}

const CATEGORY_OPTIONS = ALL_CATEGORIES.map((c) => ({
  label: CATEGORY_LABEL[c],
  value: c,
}))

export function RaiseComplaintScreen({ route, navigation }: Props) {
  const { societyId } = route.params

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ComplaintCategory | null>(null)
  const [visibility, setVisibility] = useState<ComplaintVisibility>('PRIVATE')
  const [images, setImages] = useState<SelectedImage[]>([])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!title.trim()) next.title = 'Title is required.'
    if (!description.trim()) next.description = 'Description is required.'
    if (!category) next.category = 'Please select a category.'
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
    if (!validate() || !category) return

    setIsSubmitting(true)
    try {
      await raiseComplaint(societyId, {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        images: images.map((img) => img.base64),
      })

      setToast({ message: 'Complaint raised successfully.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      const code = getApiErrorCode(e)
      const details = getApiErrorDetails(e)
      const field = details.field as string | undefined

      if (code === 'missing_field' && field === 'title') {
        setErrors((prev) => ({ ...prev, title: 'Title is required.' }))
      } else if (code === 'missing_field' && field === 'description') {
        setErrors((prev) => ({ ...prev, description: 'Description is required.' }))
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
        placeholder="What is the issue?"
        value={title}
        onChangeText={(t) => {
          setTitle(t)
          if (errors.title) clearError('title')
        }}
        error={errors.title}
        maxLength={120}
        returnKeyType="next"
      />

      {/* Description */}
      <TextInput
        label="Description"
        placeholder="Describe the issue in detail..."
        value={description}
        onChangeText={(t) => {
          setDescription(t)
          if (errors.description) clearError('description')
        }}
        error={errors.description}
        multiline
        numberOfLines={4}
        style={styles.descriptionInput}
        textAlignVertical="top"
      />

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Category</Text>
        <Pressable
          onPress={() => setShowCategoryPicker(true)}
          style={({ pressed }) => [
            styles.pickerTrigger,
            errors.category ? styles.pickerTriggerError : null,
            pressed && styles.pickerTriggerPressed,
          ]}
        >
          <Text style={[styles.pickerText, !category && styles.pickerPlaceholder]}>
            {category ? CATEGORY_LABEL[category] : 'Select a category'}
          </Text>
          <Text style={styles.pickerChevron}>›</Text>
        </Pressable>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
      </View>

      {/* Visibility toggle */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Visibility</Text>
        <View style={styles.visibilityRow}>
          <Pressable
            onPress={() => setVisibility('PRIVATE')}
            style={[styles.visibilityCard, visibility === 'PRIVATE' && styles.visibilityCardActive]}
          >
            <Text style={styles.visibilityIcon}>🔒</Text>
            <Text style={[styles.visibilityLabel, visibility === 'PRIVATE' && styles.visibilityLabelActive]}>
              Private
            </Text>
            <Text style={styles.visibilityDesc}>Only admins can see this</Text>
          </Pressable>

          <Pressable
            onPress={() => setVisibility('PUBLIC')}
            style={[styles.visibilityCard, visibility === 'PUBLIC' && styles.visibilityCardActive]}
          >
            <Text style={styles.visibilityIcon}>🌐</Text>
            <Text style={[styles.visibilityLabel, visibility === 'PUBLIC' && styles.visibilityLabelActive]}>
              Public
            </Text>
            <Text style={styles.visibilityDesc}>Visible to all residents</Text>
          </Pressable>
        </View>
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
        label="Submit Complaint"
        onPress={handleSubmit}
        loading={isSubmitting}
        style={styles.submitBtn}
      />

      {/* Category picker sheet */}
      <BottomSheetPicker
        visible={showCategoryPicker}
        title="Select Category"
        options={CATEGORY_OPTIONS}
        selected={category}
        onSelect={(v) => {
          setCategory(v as ComplaintCategory)
          clearError('category')
        }}
        onClose={() => setShowCategoryPicker(false)}
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

  // Multiline description — overrides the fixed height in TextInput
  descriptionInput: {
    height: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Generic field wrapper
  field: { gap: 6 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  fieldLabelOptional: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.subtle,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
  },

  // Category picker trigger
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
  pickerTriggerError: { borderColor: Colors.error },
  pickerTriggerPressed: { backgroundColor: Colors.background },
  pickerText: { flex: 1, fontSize: 16, color: Colors.text },
  pickerPlaceholder: { color: Colors.subtle },
  pickerChevron: { fontSize: 20, color: Colors.subtle },

  // Visibility toggle
  visibilityRow: { flexDirection: 'row', gap: 10 },
  visibilityCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 4,
  },
  visibilityCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ede9fe',
  },
  visibilityIcon: { fontSize: 22 },
  visibilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  visibilityLabelActive: { color: Colors.primary },
  visibilityDesc: {
    fontSize: 11,
    color: Colors.subtle,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Image row
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
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

  // Submit
  submitBtn: { marginTop: 4 },
})
