import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableWithoutFeedback,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Button } from '../../components/Button'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import {
  listUnits,
  assignOwnership,
  assignOccupancy,
  UnitListItem,
  OwnershipType,
  OccupancyType,
} from '../../services/units'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'AssignUnit'>

// ─── Picker options ───────────────────────────────────────────────────────────

type OwnershipOption = OwnershipType | 'NONE'
type OccupancyOption = OccupancyType | 'NONE'

const OWNERSHIP_OPTIONS: { label: string; value: OwnershipOption }[] = [
  { label: 'None (occupant only)', value: 'NONE' },
  { label: 'Primary Owner', value: 'PRIMARY_OWNER' },
  { label: 'Co-owner', value: 'CO_OWNER' },
]

const OCCUPANCY_OPTIONS: { label: string; value: OccupancyOption }[] = [
  { label: 'None (owner only)', value: 'NONE' },
  { label: 'Owner Resident', value: 'OWNER_RESIDENT' },
  { label: 'Tenant', value: 'TENANT' },
  { label: 'Family', value: 'FAMILY' },
  { label: 'Caretaker', value: 'CARETAKER' },
]

const OWNERSHIP_COLORS: Record<string, { bg: string; text: string }> = {
  PRIMARY_OWNER: { bg: '#ede9fe', text: Colors.primary },
  CO_OWNER: { bg: '#e0e7ff', text: '#6366f1' },
  NONE: { bg: Colors.border, text: Colors.subtle },
}

const OCCUPANCY_COLORS: Record<string, { bg: string; text: string }> = {
  OWNER_RESIDENT: { bg: '#dcfce7', text: Colors.success },
  TENANT: { bg: '#fef3c7', text: '#d97706' },
  FAMILY: { bg: '#e0f2fe', text: '#0284c7' },
  CARETAKER: { bg: '#fce7f3', text: '#be185d' },
  NONE: { bg: Colors.border, text: Colors.subtle },
}

