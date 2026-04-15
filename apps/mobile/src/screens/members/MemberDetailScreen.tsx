import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  getMember,
  deactivateMember,
  moveOutMember,
  reactivateMember,
} from '../../services/members'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'MemberDetail'>

// ─── Types ────────────────────────────────────────────────────────────────────

interface OccupancyHistory {
  unitName: string
  from: string
  until: string | null
  type: string
}

interface MemberDetail {
  membershipId: string
  userId: string
  name: string
  phone: string
  role: string
  unit: string | null
  unitId: string | null
  occupancyType: string | null
  isPrimary: boolean
  joinedAt: string
  invitedBy: string
  isActive: boolean
  occupancyHistory: OccupancyHistory[]
}

type ActionType = 'deactivate' | 'moveout' | 'reactivate'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, { text: string; bg: string }> = {
  Builder:        { text: Colors.primary, bg: '#ede9fe' },
  Admin:          { text: '#6366f1',      bg: '#e0e7ff' },
  Resident:       { text: Colors.success, bg: '#dcfce7' },
  Gatekeeper:     { text: '#d97706',      bg: '#fef3c7' },
  'Co-resident':  { text: '#7c3aed',      bg: '#ede9fe' },
}

const OCCUPANCY_LABEL: Record<string, string> = {
  OWNER_RESIDENT: 'Owner · Resident',
  OWNER:          'Owner',
  TENANT:         'Tenant',
}

