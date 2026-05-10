import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { BottomSheetPicker } from '../../components/BottomSheetPicker'
import { AppStackParamList } from '../../navigation/AppNavigator'
import {
  searchVisitors,
  createVisitor,
  logEntry,
  allowEntry,
  turnAwayEntry,
  markEntered,
  markExited,
  getEntryLog,
  Visitor,
  PreApproval,
  VisitorEntry,
  VisitorType,
} from '../../services/visitors'
import { listUnits, UnitListItem } from '../../services/units'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'LogVisitor'>

const VISITOR_TYPES: { label: string; value: VisitorType; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Individual', value: 'INDIVIDUAL', icon: 'person-outline' },
  { label: 'Delivery', value: 'DELIVERY', icon: 'cube-outline' },
  { label: 'Service', value: 'SERVICE', icon: 'construct-outline' },
  { label: 'Domestic', value: 'DOMESTIC', icon: 'home-outline' },
  { label: 'Cab', value: 'CAB', icon: 'car-outline' },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-outline' },
]

export function LogVisitorScreen({ route, navigation }: Props) {
  const { societyId } = route.params

  // Step 1: Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [preApprovals, setPreApprovals] = useState<PreApproval[]>([])

  // Create Inline Form State
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createMobile, setCreateMobile] = useState('')
  const [createType, setCreateType] = useState<VisitorType>('INDIVIDUAL')
  const [isCreating, setIsCreating] = useState(false)

  // Step 2: Selected Visitor State
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [selectedPreApproval, setSelectedPreApproval] = useState<PreApproval | null>(null)
  
  // Step 2: Form State
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [purpose, setPurpose] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [notifyFrequent, setNotifyFrequent] = useState(false)
  const [isLogging, setIsLogging] = useState(false)

  // Step 3: Entry Status State
  const [currentEntry, setCurrentEntry] = useState<VisitorEntry | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // Load Units once
  useEffect(() => {
    listUnits(societyId)
      .then(res => setUnits(res.units.filter(u => !u.isVacant))) // Only show non-vacant units? Actually, allow all units just in case, but usually non-vacant.
      .catch(() => {})
  }, [societyId])

  // Debounced Search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setVisitors([])
      setPreApprovals([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const isNumeric = /^\d+$/.test(searchQuery.trim())
        const res = await searchVisitors(societyId, {
          [isNumeric ? 'mobile' : 'name']: searchQuery.trim(),
        })
        setVisitors(res.visitors)
        setPreApprovals(res.preApprovals)
      } catch (e) {
        setToast({ message: 'Search failed', type: 'error' })
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, societyId])

  // Poll for PENDING entry
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (currentEntry && currentEntry.status === 'PENDING') {
      setIsPolling(true)
      interval = setInterval(async () => {
        try {
          const filterUnitId = selectedPreApproval ? selectedPreApproval.unitId : selectedUnitId
          const log = await getEntryLog(societyId, filterUnitId ? { unitId: filterUnitId } : undefined)
          const updated = log.find(e => e.id === currentEntry.id)
          if (updated && updated.status !== 'PENDING') {
            setCurrentEntry(updated)
            setIsPolling(false)
          }
        } catch (e) {
          // Ignore polling errors
        }
      }, 3000)
    } else {
      setIsPolling(false)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentEntry, societyId])

  const handleCreateVisitor = async () => {
    if (!createName.trim()) {
      setToast({ message: 'Name is required', type: 'error' })
      return
    }

    setIsCreating(true)
    try {
      const v = await createVisitor(societyId, {
        name: createName.trim(),
        mobile: createMobile.trim() || undefined,
        type: createType,
      })
      setSelectedVisitor(v)
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setIsCreating(false)
    }
  }

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      setToast({ message: 'Camera permission required', type: 'error' })
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
    })

    if (!result.canceled && result.assets[0].base64) {
      setPhotoUri(result.assets[0].uri)
      setPhotoBase64(result.assets[0].base64)
    }
  }

  const handleLogEntry = async () => {
    if (!selectedVisitor) return

    if (!selectedPreApproval && !selectedUnitId) {
      setToast({ message: 'Please select a flat', type: 'error' })
      return
    }

    setIsLogging(true)
    try {
      const entry = await logEntry(societyId, selectedVisitor.id, {
        unitId: selectedPreApproval ? selectedPreApproval.unitId : selectedUnitId!,
        purpose: purpose.trim() || undefined,
        vehicleNo: vehicleNo.trim() || undefined,
        photoUrl: photoBase64 || undefined,
        preApprovalId: selectedPreApproval?.id,
      })

      // If frequent + no notify -> immediately allow
      if (selectedVisitor.isFrequent && !notifyFrequent && entry.status === 'PENDING') {
        const allowed = await allowEntry(societyId, entry.id)
        setCurrentEntry(allowed)
        await markEntered(societyId, allowed.id)
        setCurrentEntry({ ...allowed, status: 'ALLOWED', enteredAt: new Date().toISOString() }) // Optimistic
      } else if (entry.status === 'ALLOWED') {
        // Pre-approval goes straight to ALLOWED
        setCurrentEntry(entry)
      } else {
        setCurrentEntry(entry)
      }
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    } finally {
      setIsLogging(false)
    }
  }

  const handleAction = async (action: 'allow' | 'turnAway' | 'enter' | 'exit') => {
    if (!currentEntry) return
    try {
      if (action === 'allow') {
        const res = await allowEntry(societyId, currentEntry.id)
        setCurrentEntry(res)
      } else if (action === 'turnAway') {
        const res = await turnAwayEntry(societyId, currentEntry.id)
        setCurrentEntry(res)
      } else if (action === 'enter') {
        const res = await markEntered(societyId, currentEntry.id)
        setCurrentEntry({ ...currentEntry, enteredAt: res.enteredAt })
      } else if (action === 'exit') {
        const res = await markExited(societyId, currentEntry.id)
        setCurrentEntry({ ...currentEntry, status: 'EXITED', exitedAt: res.exitedAt })
      }
    } catch (e) {
      setToast({ message: getErrorMessage(getApiErrorCode(e)), type: 'error' })
    }
  }

  // Render Status View (Phase 3)
  if (currentEntry) {
    return (
      <ScreenWrapper style={styles.wrapper}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusHeader}>Entry Logged</Text>

          <View style={styles.statusCard}>
            <Text style={styles.statusVisitorName}>{currentEntry.visitorName}</Text>
            <Text style={styles.statusFlatName}>{currentEntry.flatName}</Text>

            {currentEntry.status === 'PENDING' && (
              <View style={styles.statusSection}>
                <View style={styles.pulseIndicator} />
                <Text style={styles.statusMessage}>Waiting for resident to respond...</Text>
                <View style={styles.statusActions}>
                  <Button label="Turn Away" variant="secondary" onPress={() => handleAction('turnAway')} style={styles.actionBtn} />
                  <Button label="Allow Anyway" onPress={() => handleAction('allow')} style={styles.actionBtn} />
                </View>
              </View>
            )}

            {currentEntry.status === 'APPROVED' && (
              <View style={styles.statusSection}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                <Text style={styles.statusMessageSuccess}>Approved by resident</Text>
                {!currentEntry.enteredAt ? (
                  <Button label="Mark Entered" onPress={() => handleAction('enter')} style={styles.fullBtn} />
                ) : (
                  <Button label="Mark Exited" onPress={() => handleAction('exit')} style={styles.fullBtn} />
                )}
              </View>
            )}

            {currentEntry.status === 'ALLOWED' && (
              <View style={styles.statusSection}>
                <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
                <Text style={styles.statusMessageSuccess}>Entry Allowed</Text>
                {!currentEntry.enteredAt ? (
                  <Button label="Mark Entered" onPress={() => handleAction('enter')} style={styles.fullBtn} />
                ) : (
                  <Button label="Mark Exited" onPress={() => handleAction('exit')} style={styles.fullBtn} />
                )}
              </View>
            )}

            {currentEntry.status === 'DENIED' && (
              <View style={styles.statusSection}>
                <Ionicons name="close-circle" size={48} color={Colors.error} />
                <Text style={styles.statusMessageError}>Denied by resident</Text>
                <Button label="Done" variant="secondary" onPress={() => navigation.goBack()} style={styles.fullBtn} />
              </View>
            )}

            {currentEntry.status === 'TURNED_AWAY' && (
              <View style={styles.statusSection}>
                <Ionicons name="arrow-undo" size={48} color={Colors.subtle} />
                <Text style={styles.statusMessageError}>Visitor Turned Away</Text>
                <Button label="Done" variant="secondary" onPress={() => navigation.goBack()} style={styles.fullBtn} />
              </View>
            )}

            {currentEntry.status === 'EXITED' && (
              <View style={styles.statusSection}>
                <Ionicons name="exit" size={48} color={Colors.subtle} />
                <Text style={styles.statusMessage}>Visitor has left the premises</Text>
                <Button label="Done" onPress={() => navigation.goBack()} style={styles.fullBtn} />
              </View>
            )}
          </View>
        </View>

        {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
      </ScreenWrapper>
    )
  }

  // Render Entry Form (Phase 2)
  if (selectedVisitor) {
    return (
      <ScreenWrapper style={styles.wrapper}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
            
            <View style={styles.visitorCard}>
              <View style={styles.visitorCardHeader}>
                <Ionicons name={VISITOR_TYPES.find(t => t.value === selectedVisitor.type)?.icon ?? 'person-outline'} size={24} color={Colors.primary} />
                <Text style={styles.visitorCardName}>{selectedVisitor.name}</Text>
              </View>
              {selectedVisitor.mobile ? <Text style={styles.visitorCardMobile}>{selectedVisitor.mobile}</Text> : null}
              {selectedVisitor.isFrequent && <Text style={styles.frequentBadge}>Frequent</Text>}
            </View>

            {/* Flat Picker */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Which Flat? *</Text>
              {selectedPreApproval ? (
                <View style={[styles.pickerTrigger, styles.pickerDisabled]}>
                  <Text style={styles.pickerText}>{selectedPreApproval.flatName}</Text>
                  <Ionicons name="lock-closed" size={16} color={Colors.subtle} />
                </View>
              ) : (
                <Pressable onPress={() => setShowUnitPicker(true)} style={styles.pickerTrigger}>
                  <Text style={[styles.pickerText, !selectedUnitId && styles.pickerPlaceholder]}>
                    {selectedUnitId ? units.find(u => u.id === selectedUnitId)?.name : 'Select a flat'}
                  </Text>
                  <Text style={styles.pickerChevron}>›</Text>
                </Pressable>
              )}
            </View>

            <TextInput
              label="Purpose (Optional)"
              placeholder="e.g. Fixing AC"
              value={purpose}
              onChangeText={setPurpose}
            />

            <TextInput
              label="Vehicle Number (Optional)"
              placeholder="e.g. MH12 AB 1234"
              value={vehicleNo}
              onChangeText={setVehicleNo}
              autoCapitalize="characters"
            />

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Photo (Optional)</Text>
              {photoUri ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <Pressable style={styles.removePhotoBtn} onPress={() => { setPhotoUri(null); setPhotoBase64(null) }}>
                    <Ionicons name="close" size={16} color={Colors.surface} />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.cameraBtn} onPress={handlePickPhoto}>
                  <Ionicons name="camera-outline" size={24} color={Colors.subtle} />
                  <Text style={styles.cameraBtnText}>Take Photo</Text>
                </Pressable>
              )}
            </View>

            {selectedVisitor.isFrequent && !selectedPreApproval && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleLabel}>Frequent Visitor</Text>
                  <Text style={styles.toggleSub}>Send approval request to resident anyway?</Text>
                </View>
                <Pressable
                  style={[styles.toggleSwitch, notifyFrequent && styles.toggleSwitchActive]}
                  onPress={() => setNotifyFrequent(!notifyFrequent)}
                >
                  <View style={[styles.toggleKnob, notifyFrequent && styles.toggleKnobActive]} />
                </Pressable>
              </View>
            )}

            <Button
              label="Log Entry"
              onPress={handleLogEntry}
              loading={isLogging}
              style={styles.submitBtn}
            />

          </ScrollView>
        </KeyboardAvoidingView>

        <BottomSheetPicker
          visible={showUnitPicker}
          title="Select Flat"
          options={units.map(u => ({ label: `${u.name} ${u.primaryOccupant ? `(${u.primaryOccupant})` : ''}`, value: u.id }))}
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

  // Render Search (Phase 1)
  return (
    <ScreenWrapper style={styles.wrapper}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={Colors.subtle} />
          <TextInput
            placeholder="Search by name or mobile"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            autoCorrect={false}
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>

        <ScrollView contentContainerStyle={styles.resultsContainer} keyboardShouldPersistTaps="handled">
          
          {preApprovals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>PRE-APPROVALS</Text>
              {preApprovals.map(p => (
                <Pressable
                  key={p.id}
                  style={styles.resultCard}
                  onPress={() => {
                    setSelectedPreApproval(p)
                    setSelectedVisitor({
                      id: 'new', // will be ignored by API or we must create first?
                      // Wait, logEntry requires a visitor ID! If we select a pre-approval, the visitor might not exist yet if they haven't visited.
                      // Actually, if we pass preApprovalId, the backend uses the visitor details or expects us to create one?
                      // Wait! In the API, pre-approval entry needs a `visitorId`.
                      // So Gatekeeper MUST select or create a visitor FIRST, or if preApproval has it...
                      // Wait, pre-approvals in search are just matches. If they tap a pre-approval, we should go to "Create New Visitor" pre-filled with pre-approval details, then log entry?
                      // Or just use a dummy visitor ID if backend handles it? 
                      // Let's create the visitor on the fly or prompt. Let's set the form to create state pre-filled.
                      name: p.visitorName,
                      type: 'INDIVIDUAL',
                      isFrequent: false,
                    })
                    // Hack: We need to ensure the visitor exists. If we tap pre-approval, let's open the create form prefilled.
                    setCreateName(p.visitorName)
                    if (p.visitorMobile) setCreateMobile(p.visitorMobile)
                    setShowCreate(true)
                  }}
                >
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{p.visitorName}</Text>
                    <Text style={styles.resultSub}>Pre-approved for {p.flatName}</Text>
                    {p.note ? <Text style={styles.resultNote}>"{p.note}"</Text> : null}
                  </View>
                  <View style={styles.badgeGreen}>
                    <Text style={styles.badgeGreenText}>PRE-APPROVED</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {visitors.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EXISTING VISITORS</Text>
              {visitors.map(v => (
                <Pressable
                  key={v.id}
                  style={styles.resultCard}
                  onPress={() => setSelectedVisitor(v)}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons name={VISITOR_TYPES.find(t => t.value === v.type)?.icon ?? 'person'} size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{v.name}</Text>
                    {v.mobile ? <Text style={styles.resultSub}>{v.mobile}</Text> : null}
                  </View>
                  {v.isFrequent && (
                    <View style={styles.badgeGreen}>
                      <Text style={styles.badgeGreenText}>FREQUENT</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {!showCreate && (
            <Button
              label="Create New Visitor"
              onPress={() => setShowCreate(true)}
              variant="outline"
              style={styles.createNewBtn}
            />
          )}

          {showCreate && (
            <View style={styles.createForm}>
              <Text style={styles.formTitle}>New Visitor Details</Text>
              <TextInput label="Name" value={createName} onChangeText={setCreateName} />
              <TextInput label="Mobile (Optional)" value={createMobile} onChangeText={setCreateMobile} keyboardType="phone-pad" />
              
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeChips}>
                {VISITOR_TYPES.map(t => (
                  <Pressable
                    key={t.value}
                    style={[styles.typeChip, createType === t.value && styles.typeChipActive]}
                    onPress={() => setCreateType(t.value)}
                  >
                    <Ionicons name={t.icon} size={16} color={createType === t.value ? Colors.surface : Colors.subtle} />
                    <Text style={[styles.typeChipText, createType === t.value && styles.typeChipTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Button
                label={selectedPreApproval ? "Continue with Pre-Approval" : "Continue"}
                onPress={handleCreateVisitor}
                loading={isCreating}
                style={styles.submitCreateBtn}
              />
            </View>
          )}
        </ScrollView>
      </View>

      {toast ? <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} /> : null}
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrapper: { backgroundColor: Colors.background, flex: 1 },
  
  // Phase 1 Search
  searchContainer: { flex: 1 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.screenPadding,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 10,
    fontSize: 16,
    color: Colors.text,
  },
  resultsContainer: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: 40,
    gap: 20,
  },
  section: { gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: Colors.subtle, letterSpacing: 0.5 },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  resultSub: { fontSize: 13, color: Colors.subtle, marginTop: 2 },
  resultNote: { fontSize: 13, color: Colors.subtle, marginTop: 4, fontStyle: 'italic' },
  badgeGreen: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeGreenText: { color: Colors.success, fontSize: 10, fontWeight: '700' },
  createNewBtn: { marginTop: 10 },

  // Create Form
  createForm: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  formTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 6,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 13, fontWeight: '500', color: Colors.subtle },
  typeChipTextActive: { color: Colors.surface },
  submitCreateBtn: { marginTop: 10 },

  // Phase 2 Form
  formContainer: {
    padding: Spacing.screenPadding,
    gap: Spacing.sectionGap,
    paddingBottom: 40,
  },
  visitorCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  visitorCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  visitorCardName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  visitorCardMobile: { fontSize: 14, color: Colors.subtle },
  frequentBadge: {
    marginTop: 8,
    backgroundColor: '#dcfce7',
    color: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    overflow: 'hidden',
  },

  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
  },
  pickerDisabled: { backgroundColor: Colors.background, opacity: 0.7 },
  pickerText: { flex: 1, fontSize: 16, color: Colors.text },
  pickerPlaceholder: { color: Colors.subtle },
  pickerChevron: { fontSize: 20, color: Colors.subtle },

  cameraBtn: {
    height: 100,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: 8,
  },
  cameraBtnText: { fontSize: 14, color: Colors.subtle, fontWeight: '500' },
  photoContainer: { position: 'relative', width: 100, height: 100 },
  photoPreview: { width: 100, height: 100, borderRadius: 10 },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleTextCol: { flex: 1, paddingRight: 10 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSub: { fontSize: 12, color: Colors.subtle, marginTop: 2 },
  toggleSwitch: { width: 50, height: 30, borderRadius: 15, backgroundColor: Colors.border, justifyContent: 'center', padding: 2 },
  toggleSwitchActive: { backgroundColor: Colors.primary },
  toggleKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  toggleKnobActive: { transform: [{ translateX: 20 }] },

  submitBtn: { marginTop: 10 },

  // Phase 3 Status
  statusContainer: { flex: 1, padding: Spacing.screenPadding, justifyContent: 'center' },
  statusHeader: { fontSize: 24, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 20 },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  statusVisitorName: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  statusFlatName: { fontSize: 16, color: Colors.subtle, textAlign: 'center', marginTop: 4 },
  statusSection: { alignItems: 'center', marginTop: 30, width: '100%' },
  pulseIndicator: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fcd34d', opacity: 0.5 }, // Simplified pulse
  statusMessage: { fontSize: 16, color: Colors.text, textAlign: 'center', marginTop: 20, marginBottom: 30 },
  statusMessageSuccess: { fontSize: 18, fontWeight: '600', color: Colors.success, textAlign: 'center', marginTop: 16, marginBottom: 30 },
  statusMessageError: { fontSize: 18, fontWeight: '600', color: Colors.error, textAlign: 'center', marginTop: 16, marginBottom: 30 },
  statusActions: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1 },
  fullBtn: { width: '100%' },
})
