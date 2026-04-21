import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { listMembers } from '../../services/members'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'MemberList'>

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  membershipId: string
  userId?: string
  name: string
  phone: string
  role: string
  unit: string | null
  unitId: string | null
  occupancyType: string | null
  joinedAt: string
  isActive: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ['All', 'Builder', 'Admin', 'Resident', 'Gatekeeper'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MemberListScreen({ route, navigation }: Props) {
  const { societyId } = route.params

  const [filter, setFilter] = useState<FilterOption>('All')
  const [active, setActive] = useState<Member[]>([])
  const [pending, setPending] = useState<Member[]>([])
  const [inactive, setInactive] = useState<Member[]>([])
  const [inactiveExpanded, setInactiveExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const loadMembers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const params = filter !== 'All' ? { role: filter } : undefined
        const [data, inactiveData] = await Promise.all([
          listMembers(societyId, params),
          listMembers(societyId, { ...params, status: 'inactive' as const }),
        ])
        setActive(data.active ?? [])
        setPending(data.pendingSetup ?? [])
        setInactive(inactiveData.active ?? [])
      } catch (e) {
        const code = getApiErrorCode(e)
        setToast({ message: getErrorMessage(code), type: 'error' })
      } finally {
        setLoading(false)
      }
    },
    [societyId, filter],
  )

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadMembers(true)
    setRefreshing(false)
  }, [loadMembers])

  function goToDetail(member: Member) {
    navigation.navigate('MemberDetail', {
      societyId,
      memberId: member.membershipId,
      memberName: member.name,
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner fullScreen />

  const hasAnything = active.length > 0 || pending.length > 0 || inactive.length > 0
  const noActiveMessage =
    filter !== 'All' ? `No ${filter} members.` : 'No active members.'

  return (
    <ScreenWrapper scroll={false}>
      {/* Role filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterBar}
      >
        {FILTER_OPTIONS.map((opt) => (
          <Pressable
            key={opt}
            onPress={() => setFilter(opt)}
            style={[styles.chip, filter === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === opt && styles.chipTextActive]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Active section ── */}
        <SectionHeader title="Active" count={active.length} />

        {active.length > 0 ? (
          <View style={styles.section}>
            {active.map((member, index) => (
              <React.Fragment key={member.membershipId}>
                <MemberRow member={member} onPress={() => goToDetail(member)} />
                {index < active.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <SectionEmpty message={noActiveMessage} />
        )}

        {/* ── Pending Setup section — only if not empty ── */}
        {pending.length > 0 ? (
          <>
            <SectionHeader title="Pending Setup" count={pending.length} style={styles.secondSectionHeader} />
            <View style={styles.section}>
              {pending.map((member, index) => (
                <React.Fragment key={member.membershipId}>
                  <MemberRow member={member} onPress={() => goToDetail(member)} pending />
                  {index < pending.length - 1 ? <View style={styles.divider} /> : null}
                </React.Fragment>
              ))}
            </View>
          </>
        ) : null}

        {/* ── Inactive section — collapsed by default ── */}
        {inactive.length > 0 ? (
          <>
            <CollapsibleSectionHeader
              title="Inactive"
              count={inactive.length}
              expanded={inactiveExpanded}
              onPress={() => setInactiveExpanded(v => !v)}
              style={styles.thirdSectionHeader}
            />
            {inactiveExpanded ? (
              <View style={styles.section}>
                {inactive.map((member, index) => (
                  <React.Fragment key={member.membershipId}>
                    <MemberRow member={member} onPress={() => goToDetail(member)} inactive />
                    {index < inactive.length - 1 ? <View style={styles.divider} /> : null}
                  </React.Fragment>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {/* Both empty (after filtering) */}
        {!hasAnything ? (
          <SectionEmpty message={`No ${filter === 'All' ? '' : filter + ' '}members found.`} />
        ) : null}
      </ScrollView>

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  style,
}: {
  title: string
  count: number
  style?: object
}) {
  return (
    <View style={[sectionStyles.header, style]}>
      <Text style={sectionStyles.title}>{title.toUpperCase()}</Text>
      <View style={sectionStyles.countBadge}>
        <Text style={sectionStyles.countText}>{count}</Text>
      </View>
    </View>
  )
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <View style={sectionStyles.empty}>
      <Text style={sectionStyles.emptyText}>{message}</Text>
    </View>
  )
}

function CollapsibleSectionHeader({
  title,
  count,
  expanded,
  onPress,
  style,
}: {
  title: string
  count: number
  expanded: boolean
  onPress: () => void
  style?: object
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sectionStyles.header, pressed && sectionStyles.headerPressed, style]}
    >
      <Text style={sectionStyles.title}>{title.toUpperCase()}</Text>
      <View style={sectionStyles.countBadge}>
        <Text style={sectionStyles.countText}>{count}</Text>
      </View>
      <Text style={sectionStyles.expandChevron}>{expanded ? '∧' : '∨'}</Text>
    </Pressable>
  )
}

interface MemberRowProps {
  member: Member
  onPress: () => void
  pending?: boolean
  inactive?: boolean
}

function MemberRow({ member, onPress, pending = false, inactive = false }: MemberRowProps) {
  const badge = inactive
    ? { text: Colors.subtle, bg: Colors.border }
    : ROLE_BADGE[member.role] ?? { text: Colors.subtle, bg: Colors.border }
  const avatarColor = inactive ? Colors.subtle : getAvatarColor(member.name)
  const initial = member.name.trim().charAt(0).toUpperCase()

  const isResidentRole = member.role === 'Resident' || member.role === 'Co-resident'

  const unitLine = inactive
    ? (member.unit ?? null)
    : isResidentRole
      ? (member.unit
          ? `${member.unit}${member.occupancyType ? ' · ' + (OCCUPANCY_LABEL[member.occupancyType] ?? member.occupancyType) : ''}`
          : 'No unit assigned')
      : null

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [rowStyles.row, inactive && rowStyles.rowInactive, pressed && rowStyles.rowPressed]}
    >
      {/* Avatar */}
      <View style={[rowStyles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={rowStyles.avatarText}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={rowStyles.info}>
        <View style={rowStyles.nameLine}>
          <Text style={[rowStyles.name, inactive && rowStyles.nameInactive]} numberOfLines={1}>{member.name}</Text>
          <View style={[rowStyles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[rowStyles.badgeText, { color: badge.text }]}>{member.role}</Text>
          </View>
        </View>
        {unitLine !== null ? (
          <Text style={[rowStyles.unit, pending && rowStyles.unitPending]} numberOfLines={1}>
            {pending ? '⏳ ' : ''}{unitLine}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <Text style={rowStyles.chevron}>›</Text>
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: '#ede9fe',
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.subtle,
  },
  chipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 68,
  },
  secondSectionHeader: {
    marginTop: Spacing.sectionGap,
  },
  thirdSectionHeader: {
    marginTop: Spacing.sectionGap,
  },
})

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    letterSpacing: 0.8,
  },
  countBadge: {
    backgroundColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
  },
  empty: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.subtle,
  },
  headerPressed: {
    opacity: 0.6,
  },
  expandChevron: {
    marginLeft: 'auto' as const,
    fontSize: 12,
    color: Colors.subtle,
    fontWeight: '700' as const,
  },
})

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 13,
    minHeight: Spacing.minTapTarget,
    gap: 12,
  },
  rowPressed: {
    backgroundColor: Colors.background,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.surface,
  },
  info: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    color: Colors.subtle,
  },
  unitPending: {
    color: '#d97706',
  },
  chevron: {
    fontSize: 22,
    color: Colors.subtle,
    flexShrink: 0,
    lineHeight: 26,
  },
  rowInactive: {
    opacity: 0.55,
  },
  nameInactive: {
    color: Colors.subtle,
  },
})
