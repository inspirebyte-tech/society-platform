import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
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
  getUnit,
  endOwnership,
  endOccupancy,
  UnitDetail,
  UnitOwner,
  UnitOccupant,
} from '../../services/units'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'UnitDetail'>

const OWNERSHIP_LABEL: Record<string, string> = {
  PRIMARY_OWNER: 'Primary Owner',
  CO_OWNER: 'Co-owner',
}

const OWNERSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  PRIMARY_OWNER: { bg: '#ede9fe', text: Colors.primary },
  CO_OWNER: { bg: '#e0e7ff', text: '#6366f1' },
}

const OCCUPANCY_LABEL: Record<string, string> = {
  OWNER_RESIDENT: 'Owner Resident',
  TENANT: 'Tenant',
  FAMILY: 'Family',
  CARETAKER: 'Caretaker',
}

const OCCUPANCY_COLORS: Record<string, { bg: string; text: string }> = {
  OWNER_RESIDENT: { bg: '#dcfce7', text: Colors.success },
  TENANT: { bg: '#fef3c7', text: '#d97706' },
  FAMILY: { bg: '#e0f2fe', text: '#0284c7' },
  CARETAKER: { bg: '#fce7f3', text: '#be185d' },
}

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) {
    const local = d.slice(2)
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`
  }
  return phone
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

type PendingDelete =
  | { kind: 'ownership'; id: string; name: string }
  | { kind: 'occupancy'; id: string; name: string }

export function UnitDetailScreen({ route, navigation }: Props) {
  const { societyId, unitId } = route.params
  const { permissions } = useAuth()

  const canAssign = permissions.includes('unit.assign')

  const [unit, setUnit] = useState<UnitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await getUnit(societyId, unitId)
      setUnit(data)
      navigation.setOptions({ title: data.name })
    } catch (e) {
      const code = getApiErrorCode(e)
      setError(getErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }, [societyId, unitId, navigation])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  async function handleDeleteConfirm() {
    if (!pendingDelete || !unit) return
    setDeleteLoading(true)
    try {
      if (pendingDelete.kind === 'ownership') {
        await endOwnership(societyId, unit.id, pendingDelete.id)
        setToast({ message: 'Ownership ended.', type: 'success' })
      } else {
        await endOccupancy(societyId, unit.id, pendingDelete.id)
        setToast({ message: 'Occupancy ended.', type: 'success' })
      }
      setPendingDelete(null)
      await load()
    } catch (e) {
      const code = getApiErrorCode(e)
      setPendingDelete(null)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return <LoadingSpinner fullScreen />

  if (error || !unit) {
    return (
      <ScreenWrapper>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error ?? 'Unit not found.'}</Text>
          <Button label="Retry" onPress={load} style={styles.retryBtn} />
        </View>
      </ScreenWrapper>
    )
  }

  const meta: string[] = []
  if (unit.bhk) meta.push(`${unit.bhk} BHK`)
  if (unit.floor != null) meta.push(`Floor ${unit.floor}`)
  if (unit.area) meta.push(`${unit.area} sq.ft`)

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
        {/* ── Flat info card ── */}
        <Card style={styles.flatCard}>
          <View style={styles.flatHeader}>
            <Text style={styles.flatName}>{unit.name}</Text>
            {unit.isVacant ? (
              <View style={styles.vacantBadge}>
                <Text style={styles.vacantBadgeText}>Vacant</Text>
              </View>
            ) : null}
          </View>
          {unit.path ? (
            <Text style={styles.flatPath}>{unit.path}</Text>
          ) : null}
          {meta.length > 0 ? (
            <Text style={styles.flatMeta}>{meta.join(' · ')}</Text>
          ) : null}
        </Card>

        {/* ── Owners ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>OWNERS</Text>
            {canAssign ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('MemberList', { societyId })}
                hitSlop={12}
              >
                <Text style={styles.addBtn}>+ Add Owner</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Card style={styles.listCard}>
            {unit.owners.length > 0 ? (
              unit.owners.map((owner, index) => (
                <React.Fragment key={owner.id}>
                  <PersonRow
                    name={owner.name}
                    phone={owner.phone}
                    badgeLabel={OWNERSHIP_LABEL[owner.ownershipType] ?? owner.ownershipType}
                    badgeColors={OWNERSHIP_COLORS[owner.ownershipType] ?? { bg: Colors.border, text: Colors.subtle }}
                    isPrimary={owner.isPrimary}
                    canEnd={canAssign}
                    onEnd={() => setPendingDelete({ kind: 'ownership', id: owner.id, name: owner.name })}
                  />
                  {index < unit.owners.length - 1 ? <View style={styles.divider} /> : null}
                </React.Fragment>
              ))
            ) : (
              <Text style={styles.emptyRow}>No owners assigned</Text>
            )}
          </Card>
        </View>

        {/* ── Current Occupants ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CURRENT OCCUPANTS</Text>
            {canAssign ? (
              <TouchableOpacity
                onPress={() => navigation.navigate('MemberList', { societyId })}
                hitSlop={12}
              >
                <Text style={styles.addBtn}>+ Add Occupant</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Card style={styles.listCard}>
            {unit.currentOccupants.length > 0 ? (
              unit.currentOccupants.map((occ, index) => (
                <React.Fragment key={occ.id}>
                  <PersonRow
                    name={occ.name}
                    phone={occ.phone}
                    badgeLabel={OCCUPANCY_LABEL[occ.occupancyType] ?? occ.occupancyType}
                    badgeColors={OCCUPANCY_COLORS[occ.occupancyType] ?? { bg: Colors.border, text: Colors.subtle }}
                    isPrimary={occ.isPrimary}
                    canEnd={canAssign}
                    onEnd={() => setPendingDelete({ kind: 'occupancy', id: occ.id, name: occ.name })}
                  />
                  {index < unit.currentOccupants.length - 1 ? <View style={styles.divider} /> : null}
                </React.Fragment>
              ))
            ) : (
              <Text style={styles.emptyRow}>No current occupants</Text>
            )}
          </Card>
        </View>

        {/* ── Occupancy History ── */}
        {unit.occupancyHistory.length > 0 ? (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setHistoryExpanded((v) => !v)}
              style={styles.sectionHeader}
              hitSlop={8}
            >
              <Text style={styles.sectionTitle}>OCCUPANCY HISTORY</Text>
              <Text style={styles.expandChevron}>{historyExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {historyExpanded ? (
              <Card style={styles.listCard}>
                {unit.occupancyHistory.map((entry, index) => (
                  <React.Fragment key={index}>
                    <View style={styles.historyRow}>
                      <View style={styles.historyLeft}>
                        <Text style={styles.historyName}>{entry.name}</Text>
                        <View style={[
                          styles.badge,
                          { backgroundColor: (OCCUPANCY_COLORS[entry.occupancyType] ?? { bg: Colors.border }).bg },
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            { color: (OCCUPANCY_COLORS[entry.occupancyType] ?? { text: Colors.subtle }).text },
                          ]}>
                            {OCCUPANCY_LABEL[entry.occupancyType] ?? entry.occupancyType}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historyRight}>
                        <Text style={styles.historyDate}>{formatDate(entry.occupiedFrom)}</Text>
                        <Text style={styles.historyDateSub}>to {formatDate(entry.occupiedUntil)}</Text>
                      </View>
                    </View>
                    {index < unit.occupancyHistory.length - 1 ? <View style={styles.divider} /> : null}
                  </React.Fragment>
                ))}
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Delete confirmation */}
      {pendingDelete ? (
        <ConfirmSheet
          visible={!!pendingDelete}
          title={pendingDelete.kind === 'ownership' ? 'End ownership?' : 'End occupancy?'}
          message={`This will end ${pendingDelete.name}'s ${pendingDelete.kind} of this unit.`}
          confirmLabel={pendingDelete.kind === 'ownership' ? 'End Ownership' : 'End Occupancy'}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => setPendingDelete(null)}
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

