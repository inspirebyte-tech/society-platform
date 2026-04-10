import React, { useCallback, useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  TextInput as RNTextInput,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { getComplaint, updateComplaintStatus, ComplaintDetail } from '../../services/complaints'
import { CATEGORY_LABEL, CATEGORY_ICON, STATUS_LABEL, STATUS_COLORS } from '../../utils/complaintMeta'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'ComplaintDetail'>

const REJECTION_REASONS = [
  'Duplicate complaint',
  'Outside society jurisdiction',
  'Invalid or incomplete information',
  'Other',
]

export function ComplaintDetailScreen({ route }: Props) {
  const { societyId, complaintId } = route.params
  const { permissions, user } = useAuth()

  const isAdmin = permissions.includes('member.view')

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [imageModalUri, setImageModalUri] = useState<string | null>(null)
  const [showResolveSheet, setShowResolveSheet] = useState(false)
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customReason, setCustomReason] = useState('')
  const [isActioning, setIsActioning] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await getComplaint(societyId, complaintId)
      setComplaint(data)
      setLoadError(null)
    } catch (e) {
      const code = getApiErrorCode(e)
      setLoadError(getErrorMessage(code))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [societyId, complaintId])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    load()
  }, [load])

  // Determine permissions for actions
  const isMyComplaint = !!complaint?.raisedBy && complaint.raisedBy.phone === user?.phone
  const canResolve = complaint?.status === 'OPEN' && (isAdmin || isMyComplaint)
  const canReject = complaint?.status === 'OPEN' && isAdmin
  const hasActions = canResolve || canReject

  async function handleResolve() {
    setIsActioning(true)
    try {
      await updateComplaintStatus(societyId, complaintId, 'RESOLVED')
      setShowResolveSheet(false)
      setToast({ message: 'Complaint marked as resolved.', type: 'success' })
      load()
    } catch (e) {
      setShowResolveSheet(false)
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setIsActioning(false)
    }
  }

  function closeRejectSheet() {
    setShowRejectSheet(false)
    setSelectedReason(null)
    setCustomReason('')
  }

  async function handleReject() {
    const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason
    if (!reason) return
    setIsActioning(true)
    try {
      await updateComplaintStatus(societyId, complaintId, 'REJECTED', reason)
      closeRejectSheet()
      setToast({ message: 'Complaint rejected.', type: 'info' })
      load()
    } catch (e) {
      closeRejectSheet()
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) return <LoadingSpinner fullScreen />

  if (loadError || !complaint) {
    return (
      <EmptyState
        title="Could not load complaint"
        subtitle={loadError ?? 'Something went wrong.'}
        actionLabel="Retry"
        onAction={() => {
          setIsLoading(true)
          load()
        }}
      />
    )
  }

  const resolveReason = selectedReason === 'Other' ? customReason.trim() : selectedReason

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      {/* ── Scrollable content ── */}
      <ScrollView
        contentContainerStyle={[styles.content, hasActions && styles.contentWithActions]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Status badge */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[complaint.status].bg }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[complaint.status].text }]}>
              {STATUS_LABEL[complaint.status]}
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{complaint.title}</Text>

        {/* Category + Visibility tags */}
        <View style={styles.tagsRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {CATEGORY_ICON[complaint.category]}{'  '}{CATEGORY_LABEL[complaint.category]}
            </Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>
              {complaint.visibility === 'PUBLIC' ? '🌐  Public' : '🔒  Private'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{complaint.description}</Text>

        {/* Images */}
        {complaint.images.length > 0 ? (
          <View style={styles.imagesSection}>
            <Text style={styles.sectionLabel}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imagesScroll}
            >
              {complaint.images.map((img) => (
                <Pressable
                  key={img.id}
                  onPress={() => setImageModalUri(img.imageUrl)}
                  style={({ pressed }) => pressed && styles.thumbnailPressed}
                >
                  <Image source={{ uri: img.imageUrl }} style={styles.imageThumbnail} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Meta: raised by / date */}
        <View style={styles.metaCard}>
          {isAdmin && complaint.raisedBy ? (
            <MetaRow label="Raised by" value={complaint.raisedBy.name} />
          ) : null}
          <MetaRow label="Raised on" value={formatDate(complaint.createdAt)} />
        </View>

        {/* Resolved info */}
        {complaint.status === 'RESOLVED' && complaint.resolvedBy ? (
          <View style={styles.resolvedCard}>
            <Text style={styles.resolvedCardLabel}>Resolved</Text>
            <MetaRow label="Resolved by" value={complaint.resolvedBy} />
            {complaint.resolvedAt ? (
              <MetaRow label="Resolved on" value={formatDate(complaint.resolvedAt)} />
            ) : null}
          </View>
        ) : null}

        {/* Rejection reason */}
        {complaint.status === 'REJECTED' && complaint.rejectionReason ? (
          <View style={styles.rejectedCard}>
            <Text style={styles.rejectedCardLabel}>Reason for Rejection</Text>
            <Text style={styles.rejectedReason}>{complaint.rejectionReason}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* ── Bottom action bar ── */}
      {hasActions ? (
        <View style={styles.actionBar}>
          {canResolve ? (
            <Button
              label="Mark Resolved"
              onPress={() => setShowResolveSheet(true)}
              style={styles.actionBtn}
            />
          ) : null}
          {canReject ? (
            <Button
              label="Reject"
              variant="danger"
              onPress={() => setShowRejectSheet(true)}
              style={styles.actionBtn}
            />
          ) : null}
        </View>
      ) : null}

      {/* ── Resolve confirmation sheet ── */}
      <ResolveSheet
        visible={showResolveSheet}
        loading={isActioning}
        onConfirm={handleResolve}
        onClose={() => setShowResolveSheet(false)}
      />

      {/* ── Reject sheet ── */}
      <RejectSheet
        visible={showRejectSheet}
        selectedReason={selectedReason}
        customReason={customReason}
        canConfirm={!!resolveReason}
        loading={isActioning}
        onSelectReason={setSelectedReason}
        onChangeCustomReason={setCustomReason}
        onConfirm={handleReject}
        onClose={closeRejectSheet}
      />

      {/* ── Full-screen image viewer ── */}
      <Modal
        visible={!!imageModalUri}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalUri(null)}
      >
        <Pressable style={styles.imageModal} onPress={() => setImageModalUri(null)}>
          {imageModalUri ? (
            <Image
              source={{ uri: imageModalUri }}
              style={styles.imageModalContent}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>

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

// ─── MetaRow ──────────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={metaRowStyles.row}>
      <Text style={metaRowStyles.label}>{label}</Text>
      <Text style={metaRowStyles.value}>{value}</Text>
    </View>
  )
}

const metaRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 14, color: Colors.subtle },
  value: { fontSize: 14, fontWeight: '500', color: Colors.text },
})

// ─── ResolveSheet ─────────────────────────────────────────────────────────────

function ResolveSheet({
  visible,
  loading,
  onConfirm,
  onClose,
}: {
  visible: boolean
  loading: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheetStyles.overlay} />
      </TouchableWithoutFeedback>
      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <View style={sheetStyles.body}>
          <Text style={sheetStyles.title}>Mark as Resolved?</Text>
          <Text style={sheetStyles.message}>
            This will mark the complaint as resolved. This action cannot be undone.
          </Text>
        </View>
        <View style={sheetStyles.actions}>
          <Button label="Mark Resolved" onPress={onConfirm} loading={loading} />
          <Button label="Cancel" variant="secondary" onPress={onClose} disabled={loading} />
        </View>
      </View>
    </Modal>
  )
}

// ─── RejectSheet ──────────────────────────────────────────────────────────────

interface RejectSheetProps {
  visible: boolean
  selectedReason: string | null
  customReason: string
  canConfirm: boolean
  loading: boolean
  onSelectReason: (r: string) => void
  onChangeCustomReason: (t: string) => void
  onConfirm: () => void
  onClose: () => void
}

function RejectSheet({
  visible,
  selectedReason,
  customReason,
  canConfirm,
  loading,
  onSelectReason,
  onChangeCustomReason,
  onConfirm,
  onClose,
}: RejectSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheetStyles.overlay} />
      </TouchableWithoutFeedback>

      <View style={sheetStyles.sheet}>
        <View style={sheetStyles.handle} />
        <Text style={rejectStyles.sheetTitle}>Reject Complaint</Text>

        {REJECTION_REASONS.map((reason, i) => {
          const isSelected = selectedReason === reason
          const isLast = i === REJECTION_REASONS.length - 1
          return (
            <Pressable
              key={reason}
              onPress={() => onSelectReason(reason)}
              style={({ pressed }) => [
                rejectStyles.option,
                !isLast && rejectStyles.optionBorder,
                isSelected && rejectStyles.optionSelected,
                pressed && rejectStyles.optionPressed,
              ]}
            >
              <View style={[rejectStyles.radio, isSelected && rejectStyles.radioActive]}>
                {isSelected ? <View style={rejectStyles.radioDot} /> : null}
              </View>
              <Text style={[rejectStyles.optionText, isSelected && rejectStyles.optionTextActive]}>
                {reason}
              </Text>
            </Pressable>
          )
        })}

        {selectedReason === 'Other' ? (
          <View style={rejectStyles.customWrap}>
            <RNTextInput
              value={customReason}
              onChangeText={onChangeCustomReason}
              placeholder="Describe the reason..."
              placeholderTextColor={Colors.subtle}
              style={rejectStyles.customInput}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              autoFocus
            />
          </View>
        ) : null}

        <View style={sheetStyles.actions}>
          <Button
            label="Confirm Rejection"
            variant="danger"
            onPress={onConfirm}
            disabled={!canConfirm}
            loading={loading}
          />
          <Button label="Cancel" variant="secondary" onPress={onClose} disabled={loading} />
        </View>
      </View>
    </Modal>
  )
}

