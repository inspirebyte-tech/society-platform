import React, { useState, useCallback, useEffect } from 'react'
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
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  getMemberUnits,
  MemberOwnership,
  MemberOccupancy,
  MemberUnitsResponse,
} from '../../services/units'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'MyHome'>

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// Build unified flat cards from ownerships + occupancies
interface FlatCard {
  flatId: string
  flatName: string
  path: string | null
  ownership: MemberOwnership | null
  occupancy: MemberOccupancy | null
}

function buildFlatCards(data: MemberUnitsResponse): FlatCard[] {
  const map = new Map<string, FlatCard>()

  for (const o of data.ownerships) {
    map.set(o.flatId, {
      flatId: o.flatId,
      flatName: o.flatName,
      path: o.path,
      ownership: o,
      occupancy: null,
    })
  }

  for (const o of data.occupancies) {
    const existing = map.get(o.flatId)
    if (existing) {
      existing.occupancy = o
    } else {
      map.set(o.flatId, {
        flatId: o.flatId,
        flatName: o.flatName,
        path: o.path,
        ownership: null,
        occupancy: o,
      })
    }
  }

  return Array.from(map.values())
}

export function MyHomeScreen({ route, navigation }: Props) {
  const { societyId, memberId } = route.params
  const { permissions } = useAuth()

  const canViewOwn = permissions.includes('unit.view_own')

  const [data, setData] = useState<MemberUnitsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const result = await getMemberUnits(societyId, memberId)
      setData(result)
    } catch (e) {
      const code = getApiErrorCode(e)
      setError(getErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }, [societyId, memberId])

  useEffect(() => { load() }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  if (!canViewOwn) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyTitle}>Access restricted</Text>
          <Text style={styles.emptySub}>You don't have permission to view home details.</Text>
        </View>
      </ScreenWrapper>
    )
  }

  if (loading) return <LoadingSpinner fullScreen />

  if (error || !data) {
    return (
      <ScreenWrapper>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{error ?? 'Could not load home details.'}</Text>
          <Button label="Retry" onPress={load} style={styles.retryBtn} />
        </View>
      </ScreenWrapper>
    )
  }

  const flatCards = buildFlatCards(data)

  if (flatCards.length === 0) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>No unit assigned yet</Text>
          <Text style={styles.emptySub}>Contact your admin to get a unit assigned to you.</Text>
        </View>
        {toast ? (
          <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} />
        ) : null}
      </ScreenWrapper>
    )
  }

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
        {flatCards.map((flat) => (
          <FlatSection
            key={flat.flatId}
            flat={flat}
            onViewDetail={() =>
              navigation.navigate('UnitDetail', {
                societyId,
                unitId: flat.flatId,
                unitName: flat.flatName,
              })
            }
          />
        ))}
      </ScrollView>

      {toast ? (
        <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} />
      ) : null}
    </ScreenWrapper>
  )
}

// ─── Flat section component ───────────────────────────────────────────────────

interface FlatSectionProps {
  flat: FlatCard
  onViewDetail: () => void
}