export function AssignUnitScreen({ route, navigation }: Props) {
  const { societyId, memberId, memberName, prefillUnitId, prefillUnitName } = route.params
  const { permissions } = useAuth()

  const canAssign = permissions.includes('unit.assign')

  // Step 1 state
  const [allUnits, setAllUnits] = useState<UnitListItem[]>([])
  const [loadingUnits, setLoadingUnits] = useState(true)
  const [searchText, setSearchText] = useState('')

  // Step 2 state — selected flat + type choices
  const [selectedUnit, setSelectedUnit] = useState<UnitListItem | null>(null)
  const [ownershipType, setOwnershipType] = useState<OwnershipOption>('NONE')
  const [occupancyType, setOccupancyType] = useState<OccupancyOption>('NONE')
  const [isPrimaryOwner, setIsPrimaryOwner] = useState(false)
  const [isPrimaryOccupant, setIsPrimaryOccupant] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Picker sheet state
  const [activePicker, setActivePicker] = useState<'ownership' | 'occupancy' | null>(null)

  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Load all units for step 1
  const loadUnits = useCallback(async () => {
    try {
      const result = await listUnits(societyId)
      if (!isMounted.current) return
      setAllUnits(result.units)
    } catch {
      if (isMounted.current) {
        setToast({ message: 'Could not load units.', type: 'error' })
      }
    } finally {
      if (isMounted.current) setLoadingUnits(false)
    }
  }, [societyId])

  useEffect(() => {
    loadUnits()
  }, [loadUnits])

  // If prefill provided (coming from UnitDetailScreen), skip step 1
  useEffect(() => {
    if (prefillUnitId && prefillUnitName) {
      setSelectedUnit({
        id: prefillUnitId,
        name: prefillUnitName,
        code: null,
        path: null,
        metadata: null,
        isVacant: true,
        primaryOwner: null,
        primaryOccupant: null,
        occupancyType: null,
      })
    }
  }, [prefillUnitId, prefillUnitName])

  // Validate title when memberId supplied (from MemberDetail) or required prefill
  const effectiveMemberId = memberId
  const effectiveMemberName = memberName || 'Member'

  useEffect(() => {
    navigation.setOptions({
      title: `Assign Unit — ${effectiveMemberName}`,
    })
  }, [navigation, effectiveMemberName])

  const filteredUnits = allUnits.filter((u) =>
    u.name.toLowerCase().includes(searchText.toLowerCase()),
  )

  // ── Step 2: submit ────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!selectedUnit) return
    if (ownershipType === 'NONE' && occupancyType === 'NONE') {
      setToast({ message: 'Select at least one ownership or occupancy type.', type: 'error' })
      return
    }
    if (!effectiveMemberId) {
      setToast({ message: 'Member not specified.', type: 'error' })
      return
    }

    setSubmitting(true)
    let ownershipError: string | null = null
    let occupancyError: string | null = null

    try {
      if (ownershipType !== 'NONE') {
        try {
          await assignOwnership(societyId, selectedUnit.id, {
            userId: effectiveMemberId,
            ownershipType: ownershipType as OwnershipType,
            isPrimary: isPrimaryOwner,
          })
        } catch (e) {
          ownershipError = getErrorMessage(getApiErrorCode(e))
        }
      }

      if (occupancyType !== 'NONE') {
        try {
          await assignOccupancy(societyId, selectedUnit.id, {
            userId: effectiveMemberId,
            occupancyType: occupancyType as OccupancyType,
            isPrimary: isPrimaryOccupant,
          })
        } catch (e) {
          occupancyError = getErrorMessage(getApiErrorCode(e))
        }
      }

      if (ownershipError || occupancyError) {
        const msgs = [ownershipError, occupancyError].filter(Boolean)
        setToast({ message: msgs.join(' '), type: 'error' })
      } else {
        setToast({ message: `Unit assigned to ${effectiveMemberName}.`, type: 'success' })
        setTimeout(() => {
          if (isMounted.current) navigation.goBack()
        }, 1200)
      }
    } finally {
      if (isMounted.current) setSubmitting(false)
    }
  }

  if (!canAssign) {
    return (
      <ScreenWrapper>
        <View style={styles.emptyFull}>
          <Text style={styles.emptyTitle}>Access restricted</Text>
          <Text style={styles.emptySub}>You don't have permission to assign units.</Text>
        </View>
      </ScreenWrapper>
    )
  }

  // ── Step 1: pick a flat ───────────────────────────────────────────────────

  if (!selectedUnit) {
    return (
      <ScreenWrapper scroll={false} style={styles.wrapper}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search flat name..."
            placeholderTextColor={Colors.subtle}
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>

        {loadingUnits ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredUnits}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setSelectedUnit(item)}
                style={({ pressed }) => [styles.unitRow, pressed && styles.unitRowPressed]}
              >
                <View style={styles.unitRowContent}>
                  <Text style={styles.unitName}>{item.name}</Text>
                  {item.path ? (
                    <Text style={styles.unitPath} numberOfLines={1}>{item.path}</Text>
                  ) : null}
                  {item.primaryOccupant ? (
                    <Text style={styles.unitOccupant}>Occupant: {item.primaryOccupant}</Text>
                  ) : (
                    <Text style={styles.unitVacant}>Vacant</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyFull}>
                <Text style={styles.emptyTitle}>No units found</Text>
                <Text style={styles.emptySub}>Try a different search.</Text>
              </View>
            }
            contentContainerStyle={filteredUnits.length === 0 ? styles.emptyContainer : undefined}
          />
        )}

        {toast ? (
          <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} />
        ) : null}
      </ScreenWrapper>
    )
  }

  // ── Step 2: choose types ──────────────────────────────────────────────────

  const ownershipColorSet = OWNERSHIP_COLORS[ownershipType] ?? OWNERSHIP_COLORS.NONE
  const occupancyColorSet = OCCUPANCY_COLORS[occupancyType] ?? OCCUPANCY_COLORS.NONE
  const ownershipLabel = OWNERSHIP_OPTIONS.find((o) => o.value === ownershipType)?.label ?? ownershipType
  const occupancyLabel = OCCUPANCY_OPTIONS.find((o) => o.value === occupancyType)?.label ?? occupancyType

  const hasExistingPrimaryOwner = !!selectedUnit.primaryOwner
  const hasExistingPrimaryOccupant = !!selectedUnit.primaryOccupant

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.step2Content} showsVerticalScrollIndicator={false}>
        {/* Selected flat */}
        <View style={styles.selectedFlatCard}>
          <Text style={styles.selectedFlatLabel}>Selected flat</Text>
          <Text style={styles.selectedFlatName}>{selectedUnit.name}</Text>
          {selectedUnit.path ? (
            <Text style={styles.selectedFlatPath}>{selectedUnit.path}</Text>
          ) : null}
          {!prefillUnitId ? (
            <Pressable onPress={() => setSelectedUnit(null)} hitSlop={8}>
              <Text style={styles.changeFlat}>Change flat</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Member info */}
        {effectiveMemberName ? (
          <View style={styles.memberRow}>
            <Text style={styles.memberLabel}>Assigning to</Text>
            <Text style={styles.memberName}>{effectiveMemberName}</Text>
          </View>
        ) : null}

        {/* Ownership type picker */}
        <View style={styles.pickerSection}>
          <Text style={styles.pickerLabel}>Ownership type</Text>
          <Pressable
            onPress={() => setActivePicker('ownership')}
            style={styles.pickerButton}
          >
            <View style={[styles.pickerBadge, { backgroundColor: ownershipColorSet.bg }]}>
              <Text style={[styles.pickerBadgeText, { color: ownershipColorSet.text }]}>
                {ownershipLabel}
              </Text>
            </View>
            <Text style={styles.pickerChevron}>›</Text>
          </Pressable>

          {ownershipType !== 'NONE' && !hasExistingPrimaryOwner ? (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Set as primary owner</Text>
              <Switch
                value={isPrimaryOwner}
                onValueChange={setIsPrimaryOwner}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          ) : null}
        </View>

        {/* Occupancy type picker */}
        <View style={styles.pickerSection}>
          <Text style={styles.pickerLabel}>Occupancy type</Text>
          <Pressable
            onPress={() => setActivePicker('occupancy')}
            style={styles.pickerButton}
          >
            <View style={[styles.pickerBadge, { backgroundColor: occupancyColorSet.bg }]}>
              <Text style={[styles.pickerBadgeText, { color: occupancyColorSet.text }]}>
                {occupancyLabel}
              </Text>
            </View>
            <Text style={styles.pickerChevron}>›</Text>
          </Pressable>

          {occupancyType !== 'NONE' && !hasExistingPrimaryOccupant ? (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Set as primary occupant</Text>
              <Switch
                value={isPrimaryOccupant}
                onValueChange={setIsPrimaryOccupant}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>
          ) : null}
        </View>

        {/* Confirm */}
        <Button
          label="Confirm Assignment"
          onPress={handleConfirm}
          loading={submitting}
          style={styles.confirmBtn}
        />
      </ScrollView>

      {/* Picker bottom sheet */}
      {activePicker ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setActivePicker(null)}>
          <TouchableWithoutFeedback onPress={() => setActivePicker(null)}>
            <View style={pickerStyles.overlay} />
          </TouchableWithoutFeedback>
          <View style={pickerStyles.sheet}>
            <View style={pickerStyles.handle} />
            <Text style={pickerStyles.title}>
              {activePicker === 'ownership' ? 'Ownership type' : 'Occupancy type'}
            </Text>
            {(activePicker === 'ownership' ? OWNERSHIP_OPTIONS : OCCUPANCY_OPTIONS).map((opt) => {
              const isSelected =
                activePicker === 'ownership' ? ownershipType === opt.value : occupancyType === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    if (activePicker === 'ownership') {
                      setOwnershipType(opt.value as OwnershipOption)
                      if (opt.value === 'NONE') setIsPrimaryOwner(false)
                    } else {
                      setOccupancyType(opt.value as OccupancyOption)
                      if (opt.value === 'NONE') setIsPrimaryOccupant(false)
                    }
                    setActivePicker(null)
                  }}
                  style={[pickerStyles.option, isSelected && pickerStyles.optionSelected]}
                >
                  <Text style={[pickerStyles.optionText, isSelected && pickerStyles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected ? <Text style={pickerStyles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
              )
            })}
          </View>
        </Modal>
      ) : null}

      {toast ? (
        <Toast message={toast.message} type={toast.type} visible={!!toast} onHide={() => setToast(null)} />
      ) : null}
    </ScreenWrapper>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { backgroundColor: Colors.background },

  // Step 1
  searchBar: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitRow: {
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
  unitRowPressed: { backgroundColor: Colors.background },
  unitRowContent: { flex: 1, gap: 3 },
  unitName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  unitPath: { fontSize: 12, color: Colors.subtle },
  unitOccupant: { fontSize: 12, color: Colors.subtle },
  unitVacant: { fontSize: 12, color: '#d97706', fontWeight: '500' },
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

  // Step 2
  step2Content: {
    padding: Spacing.screenPadding,
    gap: Spacing.sectionGap,
    paddingBottom: 40,
  },
  selectedFlatCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedFlatLabel: { fontSize: 11, fontWeight: '700', color: Colors.subtle, textTransform: 'uppercase', letterSpacing: 0.6 },
  selectedFlatName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  selectedFlatPath: { fontSize: 13, color: Colors.subtle },
  changeFlat: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberLabel: { fontSize: 13, color: Colors.subtle },
  memberName: { fontSize: 15, fontWeight: '600', color: Colors.text },

  pickerSection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtle,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  pickerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
  },
  pickerBadgeText: { fontSize: 14, fontWeight: '600' },
  pickerChevron: { fontSize: 22, color: Colors.subtle, lineHeight: 26 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleLabel: { fontSize: 14, color: Colors.text, fontWeight: '500' },

  confirmBtn: { marginTop: 8 },
})

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: Spacing.minTapTarget,
  },
  optionSelected: { backgroundColor: '#ede9fe' },
  optionText: { fontSize: 15, color: Colors.text },
  optionTextSelected: { color: Colors.primary, fontWeight: '600' },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
})
