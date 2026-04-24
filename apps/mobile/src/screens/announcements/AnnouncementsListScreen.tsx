import React, { useCallback, useState } from 'react'
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
import { listAnnouncements, Announcement, AnnouncementCategory } from '../../services/announcements'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'
import { Ionicons } from '@expo/vector-icons'

type Props = NativeStackScreenProps<AppStackParamList, 'AnnouncementsList'>

type CategoryFilter = 'ALL' | AnnouncementCategory

const FILTERS: { label: string; value: CategoryFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'General', value: 'GENERAL' },
  { label: 'Maintenance', value: 'MAINTENANCE' },
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Emergency', value: 'EMERGENCY' },
  { label: 'Celebration', value: 'CELEBRATION' },
]

const CATEGORY_ICON: Record<
  AnnouncementCategory,
  keyof typeof Ionicons.glyphMap
  > = {
    GENERAL:     'megaphone-outline',
    MAINTENANCE: 'construct-outline',
    MEETING:     'people-outline',
    EMERGENCY:   'warning-outline',
    CELEBRATION: 'sparkles-outline',
  }

const CATEGORY_COLORS: Record<AnnouncementCategory, { bg: string; text: string; icon: string }> = {
  GENERAL:     { bg: '#f3f4f6', text: '#6b7280', icon: '#9ca3af' },
  MAINTENANCE: { bg: '#fff7ed', text: '#ea580c', icon: '#f97316' },
  MEETING:     { bg: '#eff6ff', text: '#2563eb', icon: '#3b82f6' },
  EMERGENCY:   { bg: '#fef2f2', text: '#dc2626', icon: '#ef4444' },
  CELEBRATION: { bg: '#faf5ff', text: '#9333ea', icon: '#a855f7' },
}

export function AnnouncementsListScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions } = useAuth()

  const canCreate = permissions.includes('announcement.create')

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(
    async (refreshing = false) => {
      try {
        if (!refreshing) setIsLoading(true)
        const category = categoryFilter === 'ALL' ? undefined : categoryFilter
        const data = await listAnnouncements(societyId, category)
        setAnnouncements(data)
      } catch {
        setToast({ message: 'Could not load announcements. Pull to retry.', type: 'error' })
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [societyId, categoryFilter],
  )

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const onRefresh = useCallback(() => {
    setIsRefreshing(true)
    load(true)
  }, [load])

  const renderItem = ({ item }: { item: Announcement }) => {
    const colors = CATEGORY_COLORS[item.category]
    return (
      <Pressable
        onPress={() => navigation.navigate('AnnouncementDetail', { societyId, announcementId: item.id })}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <View style={[styles.rowIcon, { backgroundColor: colors.bg }]}>
          <Ionicons
            name={CATEGORY_ICON[item.category]}
            size={20}
            color={colors.icon}
          />
        </View>
        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isPinned ? (
                <Ionicons
                  name="pin"
                  size={14}
                  color={Colors.subtle}
                />
              ) : null}
          </View>
          <Text style={styles.rowBody} numberOfLines={2}>
            {item.body}
          </Text>
          <View style={styles.rowMeta}>
            <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                {item.category.charAt(0) + item.category.slice(1).toLowerCase()}
              </Text>
            </View>
            <Text style={styles.rowMetaText}>· {item.createdBy.name}</Text>
            <Text style={styles.rowMetaText}>· {timeAgo(item.createdAt)}</Text>
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
            onPress={() => setCategoryFilter(f.value)}
            style={[styles.chip, categoryFilter === f.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, categoryFilter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Announcements list */}
      <FlatList
        data={announcements}
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
            <Text style={styles.emptyTitle}>No announcements yet</Text>
            <Text style={styles.emptySub}>
              {categoryFilter === 'ALL'
                ? 'Nothing posted yet.'
                : `No ${categoryFilter.toLowerCase()} announcements.`}
            </Text>
          </View>
        }
        contentContainerStyle={announcements.length === 0 ? styles.emptyContainer : undefined}
        style={styles.list}
      />

      {/* FAB — create announcement */}
      {canCreate ? (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateAnnouncement', { societyId })}
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background },

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
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.subtle },
  chipTextActive: { color: Colors.surface },

  list: { flex: 1 },

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
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  pinIcon: { fontSize: 13 },
  rowBody: { fontSize: 13, color: Colors.subtle, lineHeight: 18 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  rowMetaText: { fontSize: 12, color: Colors.subtle },
  chevron: { fontSize: 22, color: Colors.subtle, lineHeight: 26 },

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