function FlatSection({ flat, onViewDetail }: FlatSectionProps) {
  const { ownership, occupancy } = flat

  const ownershipColors = ownership
    ? (OWNERSHIP_COLORS[ownership.ownershipType] ?? { bg: Colors.border, text: Colors.subtle })
    : null

  const occupancyColors = occupancy
    ? (OCCUPANCY_COLORS[occupancy.occupancyType] ?? { bg: Colors.border, text: Colors.subtle })
    : null

  return (
    <View style={flatStyles.container}>
      {/* Primary flat card */}
      <Card style={flatStyles.card}>
        <Text style={flatStyles.flatName}>{flat.flatName}</Text>
        {flat.path ? <Text style={flatStyles.path}>{flat.path}</Text> : null}

        <View style={flatStyles.badgeRow}>
          {ownership && ownershipColors ? (
            <View style={[flatStyles.badge, { backgroundColor: ownershipColors.bg }]}>
              <Text style={[flatStyles.badgeText, { color: ownershipColors.text }]}>
                {OWNERSHIP_LABEL[ownership.ownershipType] ?? ownership.ownershipType}
              </Text>
            </View>
          ) : null}
          {occupancy && occupancyColors ? (
            <View style={[flatStyles.badge, { backgroundColor: occupancyColors.bg }]}>
              <Text style={[flatStyles.badgeText, { color: occupancyColors.text }]}>
                {OCCUPANCY_LABEL[occupancy.occupancyType] ?? occupancy.occupancyType}
              </Text>
            </View>
          ) : null}
        </View>

        <Button
          label="View Full Details"
          variant="secondary"
          onPress={onViewDetail}
          style={flatStyles.detailBtn}
        />
      </Card>

      {/* Co-owners */}
      {ownership && ownership.coOwners.length > 0 ? (
        <View style={flatStyles.section}>
          <Text style={flatStyles.sectionTitle}>CO-OWNERS</Text>
          <Card style={flatStyles.listCard}>
            {ownership.coOwners.map((co, index) => {
              const colors = OWNERSHIP_COLORS[co.ownershipType] ?? { bg: Colors.border, text: Colors.subtle }
              return (
                <React.Fragment key={index}>
                  <View style={flatStyles.listRow}>
                    <Text style={flatStyles.listName}>{co.name}</Text>
                    <View style={[flatStyles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[flatStyles.badgeText, { color: colors.text }]}>
                        {OWNERSHIP_LABEL[co.ownershipType] ?? co.ownershipType}
                      </Text>
                    </View>
                  </View>
                  {index < ownership.coOwners.length - 1 ? <View style={flatStyles.divider} /> : null}
                </React.Fragment>
              )
            })}
          </Card>
        </View>
      ) : null}

      {/* Co-occupants */}
      {occupancy && occupancy.coOccupants.length > 0 ? (
        <View style={flatStyles.section}>
          <Text style={flatStyles.sectionTitle}>CO-OCCUPANTS</Text>
          <Card style={flatStyles.listCard}>
            {occupancy.coOccupants.map((co, index) => {
              const colors = OCCUPANCY_COLORS[co.occupancyType] ?? { bg: Colors.border, text: Colors.subtle }
              return (
                <React.Fragment key={index}>
                  <View style={flatStyles.listRow}>
                    <Text style={flatStyles.listName}>{co.name}</Text>
                    <View style={[flatStyles.badge, { backgroundColor: colors.bg }]}>
                      <Text style={[flatStyles.badgeText, { color: colors.text }]}>
                        {OCCUPANCY_LABEL[co.occupancyType] ?? co.occupancyType}
                      </Text>
                    </View>
                  </View>
                  {index < occupancy.coOccupants.length - 1 ? <View style={flatStyles.divider} /> : null}
                </React.Fragment>
              )
            })}
          </Card>
        </View>
      ) : null}

      {/* Occupancy history for this flat */}
      {occupancy ? (
        <View style={flatStyles.section}>
          <Text style={flatStyles.sectionTitle}>SINCE</Text>
          <Text style={flatStyles.sinceDate}>{formatDate(occupancy.occupiedFrom)}</Text>
        </View>
      ) : ownership ? (
        <View style={flatStyles.section}>
          <Text style={flatStyles.sectionTitle}>OWNER SINCE</Text>
          <Text style={flatStyles.sinceDate}>{formatDate(ownership.ownedFrom)}</Text>
        </View>
      ) : null}
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
  emptyFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center', lineHeight: 20 },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  errorText: { fontSize: 15, color: Colors.subtle, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 32 },
})

const flatStyles = StyleSheet.create({
  container: { gap: 12 },
  card: { gap: 10 },
  flatName: { fontSize: 22, fontWeight: '700', color: Colors.text },
  path: { fontSize: 13, color: Colors.subtle, marginTop: -4 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  detailBtn: { marginTop: 4 },

  // Sections inside flat card
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  sinceDate: { fontSize: 14, color: Colors.text, fontWeight: '500' },

  listCard: { padding: 0 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
    minHeight: Spacing.minTapTarget,
  },
  listName: { fontSize: 14, fontWeight: '500', color: Colors.text, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
})