// ─── Shared sheet styles ───────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
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
    paddingTop: 12,
    gap: 10,
  },
})

const rejectStyles = StyleSheet.create({
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
    minHeight: Spacing.minTapTarget,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionSelected: { backgroundColor: '#ede9fe' },
  optionPressed: { backgroundColor: Colors.background },
  optionText: { fontSize: 15, color: Colors.text, flex: 1 },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioActive: { borderColor: Colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  customWrap: {
    marginHorizontal: Spacing.screenPadding,
    marginTop: 4,
    marginBottom: 8,
  },
  customInput: {
    height: 72,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
})

// ─── Main screen styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background },

  content: {
    padding: Spacing.screenPadding,
    gap: Spacing.sectionGap,
    paddingBottom: 32,
  },
  contentWithActions: {
    paddingBottom: 100, // space for bottom action bar
  },

  // Status badge (large, prominent at top)
  statusRow: { flexDirection: 'row' },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Title
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 30,
    marginTop: -8,
  },

  // Tags row
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontSize: 13, color: Colors.subtle, fontWeight: '500' },

  // Description
  description: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },

  // Images
  imagesSection: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  imagesScroll: { gap: 10 },
  imageThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  thumbnailPressed: { opacity: 0.8 },

  // Meta card
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },

  // Resolved card (green tint)
  resolvedCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  resolvedCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Rejected card (red tint)
  rejectedCard: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  rejectedCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rejectedReason: {
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
  },

  // Bottom action bar
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: { flex: 1 },

  // Full-screen image modal
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '80%',
  },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
