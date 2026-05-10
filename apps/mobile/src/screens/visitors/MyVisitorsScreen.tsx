import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { Toast } from '../../components/Toast'
import { BottomSheetPicker } from '../../components/BottomSheetPicker'
import { AppStackParamList } from '../../navigation/AppNavigator'
import {
  getPreApprovals,
  getFrequentVisitors,
  getEntryLog,
  deletePreApproval,
  removeFrequent,
  createPreApproval,
  PreApproval,
  Visitor,
  VisitorEntry,
} from '../../services/visitors'
import { listUnits, UnitListItem } from '../../services/units'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'MyVisitors'>
type TabType = 'PRE_APPROVALS' | 'FREQUENT' | 'RECENT'

export function MyVisitorsScreen({ route }: Props) {
  const { societyId } = route.params

  const [activeTab, setActiveTab] = useState<TabType>('PRE_APPROVALS')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  // Data
  const [preApprovals, setPreApprovals] = useState<PreApproval[]>([])
  const [frequentVisitors, setFrequentVisitors] = useState<Visitor[]>([])
  const [recentVisits, setRecentVisits] = useState<VisitorEntry[]>([])
  const [units, setUnits] = useState<UnitListItem[]>([])

  // Pre-approval Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formMobile, setFormMobile] = useState('')
  const [formNote, setFormNote] = useState('')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load Units once for the form
  useEffect(() => {
    listUnits(societyId)
      .then(res => setUnits(res.units))
      .catch(() => {})
  }, [societyId])

  const loadData = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      if (activeTab === 'PRE_APPROVALS') {
        const data = await getPreApprovals(societyId)
        setPreApprovals(data)
      } else if (activeTab === 'FREQUENT') {
        const data = await getFrequentVisitors(societyId)
        setFrequentVisitors(data)
      } else if (activeTab === 'RECENT') {
        const data = await getEntryLog(societyId) // Backend automatically scopes to my units
        setRecentVisits(data)
      }
    } catch (e) {
      setToast({ message: 'Failed to load data', type: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [societyId, activeTab])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeletePreApproval = async (id: string) => {
    try {
      await deletePreApproval(societyId, id)
      setPreApprovals(prev => prev.filter(p => p.id !== id))
      setToast({ message: 'Pre-approval removed', type: 'success' })
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    }
  }

  const handleRemoveFrequent = async (id: string) => {
    try {
      await removeFrequent(societyId, id)
      setFrequentVisitors(prev => prev.filter(v => v.id !== id))
      setToast({ message: 'Frequent visitor removed', type: 'success' })
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    }
  }

  const handleCreatePreApproval = async () => {
    if (!formName.trim() || !selectedUnitId) {
      setToast({ message: 'Name and Flat are required', type: 'error' })
      return
    }
    setIsSubmitting(true)
    try {
      const res = await createPreApproval(societyId, {
        visitorName: formName.trim(),
        visitorMobile: formMobile.trim() || undefined,
        note: formNote.trim() || undefined,
        unitId: selectedUnitId,
      })
      // The API returns basic fields, so we augment for UI
      const newPre: PreApproval = {
        ...res,
        flatName: units.find(u => u.id === selectedUnitId)?.name || 'My Flat',
        isUsed: false,
        createdAt: new Date().toISOString(),
      }
      setPreApprovals([newPre, ...preApprovals])
      setShowAddForm(false)
      setFormName('')
      setFormMobile('')
      setFormNote('')
      setToast({ message: 'Pre-approval created', type: 'success' })
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {(['PRE_APPROVALS', 'FREQUENT', 'RECENT'] as TabType[]).map(tab => {
        const isActive = activeTab === tab
        const labels: Record<TabType, string> = {
          PRE_APPROVALS: 'Pre-Approvals',
          FREQUENT: 'Frequent',
          RECENT: 'Recent',
        }
        return (
          <Pressable
            key={tab}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab(tab)
              setShowAddForm(false)
            }}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {labels[tab]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )

  const renderPreApprovalItem = ({ item }: { item: PreApproval }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.infoContainer}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={styles.subInfoRow}>
            <Text style={styles.flatName}>{item.flatName}</Text>
            {item.visitorMobile && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.mobileText}>{item.visitorMobile}</Text>
              </>
            )}
          </View>
          {item.note && <Text style={styles.noteText}>"{item.note}"</Text>}
        </View>
        <View style={[styles.badge, item.isUsed ? styles.badgeUsed : styles.badgeUnused]}>
          <Text style={[styles.badgeText, item.isUsed ? styles.badgeTextUsed : styles.badgeTextUnused]}>
            {item.isUsed ? 'USED' : 'UNUSED'}
          </Text>
        </View>
      </View>
      {!item.isUsed && (
        <View style={styles.cardActions}>
          <Pressable style={styles.deleteBtn} onPress={() => handleDeletePreApproval(item.id)}>
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={styles.deleteBtnText}>Cancel</Text>
          </Pressable>
        </View>
      )}
    </View>
  )

  const renderFrequentItem = ({ item }: { item: Visitor }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={20} color="#f59e0b" />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.visitorName}>{item.name}</Text>
          <View style={styles.subInfoRow}>
            <Text style={styles.visitorType}>{item.type}</Text>
            {item.frequentFlatName && (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.flatName}>{item.frequentFlatName}</Text>
              </>
            )}
          </View>
          {item.mobile && <Text style={styles.noteText}>{item.mobile}</Text>}
        </View>
      </View>
      <View style={styles.cardActions}>
        <Pressable style={styles.deleteBtn} onPress={() => handleRemoveFrequent(item.id)}>
          <Ionicons name="person-remove-outline" size={16} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Remove from Frequent</Text>
        </Pressable>
      </View>
    </View>
  )

  const renderRecentItem = ({ item }: { item: VisitorEntry }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.infoContainer}>
          <Text style={styles.visitorName}>{item.visitorName}</Text>
          <View style={styles.subInfoRow}>
            <Text style={styles.visitorType}>{item.visitorType}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.flatName}>{item.flatName}</Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: Colors.border }]}>
          <Text style={[styles.badgeText, { color: Colors.text }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  )

  return (
    <ScreenWrapper style={styles.wrapper} scroll={false}>
      {renderTabs()}

      {showAddForm && activeTab === 'PRE_APPROVALS' ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContainer}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>New Pre-Approval</Text>
              <Pressable onPress={() => setShowAddForm(false)}>
                <Ionicons name="close" size={24} color={Colors.subtle} />
              </Pressable>
            </View>

            <TextInput label="Visitor Name *" value={formName} onChangeText={setFormName} />
            <TextInput label="Mobile Number" value={formMobile} onChangeText={setFormMobile} keyboardType="phone-pad" />
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>For Flat *</Text>
              <Pressable onPress={() => setShowUnitPicker(true)} style={styles.pickerTrigger}>
                <Text style={[styles.pickerText, !selectedUnitId && styles.pickerPlaceholder]}>
                  {selectedUnitId ? units.find(u => u.id === selectedUnitId)?.name : 'Select a flat'}
                </Text>
                <Text style={styles.pickerChevron}>›</Text>
              </Pressable>
            </View>

            <TextInput label="Note for Gatekeeper (Optional)" value={formNote} onChangeText={setFormNote} placeholder="e.g. Amazon delivery" />

            <Button label="Create Pre-Approval" onPress={handleCreatePreApproval} loading={isSubmitting} style={styles.submitBtn} />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={activeTab === 'PRE_APPROVALS' ? preApprovals : activeTab === 'FREQUENT' ? frequentVisitors : recentVisits}
              keyExtractor={(item: any) => item.id}
              renderItem={
                activeTab === 'PRE_APPROVALS' ? renderPreApprovalItem as any
                : activeTab === 'FREQUENT' ? renderFrequentItem as any
                : renderRecentItem as any
              }
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} colors={[Colors.primary]} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={64} color={Colors.border} />
                  <Text style={styles.emptyTitle}>Nothing to show</Text>
                  <Text style={styles.emptySub}>No data found for this section.</Text>
                </View>
              }
            />
          )}

          {activeTab === 'PRE_APPROVALS' && !showAddForm && (
            <View style={styles.fabContainer}>
              <Button label="Add Pre-Approval" onPress={() => setShowAddForm(true)} />
            </View>
          )}
        </>
      )}

      <BottomSheetPicker
        visible={showUnitPicker}
        title="Select Flat"
        options={units.map(u => ({ label: u.name, value: u.id }))}
        selected={selectedUnitId}
        onSelect={(val) => {
          setSelectedUnitId(val as string)
          setShowUnitPicker(false)
        }}
        onClose={() => setShowUnitPicker(false)}
      />

      {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { backgroundColor: Colors.background, flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.subtle, textTransform: 'uppercase', letterSpacing: 0.5 },
  tabTextActive: { color: Colors.primary },

  listContainer: { padding: Spacing.screenPadding, gap: 16, paddingBottom: 100 },
  card: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  infoContainer: { flex: 1, paddingRight: 12 },
  visitorName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  subInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  visitorType: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  flatName: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  mobileText: { fontSize: 13, color: Colors.subtle },
  dot: { fontSize: 12, color: Colors.border, marginHorizontal: 6 },
  noteText: { fontSize: 13, color: Colors.subtle, marginTop: 4, fontStyle: 'italic' },
  dateText: { fontSize: 12, color: Colors.subtle, marginTop: 4 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeUnused: { backgroundColor: '#dcfce7' },
  badgeUsed: { backgroundColor: Colors.border },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextUnused: { color: Colors.success },
  badgeTextUsed: { color: Colors.subtle },

  cardActions: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', justifyContent: 'flex-end' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteBtnText: { fontSize: 13, color: Colors.error, fontWeight: '500' },

  fabContainer: { position: 'absolute', bottom: Spacing.screenPadding, left: Spacing.screenPadding, right: Spacing.screenPadding },

  formContainer: { padding: Spacing.screenPadding, gap: Spacing.sectionGap, paddingBottom: 40 },
  formHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  formTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: Colors.surface },
  pickerText: { flex: 1, fontSize: 16, color: Colors.text },
  pickerPlaceholder: { color: Colors.subtle },
  pickerChevron: { fontSize: 20, color: Colors.subtle },
  submitBtn: { marginTop: 10 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.subtle, textAlign: 'center' },
})
