import React from 'react'
import {
  Modal,
  View,
  Text,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native'
import { Button } from './Button'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

interface ConfirmSheetProps {
  visible: boolean
  title: string
  message?: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={confirmLabel}
            onPress={onConfirm}
            variant="danger"
            loading={loading}
          />
          <Button
            label="Cancel"
            onPress={onClose}
            variant="secondary"
            disabled={loading}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  message: {
    fontSize: 14,
    color: Colors.subtle,
    lineHeight: 21,
  },
  actions: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
  },
})