// ─── Person row ───────────────────────────────────────────────────────────────

interface PersonRowProps {
  name: string
  phone: string
  badgeLabel: string
  badgeColors: { bg: string; text: string }
  isPrimary: boolean
  canEnd: boolean
  onEnd: () => void
}

function PersonRow({ name, phone, badgeLabel, badgeColors, isPrimary, canEnd, onEnd }: PersonRowProps) {
  return (
    <View style={personStyles.row}>
      <View style={personStyles.left}>
        <View style={personStyles.nameRow}>
          <Text style={personStyles.name}>{name}</Text>
          {isPrimary ? (
            <View style={personStyles.primaryDot} />
          ) : null}
        </View>
        <Text style={personStyles.phone}>{formatPhone(phone)}</Text>
      </View>
      <View style={personStyles.right}>
        <View style={[personStyles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[personStyles.badgeText, { color: badgeColors.text }]}>{badgeLabel}</Text>
        </View>
        {canEnd ? (
          <TouchableOpacity onPress={onEnd} hitSlop={12}>
            <Text style={personStyles.endBtn}>End</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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

  // Flat info card
  flatCard: { gap: 6 },
  flatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flatName: { fontSize: 20, fontWeight: '700', color: Colors.text, flex: 1 },
  vacantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
  },
  vacantBadgeText: { fontSize: 11, fontWeight: '600', color: '#d97706' },
  flatPath: { fontSize: 13, color: Colors.subtle },
  flatMeta: { fontSize: 13, color: Colors.subtle },

  // Section
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  addBtn: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  expandChevron: {
    fontSize: 11,
    color: Colors.subtle,
  },

  // List card
  listCard: { padding: 0 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  emptyRow: {
    padding: 16,
    fontSize: 14,
    color: Colors.subtle,
    fontStyle: 'italic',
  },

  // History row
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  historyLeft: { flex: 1, gap: 6 },
  historyName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  historyRight: { alignItems: 'flex-end', gap: 3 },
  historyDate: { fontSize: 12, fontWeight: '500', color: Colors.text },
  historyDateSub: { fontSize: 11, color: Colors.subtle },

  // Error
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 15, color: Colors.subtle, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 32 },
})

const personStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    minHeight: Spacing.minTapTarget,
  },
  left: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text },
  primaryDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
  },
  phone: { fontSize: 12, color: Colors.subtle },
  right: { alignItems: 'flex-end', gap: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  endBtn: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
})
