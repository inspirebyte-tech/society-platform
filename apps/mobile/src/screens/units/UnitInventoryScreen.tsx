import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  listUnits,
  UnitListItem,
  UnitStatusFilter,
} from '../../services/units'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'UnitInventory'>

type FilterValue = 'ALL' | UnitStatusFilter

const FILTERS: { label: string; value: FilterValue }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Vacant', value: 'vacant' },
]

const OCCUPANCY_LABEL: Record<string, string> = {
  OWNER_RESIDENT: 'Owner',
  TENANT: 'Tenant',
  FAMILY: 'Family',
  CARETAKER: 'Caretaker',
}

export function UnitInventoryScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions } = useAuth()

  const canViewAll = permissions.includes('unit.view_all')

  const [filter, setFilter] = useState<FilterValue>('ALL')
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [stats, setStats] = useState({ total: 0, occupied: 0, vacant: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const load = useCallback(
    async (reset = true) => {
      if (!canViewAll) return
      try {
        if (reset) setIsLoading(true)
        const params = filter !== 'ALL' ? { status: filter as UnitStatusFilter } : {}
        const result = await listUnits(societyId, params)
        if (!isMounted.current) return
        setUnits(result.units)
        setStats({ total: result.total, occupied: result.occupied, vacant: result.vacant })
      } catch {
        if (isMounted.current) {
          setToast({ message: 'Could not load units. Pull to retry.', type: 'error' })
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [societyId, filter, canViewAll],
  )

  useFocusEffect(
    useCallback(() => {
      load(true)
    }, [load]),
  )

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    load(false)
  }, [load])

  if (!canViewAll) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyTitle}>Access restricted</Text>
          <Text style={styles.emptySub}>You don't have permission to view the unit inventory.</Text>
        </View>
      </ScreenWrapper>
    )
  }

  if (isLoading) return <LoadingSpinner fullScreen />

  const renderItem = ({ item }: { item: UnitListItem }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('UnitDetail', {
          societyId,
          unitId: item.id,
          unitName: item.name,
        })
      }
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={styles.flatName}>{item.name}</Text>
          {item.isVacant ? (
            <View style={styles.vacantBadge}>
              <Text style={styles.vacantBadgeText}>Vacant</Text>
            </View>
          ) : null}
        </View>
        {item.path ? (
          <Text style={styles.path} numberOfLines={1}>{item.path}</Text>
        ) : null}
        <View style={styles.rowMeta}>
          {item.primaryOwner ? (
            <Text style={styles.metaText}>Owner: {item.primaryOwner}</Text>
          ) : null}
          {item.primaryOccupant ? (
            <Text style={styles.metaText}>
              Occupant: {item.primaryOccupant}
              {item.occupancyType
                ? ` · ${OCCUPANCY_LABEL[item.occupancyType] ?? item.occupancyType}`
                : null}
            </Text>
          ) : null}
          {!item.primaryOwner && !item.primaryOccupant ? (
            <Text style={styles.metaTextSubtle}>No owner or occupant assigned</Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  )

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.success }]}>{stats.occupied}</Text>
          <Text style={styles.statLabel}>Occupied</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#d97706' }]}>{stats.vacant}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipBar}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.chip, filter === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Unit list */}
      <FlatList
        data={units}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyFull}>
            <Text style={styles.emptyTitle}>No units</Text>
            <Text style={styles.emptySub}>
              {filter === 'ALL' ? 'No units in this society.' : `No ${filter} units.`}
            </Text>
          </View>
        }
        contentContainerStyle={units.length === 0 ? styles.emptyContainer : undefined}
        style={styles.list}
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
  wrapper: { backgroundColor: Colors.background },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.subtle,
    fontWeight: '500',
  },

  // Filter chips
  chipBar: { flexGrow: 0, flexShrink: 0 },
  chips: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.subtle,
  },
  chipTextActive: { color: Colors.surface },

  // List
  list: { flex: 1 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
    minHeight: Spacing.minTapTarget,
  },
  rowPressed: { backgroundColor: Colors.background },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flatName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  vacantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
  },
  vacantBadgeText: { fontSize: 11, fontWeight: '600', color: '#d97706' },
  path: { fontSize: 12, color: Colors.subtle },
  rowMeta: { gap: 2 },
  metaText: { fontSize: 12, color: Colors.subtle },
  metaTextSubtle: { fontSize: 12, color: Colors.border, fontStyle: 'italic' },
  chevron: { fontSize: 22, color: Colors.subtle, lineHeight: 26 },

  // Empty
  emptyContainer: { flexGrow: 1 },
  emptyFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center' },
})
