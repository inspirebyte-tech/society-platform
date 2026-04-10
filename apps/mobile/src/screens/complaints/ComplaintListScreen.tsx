import React, { useEffect, useCallback, useState, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { listComplaints, ComplaintListItem, ComplaintStatus } from '../../services/complaints'
import { CATEGORY_LABEL, CATEGORY_ICON, STATUS_LABEL, STATUS_COLORS } from '../../utils/complaintMeta'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'ComplaintList'>

type StatusFilter = 'ALL' | ComplaintStatus

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

// Mixed data type for FlatList (complaints + section headers)
type ListItem =
  | { _kind: 'header'; id: string; title: string }
  | { _kind: 'empty_section'; id: string; message: string }
  | { _kind: 'complaint'; data: ComplaintListItem }

const PAGE_SIZE = 20

export function ComplaintListScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions } = useAuth()

  const isAdmin = permissions.includes('member.view')
  const canCreate = permissions.includes('complaint.create')

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [complaints, setComplaints] = useState<ComplaintListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])


  const load = useCallback(
    async (page: number, reset: boolean) => {
      try {
        if (reset) setIsLoading(true)
        else setIsLoadingMore(true)

        const params: Parameters<typeof listComplaints>[1] = { page, limit: PAGE_SIZE }
        if (statusFilter !== 'ALL') params.status = statusFilter

        const result = await listComplaints(societyId, params)
        if (!isMounted.current) return

        setComplaints((prev) => (reset ? result.complaints : [...prev, ...result.complaints]))
        setCurrentPage(page)
        setHasMore(page < result.pages)
      } catch {
        if (isMounted.current) {
          setToast({ message: 'Could not load complaints. Pull to retry.', type: 'error' })
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false)
          setIsRefreshing(false)
          setIsLoadingMore(false)
        }
      }
    },
    [societyId, statusFilter],
  )

  // Reload on focus (handles returning from RaiseComplaint / ComplaintDetail)
  // and whenever filter changes (load changes when statusFilter changes)
  useFocusEffect(
    useCallback(() => {
      load(1, true)
    }, [load]),
  )

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    load(1, true)
  }, [load])

  const onLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return
    load(currentPage + 1, false)
  }, [isLoadingMore, hasMore, currentPage, load])

  const listData = buildListData(complaints, isAdmin)

  const renderItem = ({ item }: { item: ListItem }) => {
    if (item._kind === 'header') {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      )
    }

    if (item._kind === 'empty_section') {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>{item.message}</Text>
        </View>
      )
    }

    const c = item.data
    return (
      <Pressable
        onPress={() =>
          navigation.navigate('ComplaintDetail', {
            societyId,
            complaintId: c.id,
            title: c.title,
          })
        }
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={styles.rowIcon}>
          <Text style={styles.rowIconText}>{CATEGORY_ICON[c.category] ?? '📋'}</Text>
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {c.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[c.status].bg }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[c.status].text }]}>
                {STATUS_LABEL[c.status]}
              </Text>
            </View>
          </View>
          <View style={styles.rowMeta}>
            <Text style={styles.rowMetaText}>{CATEGORY_LABEL[c.category] ?? c.category}</Text>
            {isAdmin && c.raisedBy ? (
              <Text style={styles.rowMetaText}>· {c.raisedBy}</Text>
            ) : null}
            <Text style={styles.rowMetaText}>· {formatDate(c.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    )
  }

  if (isLoading) return <LoadingSpinner fullScreen />

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
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
            onPress={() => setStatusFilter(f.value)}
            style={[styles.chip, statusFilter === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, statusFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Complaint list */}
      <FlatList
        data={listData}
        keyExtractor={(item) => (item._kind === 'complaint' ? item.data.id : item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyFull}>
            <Text style={styles.emptyTitle}>No complaints</Text>
            <Text style={styles.emptySub}>
              {statusFilter === 'ALL'
                ? 'Nothing here yet.'
                : `No ${statusFilter.toLowerCase()} complaints.`}
            </Text>
          </View>
        }
        ListFooterComponent={isLoadingMore ? <LoadingSpinner /> : null}
        contentContainerStyle={listData.length === 0 ? styles.emptyContainer : undefined}
        style={styles.list}
      />

      {/* FAB — raise complaint */}
      {canCreate ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('RaiseComplaint', { societyId })}
          style={styles.fab}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildListData(complaints: ComplaintListItem[], isAdmin: boolean): ListItem[] {
  if (isAdmin) {
    return complaints.map((c) => ({ _kind: 'complaint', data: c }))
  }

  const mine = complaints.filter((c) => c.raisedByMe)
  const publicOthers = complaints.filter((c) => !c.raisedByMe)

  return [
    { _kind: 'header', id: '__my_header', title: 'MY COMPLAINTS' },
    ...mine.map((c): ListItem => ({ _kind: 'complaint', data: c })),
    ...(mine.length === 0
      ? [{ _kind: 'empty_section' as const, id: '__my_empty', message: 'No complaints raised yet' }]
      : []),
    { _kind: 'header', id: '__pub_header', title: 'PUBLIC COMPLAINTS' },
    ...publicOthers.map((c): ListItem => ({ _kind: 'complaint', data: c })),
    ...(publicOthers.length === 0
      ? [{ _kind: 'empty_section' as const, id: '__pub_empty', message: 'No public complaints from others' }]
      : []),
  ]
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background },

  // Filter chips
  chipBar: {
    flexGrow: 0,   // don't expand to fill flex parent
    flexShrink: 0,
  },
  chips: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center', // keep chips at their intrinsic height, not stretched
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
  chipTextActive: {
    color: Colors.surface,
  },

  // List
  list: { flex: 1 },

  // Section header
  sectionHeader: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtle,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Empty section
  emptySection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  emptySectionText: { fontSize: 14, color: Colors.subtle },

  // Complaint row
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
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowIconText: { fontSize: 18 },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  rowMetaText: { fontSize: 12, color: Colors.subtle },
  chevron: { fontSize: 22, color: Colors.subtle, lineHeight: 26 },

  // Full empty state
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

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 36 : 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: Colors.surface,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: -2,
  },
})
