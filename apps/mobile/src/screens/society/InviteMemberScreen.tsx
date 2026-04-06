import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { BottomSheetPicker, PickerOption } from '../../components/BottomSheetPicker'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  createInvitation,
  listInvitations,
  cancelInvitation,
} from '../../services/invitations'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { formatPhoneDisplay, normalizePhone, isValidIndianPhone } from '../../utils/validators'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'InviteMember'>

// ─── Role options (confirmed from backend seed) ───────────────────────────────

const ROLE_OPTIONS: PickerOption[] = [
  { label: 'Admin',        value: 'role-admin' },
  { label: 'Resident',     value: 'role-resident' },
  { label: 'Gatekeeper',   value: 'role-gatekeeper' },
  { label: 'Co-resident',  value: 'role-co-resident' },
]

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label]),
)

// Role badge colours (keyed on display name returned by API)
const ROLE_BADGE: Record<string, { text: string; bg: string }> = {
  Admin:          { text: '#6366f1', bg: '#e0e7ff' },
  Resident:       { text: Colors.success, bg: '#dcfce7' },
  Gatekeeper:     { text: '#d97706', bg: '#fef3c7' },
  'Co-resident':  { text: '#7c3aed', bg: '#ede9fe' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invitation {
  id: string
  phone: string
  role: string
  invitedBy: string
  expiresAt: string
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatExpiry(dateString: string): string {
  const date = new Date(dateString)
  const diffDays = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Expired'
  if (diffDays === 1) return 'Expires tomorrow'
  if (diffDays <= 7) return `Expires in ${diffDays} days`
  return `Expires ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
}

function formatDisplayPhone(phone: string): string {
  // API returns +919876543210 — show as +91 98765 43210
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2)
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  return phone
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function InviteMemberScreen({ route }: Props) {
  const { societyId } = route.params
  const { permissions } = useAuth()

  const canInvite = permissions.includes('invitation.create')
  const canViewList = permissions.includes('invitation.view')
  const canCancel = permissions.includes('invitation.cancel')

  // ── Form state ──
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [roleError, setRoleError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [rolePicker, setRolePicker] = useState(false)

  // ── List state ──
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Cancel state ──
  const [cancelTarget, setCancelTarget] = useState<Invitation | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // ── Load invitations ──────────────────────────────────────────────────────

  const loadInvitations = useCallback(async () => {
    if (!canViewList) {
      setListLoading(false)
      return
    }
    try {
      const data = await listInvitations(societyId)
      setInvitations(data)
    } catch {
      // non-blocking — list is secondary to the form
    } finally {
      setListLoading(false)
    }
  }, [societyId, canViewList])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadInvitations()
    setRefreshing(false)
  }, [loadInvitations])

  // ── Form handlers ─────────────────────────────────────────────────────────

  function handlePhoneChange(text: string) {
    setPhone(formatPhoneDisplay(text))
    setPhoneError('')
  }

  async function handleSubmit() {
    const raw = normalizePhone(phone)

    // Client-side validation first
    if (!isValidIndianPhone(raw)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6–9.')
      return
    }
    if (!roleId) {
      setRoleError('Please select a role.')
      return
    }

    setSubmitting(true)
    try {
      await createInvitation(societyId, raw, roleId)

      // Success — show SMS confirmation, reset form, reload list
      const displayPhone = formatDisplayPhone(`+91${raw}`)
      setToast({
        message: `Invitation sent. An SMS has been sent to ${displayPhone}.`,
        type: 'success',
      })
      setPhone('')
      setRoleId('')
      await loadInvitations()
    } catch (e) {
      const code = getApiErrorCode(e)
      // These two errors map to the phone field specifically
      if (code === 'already_member') {
        setPhoneError('This number is already a member of the society.')
      } else if (code === 'invitation_exists') {
        setPhoneError('A pending invitation already exists for this number.')
      } else if (code === 'invalid_phone_format') {
        setPhoneError(getErrorMessage(code))
      } else if (code === 'invalid_role') {
        setRoleError('This role is not available. Please select another.')
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cancel invitation ─────────────────────────────────────────────────────

  async function handleCancelConfirm() {
    if (!cancelTarget) return
    setCancelLoading(true)
    try {
      await cancelInvitation(societyId, cancelTarget.id)
      // Optimistic: remove from local list immediately
      setInvitations((prev) => prev.filter((inv) => inv.id !== cancelTarget.id))
      setCancelTarget(null)
      setToast({ message: 'Invitation cancelled.', type: 'info' })
    } catch (e) {
      const code = getApiErrorCode(e)
      setCancelTarget(null)
      if (code === 'already_accepted') {
        setToast({ message: 'This invitation was already accepted.', type: 'error' })
        await loadInvitations() // refresh since state is stale
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper scroll={false}>
      <FlatList
        data={invitations}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        // ── Form as header ──
        ListHeaderComponent={
          <View style={styles.header}>
            {canInvite ? (
              <Card style={styles.formCard}>
                <TextInput
                  label="Mobile Number"
                  value={phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={11}
                  placeholder="98765 43210"
                  error={phoneError}
                  helper="Must be a 10-digit Indian mobile number"
                />

                {/* Role picker */}
                <View>
                  <Text style={styles.fieldLabel}>Role</Text>
                  <Pressable
                    onPress={() => { setRolePicker(true); setRoleError('') }}
                    style={({ pressed }) => [
                      styles.rolePicker,
                      roleId ? styles.rolePickerFilled : null,
                      roleError ? styles.rolePickerError : null,
                      pressed && styles.rolePickerPressed,
                    ]}
                  >
                    <Text style={[styles.rolePickerText, !roleId && styles.rolePickerPlaceholder]}>
                      {roleId ? ROLE_LABEL[roleId] : 'Select role'}
                    </Text>
                    <Text style={styles.chevron}>⌄</Text>
                  </Pressable>
                  {roleError ? <Text style={styles.fieldError}>{roleError}</Text> : null}
                </View>

                <Button
                  label="Send Invitation"
                  onPress={handleSubmit}
                  loading={submitting}
                  style={styles.submitBtn}
                />
              </Card>
            ) : null}

            {/* Section header for list */}
            {canViewList ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>Pending Invitations</Text>
                {listLoading ? (
                  <ActivityIndicator size="small" color={Colors.subtle} />
                ) : (
                  <Text style={styles.listCount}>
                    {invitations.length > 0 ? `${invitations.length}` : ''}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        }
        // ── Empty state ──
        ListEmptyComponent={
          canViewList && !listLoading ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyListText}>No pending invitations.</Text>
            </View>
          ) : null
        }
        // ── Each invitation row ──
        renderItem={({ item }) => (
          <InvitationRow
            invitation={item}
            canCancel={canCancel}
            onCancel={() => setCancelTarget(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.screenPadding }} />}
        contentContainerStyle={styles.listContent}
      />

      {/* Role picker */}
      <BottomSheetPicker
        visible={rolePicker}
        title="Select Role"
        options={ROLE_OPTIONS}
        selected={roleId || null}
        onSelect={(v) => { setRoleId(v); setRoleError('') }}
        onClose={() => setRolePicker(false)}
      />

      {/* Cancel confirmation */}
      <ConfirmSheet
        visible={!!cancelTarget}
        title="Cancel invitation?"
        message={
          cancelTarget
            ? `The invitation for ${formatDisplayPhone(cancelTarget.phone)} will be cancelled. They will no longer be able to join using this invite.`
            : undefined
        }
        confirmLabel="Cancel Invitation"
        loading={cancelLoading}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
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

// ─── Invitation row ───────────────────────────────────────────────────────────

interface InvitationRowProps {
  invitation: Invitation
  canCancel: boolean
  onCancel: () => void
}

function InvitationRow({ invitation, canCancel, onCancel }: InvitationRowProps) {
  const badge = ROLE_BADGE[invitation.role] ?? { text: Colors.subtle, bg: Colors.border }

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.left}>
        {/* Phone + role badge */}
        <View style={rowStyles.topLine}>
          <Text style={rowStyles.phone}>{formatDisplayPhone(invitation.phone)}</Text>
          <View style={[rowStyles.roleBadge, { backgroundColor: badge.bg }]}>
            <Text style={[rowStyles.roleBadgeText, { color: badge.text }]}>
              {invitation.role}
            </Text>
          </View>
        </View>

        {/* Meta */}
        <Text style={rowStyles.meta}>
          Invited by {invitation.invitedBy} · {formatExpiry(invitation.expiresAt)}
        </Text>
      </View>

      {/* Cancel button */}
      {canCancel ? (
        <Pressable
          onPress={onCancel}
          hitSlop={12}
          style={({ pressed }) => [rowStyles.cancelBtn, pressed && rowStyles.cancelBtnPressed]}
        >
          <Text style={rowStyles.cancelBtnText}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    gap: Spacing.sectionGap,
  },
  formCard: {
    gap: Spacing.itemGap + 2,
    marginHorizontal: Spacing.screenPadding,
    marginTop: Spacing.screenPadding,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  rolePicker: {
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
  rolePickerFilled: {
    borderColor: Colors.primary,
  },
  rolePickerError: {
    borderColor: Colors.error,
  },
  rolePickerPressed: {
    backgroundColor: Colors.background,
  },
  rolePickerText: {
    fontSize: 16,
    color: Colors.text,
  },
  rolePickerPlaceholder: {
    color: Colors.subtle,
  },
  chevron: {
    fontSize: 20,
    color: Colors.subtle,
    lineHeight: 24,
  },
  fieldError: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 4,
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 4,
  },
  listHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  listCount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  // List
  listContent: {
    paddingBottom: 40,
  },
  emptyList: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 20,
  },
  emptyListText: {
    fontSize: 14,
    color: Colors.subtle,
    textAlign: 'center',
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    minHeight: Spacing.minTapTarget,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  phone: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    color: Colors.subtle,
    lineHeight: 18,
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  cancelBtnPressed: {
    backgroundColor: '#fee2e2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
})
