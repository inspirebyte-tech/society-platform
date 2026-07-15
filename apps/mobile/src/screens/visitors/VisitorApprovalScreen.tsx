import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { getEntry, approveEntry, rejectEntry, VisitorEntry } from '../../services/visitors'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'VisitorApproval'>

export function VisitorApprovalScreen({ route, navigation }: Props) {
  const { societyId, entryId } = route.params

  const [entry, setEntry] = useState<VisitorEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  const loadEntry = useCallback(async () => {
    try {
      const found = await getEntry(societyId, entryId)
      setEntry(found)
    } catch (e) {
      setToast({ message: 'Failed to load entry details', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [societyId, entryId])

  useFocusEffect(
    useCallback(() => {
      loadEntry()
    }, [loadEntry])
  )

  const handleApprove = async () => {
    if (!entry) return
    setIsProcessing(true)
    try {
      const updated = await approveEntry(societyId, entry.id)
      setEntry(updated)
      setToast({ message: 'Entry approved successfully.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
      setIsProcessing(false)
    }
  }

  const handleDeny = async () => {
    if (!entry) return
    setIsProcessing(true)
    try {
      const updated = await rejectEntry(societyId, entry.id)
      setEntry(updated)
      setToast({ message: 'Entry denied.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
      setIsProcessing(false)
    }
  }

  const formatElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime()
    const now = new Date().getTime()
    const diffMs = now - start
    if (diffMs < 60000) return 'Just now'
    return `${Math.floor(diffMs / 60000)} mins ago`
  }

  if (isLoading) {
    return (
      <ScreenWrapper style={styles.wrapper}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </ScreenWrapper>
    )
  }

  if (!entry) {
    return (
      <ScreenWrapper style={styles.wrapper}>
        <View style={styles.center}>
          <Ionicons name="warning" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Not Found</Text>
          <Text style={styles.emptySub}>The visitor entry could not be found.</Text>
          <Button label="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
        </View>
        {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
      </ScreenWrapper>
    )
  }

  const isProcessed = entry.status !== 'PENDING'

  return (
    <ScreenWrapper style={styles.wrapper}>
      <View style={styles.container}>
        
        <View style={styles.header}>
          <Text style={styles.urgentTitle}>Visitor at Gate</Text>
          <Text style={styles.waitingTime}>Waiting since {formatElapsedTime(entry.createdAt)}</Text>
        </View>

        <View style={styles.card}>
          {entry.visitorPhoto ? (
            <Image source={{ uri: entry.visitorPhoto }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={60} color={Colors.primary} />
            </View>
          )}

          <Text style={styles.visitorName}>{entry.visitorName}</Text>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>{entry.visitorType}</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>To Flat</Text>
              <Text style={styles.detailValue}>{entry.flatName}</Text>
            </View>
          </View>

          {entry.purpose && (
            <View style={styles.purposeBox}>
              <Text style={styles.detailLabel}>Purpose</Text>
              <Text style={styles.purposeText}>{entry.purpose}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {isProcessed ? (
            <View style={styles.processedBox}>
              <Ionicons
                name={entry.status === 'APPROVED' || entry.status === 'ALLOWED' ? 'checkmark-circle' : 'close-circle'}
                size={40}
                color={entry.status === 'APPROVED' || entry.status === 'ALLOWED' ? Colors.success : Colors.error}
              />
              <Text style={styles.processedText}>
                This request was already processed ({entry.status}).
              </Text>
              <Button label="Done" onPress={() => navigation.goBack()} style={{ width: '100%', marginTop: 20 }} />
            </View>
          ) : (
            <>
              <Button
                label="Deny Entry"
                variant="danger"
                onPress={handleDeny}
                loading={isProcessing}
                style={styles.actionBtn}
              />
              <Button
                label="Approve Entry"
                onPress={handleApprove}
                loading={isProcessing}
                style={styles.actionBtn}
              />
            </>
          )}
        </View>
      </View>

      {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.surface, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.screenPadding },
  container: { flex: 1, padding: Spacing.screenPadding },
  
  header: { alignItems: 'center', marginVertical: 30 },
  urgentTitle: { fontSize: 28, fontWeight: '800', color: Colors.text },
  waitingTime: { fontSize: 14, color: Colors.error, marginTop: 8, fontWeight: '600' },
  
  card: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  photo: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  visitorName: { fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  
  detailsRow: { flexDirection: 'row', marginTop: 24, width: '100%', gap: 16 },
  detailBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  detailLabel: { fontSize: 12, color: Colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 4 },
  
  purposeBox: { width: '100%', marginTop: 16, alignItems: 'center', padding: 12, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  purposeText: { fontSize: 16, color: Colors.text, marginTop: 4, textAlign: 'center' },
  
  actionsContainer: { marginTop: 'auto', gap: 16, paddingBottom: 20 },
  actionBtn: { width: '100%', height: 56 },
  
  processedBox: { alignItems: 'center', padding: 20 },
  processedText: { fontSize: 16, color: Colors.text, fontWeight: '500', marginTop: 12, textAlign: 'center' },
  
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center', marginTop: 8 },
})
