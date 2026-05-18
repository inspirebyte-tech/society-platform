import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { getActiveVisitors, markExited, VisitorEntry } from '../../services/visitors'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'ActiveVisitors'>

export function ActiveVisitorsScreen({ route }: Props) {
  const { societyId } = route.params

  const [entries, setEntries] = useState<VisitorEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  const loadActiveVisitors = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) setIsRefreshing(true)
      const data = await getActiveVisitors(societyId)
      setEntries(data)
    } catch (e) {
      setToast({ message: 'Failed to load active visitors', type: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [societyId])

  // Initial load & auto-refresh every 30s while focused
  useFocusEffect(
    useCallback(() => {
      loadActiveVisitors()
      
      const interval = setInterval(() => {
        loadActiveVisitors()
      }, 30000)

      return () => clearInterval(interval)
    }, [loadActiveVisitors])
  )

  const handleMarkExit = async (entryId: string) => {
    setProcessingId(entryId)
    try {
      await markExited(societyId, entryId)
      setToast({ message: 'Visitor marked as exited', type: 'success' })
      // Remove from list
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setProcessingId(null)
    }
  }

  const formatElapsedTime = (enteredAtStr: string) => {
    const enteredAt = new Date(enteredAtStr).getTime()
    const now = new Date().getTime()
    const diffMs = now - enteredAt
    
    if (diffMs < 0) return 'Just now'
    
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    const remainingMins = diffMins % 60
    return `${diffHours}h ${remainingMins}m ago`
  }

  const renderItem = ({ item }: { item: VisitorEntry }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="person" size={20} color={Colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.visitorName}>{item.visitorName}</Text>
            <View style={styles.subInfoRow}>
              <Ionicons name="home-outline" size={12} color={Colors.subtle} />
              <Text style={styles.flatName}>{item.flatName}</Text>
              {item.purpose ? (
                <>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.purpose}>{item.purpose}</Text>
                </>
              ) : null}
            </View>
            {item.enteredAt ? (
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={Colors.success} />
                <Text style={styles.elapsedTime}>Entered {formatElapsedTime(item.enteredAt)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Button
            label="Mark Exit"
            onPress={() => handleMarkExit(item.id)}
            loading={processingId === item.id}
            style={styles.exitBtn}
          />
        </View>
      </View>
    )
  }

  return (
    <ScreenWrapper style={styles.wrapper} scroll={false}>
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
              onRefresh={() => loadActiveVisitors(true)}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No active visitors</Text>
              <Text style={styles.emptySub}>All logged visitors have exited.</Text>
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
  listContainer: { padding: Spacing.screenPadding, gap: Spacing.sectionGap, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContainer: { flex: 1 },
  visitorName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  subInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  flatName: { fontSize: 13, color: Colors.subtle, marginLeft: 4 },
  dot: { fontSize: 13, color: Colors.border, marginHorizontal: 6 },
  purpose: { fontSize: 13, color: Colors.subtle },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  elapsedTime: { fontSize: 12, color: Colors.success, marginLeft: 4, fontWeight: '500' },
  actionsContainer: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 },
  exitBtn: { width: '100%' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center' },
})
