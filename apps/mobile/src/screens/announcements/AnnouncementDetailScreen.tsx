import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { Button } from '../../components/Button'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  getAnnouncement,
  pinAnnouncement,
  deleteAnnouncement,
  Announcement,
  AnnouncementCategory,
} from '../../services/announcements'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'AnnouncementDetail'>

const CATEGORY_ICON: Record<AnnouncementCategory, string> = {
  GENERAL:     '📢',
  MAINTENANCE: '🔧',
  MEETING:     '👥',
  EMERGENCY:   '🚨',
  CELEBRATION: '🎉',
}

const CATEGORY_COLORS: Record<AnnouncementCategory, { bg: string; text: string }> = {
  GENERAL:     { bg: '#f3f4f6', text: '#6b7280' },
  MAINTENANCE: { bg: '#fff7ed', text: '#ea580c' },
  MEETING:     { bg: '#eff6ff', text: '#2563eb' },
  EMERGENCY:   { bg: '#fef2f2', text: '#dc2626' },
  CELEBRATION: { bg: '#faf5ff', text: '#9333ea' },
}

export function AnnouncementDetailScreen({ route, navigation }: Props) {
  const { societyId, announcementId } = route.params
  const { permissions } = useAuth()

  const canPin    = permissions.includes('announcement.pin')
  const canDelete = permissions.includes('announcement.delete')

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [isPinning, setIsPinning]         = useState(false)
  const [showDeleteSheet, setShowDeleteSheet] = useState(false)
  const [isDeleting, setIsDeleting]       = useState(false)
  const [toast, setToast]               = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getAnnouncement(societyId, announcementId)
      setAnnouncement(data)
      navigation.setOptions({ title: data.title })
    } catch {
      setToast({ message: 'Could not load announcement.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [societyId, announcementId, navigation])

  useEffect(() => {
    load()
  }, [load])

  async function handlePin() {
    if (!announcement) return
    setIsPinning(true)
    try {
      const result = await pinAnnouncement(societyId, announcementId)
      setAnnouncement((prev) => prev ? { ...prev, isPinned: result.isPinned } : prev)
    } catch (e) {
      const code = getApiErrorCode(e)
      if (code === 'max_pinned_reached') {
        setToast({ message: 'Maximum 3 announcements can be pinned. Unpin one first.', type: 'error' })
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setIsPinning(false)
    }
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true)
    try {
      await deleteAnnouncement(societyId, announcementId)
      setShowDeleteSheet(false)
      navigation.goBack()
    } catch (e) {
      const code = getApiErrorCode(e)
      setShowDeleteSheet(false)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <LoadingSpinner fullScreen />
  if (!announcement) return null

  const colors = CATEGORY_COLORS[announcement.category]

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
            <Text style={styles.categoryIcon}>{CATEGORY_ICON[announcement.category]}</Text>
            <Text style={[styles.categoryText, { color: colors.text }]}>
              {announcement.category.charAt(0) + announcement.category.slice(1).toLowerCase()}
            </Text>
          </View>
          {announcement.isPinned ? (
            <View style={styles.pinnedBadge}>
              <Text style={styles.pinnedText}>📌 Pinned</Text>
            </View>
          ) : null}
        </View>

        {/* Title */}
        <Text style={styles.title}>{announcement.title}</Text>

        {/* Body */}
        <Text style={styles.body}>{announcement.body}</Text>

        {/* Images */}
        {announcement.images.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesRow}
          >
            {announcement.images.map((img) => (
              <Image key={img.id} source={{ uri: img.imageUrl }} style={styles.image} />
            ))}
          </ScrollView>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Posted by <Text style={styles.footerName}>{announcement.createdBy.name}</Text>
          </Text>
          <Text style={styles.footerDate}>{formatDate(announcement.createdAt)}</Text>
        </View>

        {/* Admin actions */}
        {(canPin || canDelete) ? (
          <View style={styles.actions}>
            {canPin ? (
              <Pressable
                onPress={handlePin}
                disabled={isPinning}
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnOutline, pressed && styles.actionBtnPressed]}
              >
                {isPinning
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Text style={styles.actionBtnOutlineText}>
                      {announcement.isPinned ? 'Unpin' : 'Pin'}
                    </Text>
                }
              </Pressable>
            ) : null}
            {canDelete ? (
              <Pressable
                onPress={() => setShowDeleteSheet(true)}
                style={({ pressed }) => [styles.actionBtn, styles.actionBtnDestructive, pressed && styles.actionBtnPressed]}
              >
                <Text style={styles.actionBtnDestructiveText}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

      </ScrollView>

      <ConfirmSheet
        visible={showDeleteSheet}
        title="Delete Announcement?"
        message="This cannot be undone."
        confirmLabel="Delete"
        loading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteSheet(false)}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background },

  content: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
    gap: 20,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  pinnedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#fefce8',
  },
  pinnedText: { fontSize: 13, fontWeight: '600', color: '#92400e' },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 30,
  },

  body: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
  },

  imagesRow: {
    gap: 10,
    paddingVertical: 4,
  },
  image: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.border,
  },

  footer: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: { fontSize: 13, color: Colors.subtle },
  footerName: { fontWeight: '600', color: Colors.text },
  footerDate: { fontSize: 13, color: Colors.subtle },

  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPressed: { opacity: 0.7 },
  actionBtnOutline: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  actionBtnOutlineText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  actionBtnDestructive: { backgroundColor: Colors.error },
  actionBtnDestructiveText: { fontSize: 15, fontWeight: '600', color: Colors.surface },
})