const AVATAR_COLORS = [
  Colors.primary, '#6366f1', '#7c3aed', '#059669', '#d97706', '#0891b2',
]
function getAvatarColor(name: string): string {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) {
    const local = d.slice(2)
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  return phone
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MemberDetailScreen({ route, navigation }: Props) {
  const { societyId, memberId } = route.params
  const { permissions } = useAuth()

  const canRemove = permissions.includes('member.remove')
  const canReactivate = permissions.includes('member.reactivate')
  const canAssignUnit = permissions.includes('unit.assign')

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [confirmAction, setConfirmAction] = useState<ActionType | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadMember = useCallback(async () => {
    setError(null)
    try {
      const data = await getMember(societyId, memberId)
      setMember(data)
      // Sync header title with actual name
      navigation.setOptions({ title: data.name })
    } catch (e) {
      const code = getApiErrorCode(e)
      setError(getErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }, [societyId, memberId, navigation])

  useEffect(() => {
    loadMember()
  }, [loadMember])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadMember()
    setRefreshing(false)
  }, [loadMember])

  // ── Actions ───────────────────────────────────────────────────────────────

  const ACTION_CONFIG: Record<ActionType, {
    title: string
    message: string
    confirmLabel: string
    fn: () => Promise<{ message: string; warning?: string }>
    successMsg: (w?: string) => string
  }> = {
    deactivate: {
      title: 'Remove access?',
      message: 'This will remove their app access. Their occupancy and unit assignment will be preserved.',
      confirmLabel: 'Remove Access',
      fn: () => deactivateMember(societyId, memberId),
      successMsg: (w) => w ?? 'Access removed.',
    },
    moveout: {
      title: 'Mark as moved out?',
      message: "This will remove access AND end their current unit occupancy. Ownership is not affected.",
      confirmLabel: 'Mark Moved Out',
      fn: () => moveOutMember(societyId, memberId),
      successMsg: () => 'Marked as moved out.',
    },
    reactivate: {
      title: 'Restore access?',
      message: 'This will restore their app access.',
      confirmLabel: 'Restore Access',
      fn: () => reactivateMember(societyId, memberId),
      successMsg: (w) => w ?? 'Access restored.',
    },
  }

  async function handleActionConfirm() {
    if (!confirmAction) return
    setActionLoading(true)
    const cfg = ACTION_CONFIG[confirmAction]
    try {
      const result = await cfg.fn()
      setConfirmAction(null)
      setToast({ message: cfg.successMsg(result.warning), type: 'success' })
      await loadMember()
    } catch (e) {
      const code = getApiErrorCode(e)
      setConfirmAction(null)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner fullScreen />

  if (error || !member) {
    return (
      <ScreenWrapper>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error ?? 'Member not found.'}</Text>
          <Button label="Retry" onPress={loadMember} style={styles.retryBtn} />
        </View>
      </ScreenWrapper>
    )
  }

  const badge = ROLE_BADGE[member.role] ?? { text: Colors.subtle, bg: Colors.border }
  const avatarColor = getAvatarColor(member.name)
  const initial = member.name.trim().charAt(0).toUpperCase()

  const isActive = member.isActive
  const hasUnit = !!member.unit
  const cfg = confirmAction ? ACTION_CONFIG[confirmAction] : null

  return (
    <ScreenWrapper scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Identity card ── */}
        <Card style={styles.identityCard}>
          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.memberName} numberOfLines={2}>{member.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{member.role}</Text>
                </View>
                {!isActive ? (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inactive</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={styles.detailsGrid}>
            <DetailRow label="Phone" value={formatPhone(member.phone)} />
            <DetailRow label="Joined" value={formatDate(member.joinedAt)} />
            {member.invitedBy ? (
              <DetailRow label="Invited by" value={member.invitedBy} />
            ) : null}
            {member.unit ? (
              <DetailRow
                label="Unit"
                value={`${member.unit}${member.occupancyType ? ' · ' + (OCCUPANCY_LABEL[member.occupancyType] ?? member.occupancyType) : ''}`}
              />
            ) : (
              <DetailRow label="Unit" value="Not assigned" subtle />
            )}
          </View>
        </Card>

        {/* ── Occupancy history ── */}
        {member.occupancyHistory.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupancy History</Text>
            <Card style={styles.historyCard}>
              {member.occupancyHistory.map((entry, index) => (
                <React.Fragment key={index}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyUnit}>{entry.unitName}</Text>
                      <Text style={styles.historyType}>
                        {OCCUPANCY_LABEL[entry.type] ?? entry.type}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyDate}>{formatDate(entry.from)}</Text>
                      <Text style={styles.historyDateSub}>
                        {entry.until ? `to ${formatDate(entry.until)}` : 'Current'}
                      </Text>
                    </View>
                  </View>
                  {index < member.occupancyHistory.length - 1 ? (
                    <View style={styles.historyDivider} />
                  ) : null}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ) : null}

        {/* ── Actions ── */}
        {(canRemove || canReactivate || canAssignUnit) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              {/* Assign Unit — admin/builder only */}
              {canAssignUnit ? (
                <Button
                  label="Assign Unit"
                  variant="primary"
                  onPress={() =>
                    navigation.navigate('AssignUnit', {
                      societyId,
                      memberId: member.userId,
                      memberName: member.name,
                    })
                  }
                />
              ) : null}
              {/* Deactivate — active member only */}
              {canRemove && isActive ? (
                <Button
                  label="Remove Access"
                  variant="secondary"
                  onPress={() => setConfirmAction('deactivate')}
                />
              ) : null}

              {/* Move out — active + has unit */}
              {canRemove && isActive && hasUnit ? (
                <Button
                  label="Mark as Moved Out"
                  variant="secondary"
                  onPress={() => setConfirmAction('moveout')}
                />
              ) : null}

              {/* Reactivate — inactive member only */}
              {canReactivate && !isActive ? (
                <Button
                  label="Restore Access"
                  variant="primary"
                  onPress={() => setConfirmAction('reactivate')}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Action confirmation — bottom sheet */}
      {cfg ? (
        <ConfirmSheet
          visible={!!confirmAction}
          title={cfg.title}
          message={cfg.message}
          confirmLabel={cfg.confirmLabel}
          loading={actionLoading}
          onConfirm={handleActionConfirm}
          onClose={() => setConfirmAction(null)}
        />
      ) : null}

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

// ─── Detail row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, subtle }: { label: string; value: string; subtle?: boolean }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={[detailStyles.value, subtle && detailStyles.subtle]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: Spacing.screenPadding,
    gap: Spacing.sectionGap,
    paddingBottom: 40,
  },

  // Identity
  identityCard: {
    gap: Spacing.itemGap + 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.surface,
  },
  identityInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 26,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  inactiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error,
  },
  detailsGrid: {
    gap: 0,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.itemGap,
  },

  // Occupancy history
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  historyCard: {
    padding: 0,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  historyLeft: {
    flex: 1,
    gap: 3,
  },
  historyUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  historyType: {
    fontSize: 12,
    color: Colors.subtle,
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  historyDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  historyDateSub: {
    fontSize: 11,
    color: Colors.subtle,
  },
  historyDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 14,
  },

  // Actions
  actionButtons: {
    gap: 10,
  },

  // Error
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: Colors.subtle,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 32,
  },
})

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 16,
    minHeight: Spacing.minTapTarget,
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: Colors.subtle,
    fontWeight: '500',
    flexShrink: 0,
  },
  value: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  subtle: {
    color: Colors.subtle,
    fontStyle: 'italic',
  },
})
