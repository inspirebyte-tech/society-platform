import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import {
  InboxNotification,
  getNotifications,
  markNotificationsRead,
} from '../../services/notificationInbox'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'
import { Ionicons } from '@expo/vector-icons'

type Props = NativeStackScreenProps<AppStackParamList, 'Notifications'>

// ─── Icon config per notification screen type ─────────────────────────────────

const SCREEN_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  VisitorApproval:   { icon: 'person-outline',    color: '#3b82f6', bg: '#eff6ff' },
  ActiveVisitors:    { icon: 'person-outline',    color: '#3b82f6', bg: '#eff6ff' },
  AnnouncementsList: { icon: 'megaphone-outline', color: '#9333ea', bg: '#faf5ff' },
  ComplaintDetail:   { icon: 'warning-outline',   color: '#f97316', bg: '#fff7ed' },
}
const DEFAULT_CONFIG = { icon: 'notifications-outline' as const, color: '#6b7280', bg: '#f3f4f6' }

// ─── Navigate based on notification screen field ──────────────────────────────

function navigateToScreen(
  item: InboxNotification,
  navigation: Props['navigation'],
  societyId: string,
) {
  const orgId = item.data?.orgId ?? societyId
  switch (item.screen) {
    case 'VisitorApproval':
      if (item.data?.entryId) {
        navigation.navigate('VisitorApproval', { societyId: orgId, entryId: item.data.entryId })
      }
      break
    case 'ActiveVisitors':
      navigation.navigate('ActiveVisitors', { societyId: orgId })
      break
    case 'AnnouncementsList':
      navigation.navigate('AnnouncementsList', { societyId: orgId })
      break
    case 'ComplaintDetail':
      if (item.data?.complaintId) {
        navigation.navigate('ComplaintDetail', {
          societyId: orgId,
          complaintId: item.data.complaintId,
          title: item.title,
        })
      }
      break
    default:
      break
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function NotificationsScreen({ route, navigation }: Props) {
  const { societyId } = route.params

  const [notifications, setNotifications] = useState<InboxNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const hasUnread = notifications.some(n => !n.isRead)

  // ─── Load first page ───────────────────────────────────────────────────────

  const loadInitial = useCallback(async (refreshing = false) => {
    try {
      if (!refreshing) setIsLoading(true)
      else setIsRefreshing(true)
      const result = await getNotifications()
      setNotifications(result.notifications)
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
    } catch {
      setToast({ message: 'Could not load notifications. Pull to retry.', type: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadInitial()
    }, [loadInitial]),
  )

  const onRefresh = useCallback(() => {
    loadInitial(true)
  }, [loadInitial])

  // ─── Load next page ────────────────────────────────────────────────────────

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return
    setIsLoadingMore(true)
    try {
      const result = await getNotifications(nextCursor)
      setNotifications(prev => [...prev, ...result.notifications])
      setHasMore(result.hasMore)
      setNextCursor(result.nextCursor)
    } catch {
      // fail silently on pagination
    } finally {
      setIsLoadingMore(false)
    }
  }, [hasMore, isLoadingMore, nextCursor])

  // ─── Auto-mark all read after 3s ──────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => {
      markNotificationsRead()
        .then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        })
        .catch(() => {})
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // ─── Mark all read button ─────────────────────────────────────────────────

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {
      setToast({ message: 'Failed to mark as read.', type: 'error' })
    }
  }, [])

  useEffect(() => {
    navigation.setOptions({
      headerRight: hasUnread ? () => (
        <TouchableOpacity onPress={handleMarkAllRead} hitSlop={12} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      ) : undefined,
    })
  }, [notifications, handleMarkAllRead, navigation])

  // ─── Tap handler ──────────────────────────────────────────────────────────

  const handleTap = useCallback((item: InboxNotification) => {
    setNotifications(prev =>
      prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
    )
    markNotificationsRead([item.id]).catch(() => {})
    navigateToScreen(item, navigation, societyId)
  }, [navigation, societyId])

  // ─── Render ───────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: InboxNotification }) => {
    const config = SCREEN_CONFIG[item.screen ?? ''] ?? DEFAULT_CONFIG
    return (
      <Pressable
        onPress={() => handleTap(item)}
        style={({ pressed }) => [
          styles.row,
          !item.isRead && styles.rowUnread,
          pressed && styles.rowPressed,
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={20} color={config.color} />
        </View>
        <View style={styles.rowContent}>
          <Text
            style={[styles.rowTitle, !item.isRead && styles.rowTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.rowBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </Pressable>
    )
  }

  if (isLoading) return <LoadingSpinner fullScreen />

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListFooterComponent={isLoadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyFull}>
            <Ionicons name="notifications-outline" size={48} color={Colors.border} />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
          </View>
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
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
  rowUnread: { backgroundColor: '#f8faff' },
  rowPressed: { backgroundColor: Colors.background },

  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  rowTitleUnread: { fontWeight: '700' },
  rowBody: {
    fontSize: 13,
    color: Colors.subtle,
    lineHeight: 18,
  },
  rowTime: {
    fontSize: 12,
    color: Colors.subtle,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    flexShrink: 0,
  },

  emptyContainer: { flexGrow: 1 },
  emptyFull: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.subtle,
  },

  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  markAllBtn: {
    marginRight: 4,
    padding: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
})
