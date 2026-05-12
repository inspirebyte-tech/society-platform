import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Pressable,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { getEntryLog, VisitorEntry, EntryStatus } from '../../services/visitors'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'EntryLog'>

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Statuses', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Allowed', value: 'ALLOWED' },
  { label: 'Denied', value: 'DENIED' },
  { label: 'Turned Away', value: 'TURNED_AWAY' },
  { label: 'Exited', value: 'EXITED' },
]

export function EntryLogScreen({ route }: Props) {
  const { societyId } = route.params

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const DATE_OPTIONS: { label: string; value: string }[] = [
    { label: 'Today', value: today },
    { label: 'Yesterday', value: yesterday },
    { label: 'All Time', value: '' },
  ]

  const [entries, setEntries] = useState<VisitorEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  const loadLog = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      const filters: any = {}
      if (selectedDate) filters.date = selectedDate
      if (selectedStatus) filters.status = selectedStatus

      const data = await getEntryLog(societyId, filters)
      setEntries(data)
    } catch (e) {
      setToast({ message: 'Failed to load entry log', type: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [societyId, selectedDate, selectedStatus])

  useEffect(() => {
    loadLog()
  }, [loadLog])

  const getStatusColor = (status: EntryStatus) => {
    switch (status) {
      case 'ALLOWED': return Colors.primary
      case 'APPROVED': return Colors.success
      case 'DENIED': return Colors.error
      case 'TURNED_AWAY': return Colors.error
      case 'PENDING': return '#d97706' // warning/orange
      case 'EXITED': return Colors.subtle
      default: return Colors.subtle
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--'
    const date = new Date(isoString)
    let hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    return `${hours}:${minutes} ${ampm}`
  }

  const renderItem = ({ item }: { item: VisitorEntry }) => {
    const statusColor = getStatusColor(item.status)
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.infoContainer}>
            <Text style={styles.visitorName}>{item.visitorName}</Text>
            <View style={styles.subInfoRow}>
              <Text style={styles.visitorType}>{item.visitorType}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.flatName}>{item.flatName}</Text>
            </View>
            {item.purpose ? <Text style={styles.purpose}>Purpose: {item.purpose}</Text> : null}
            {item.loggedByName ? <Text style={styles.loggedBy}>Logged by: {item.loggedByName}</Text> : null}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.timelineRow}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Logged</Text>
            <Text style={styles.timelineTime}>{formatTime(item.createdAt)}</Text>
          </View>
          <View style={styles.timelineDivider} />
          
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Entered</Text>
            <Text style={styles.timelineTime}>{item.enteredAt ? formatTime(item.enteredAt) : '--:--'}</Text>
          </View>
          <View style={styles.timelineDivider} />
          
          <View style={styles.timelineItem}>
            <Text style={styles.timelineLabel}>Exited</Text>
            <Text style={styles.timelineTime}>{item.exitedAt ? formatTime(item.exitedAt) : '--:--'}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScreenWrapper style={styles.wrapper} scroll={false}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {DATE_OPTIONS.map(opt => (
            <Pressable
              key={opt.label}
              style={[styles.chip, selectedDate === opt.value && styles.chipActive]}
              onPress={() => setSelectedDate(opt.value)}
            >
              <Text style={[styles.chipText, selectedDate === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.chipDivider} />
          {STATUS_OPTIONS.map(opt => (
            <Pressable
              key={opt.label}
              style={[styles.chip, selectedStatus === opt.value && styles.chipActive]}
              onPress={() => setSelectedStatus(opt.value)}
            >
              <Text style={[styles.chipText, selectedStatus === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadLog(true)}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No entries found</Text>
              <Text style={styles.emptySub}>Try changing your filter criteria.</Text>
            </View>
          }
        />
      )}

      {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  filtersContainer: {
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chipsScroll: { paddingHorizontal: Spacing.screenPadding, gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.subtle },
  chipTextActive: { color: Colors.surface },
  chipDivider: { width: 1, height: 24, backgroundColor: Colors.border, marginHorizontal: 4 },

  listContainer: { padding: Spacing.screenPadding, gap: Spacing.sectionGap, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  infoContainer: { flex: 1, paddingRight: 12 },
  visitorName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  subInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  visitorType: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  dot: { fontSize: 12, color: Colors.border, marginHorizontal: 6 },
  flatName: { fontSize: 13, color: Colors.subtle },
  purpose: { fontSize: 13, color: Colors.subtle, marginTop: 4 },
  loggedBy: { fontSize: 12, color: Colors.subtle, marginTop: 4, fontStyle: 'italic' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timelineItem: { flex: 1, alignItems: 'center' },
  timelineDivider: { width: 1, height: 20, backgroundColor: Colors.border },
  timelineLabel: { fontSize: 11, color: Colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  timelineTime: { fontSize: 13, fontWeight: '600', color: Colors.text, marginTop: 4 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center' },
})
