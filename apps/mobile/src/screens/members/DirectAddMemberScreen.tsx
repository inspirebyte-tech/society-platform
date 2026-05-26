import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { BottomSheetPicker, PickerOption } from '../../components/BottomSheetPicker'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { directAddMember, reactivateMember } from '../../services/members'
import { listUnits, UnitListItem } from '../../services/units'
import { getApiErrorCode, getApiErrorDetails } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { formatPhoneDisplay, normalizePhone, isValidIndianPhone } from '../../utils/validators'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'DirectAddMember'>

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_OPTIONS_BUILDER: PickerOption[] = [
  { label: 'Admin',       value: 'Admin' },
  { label: 'Resident',    value: 'Resident' },
  { label: 'Co-resident', value: 'Co-resident' },
  { label: 'Gatekeeper',  value: 'Gatekeeper' },
]

const ROLE_OPTIONS_ADMIN: PickerOption[] = [
  { label: 'Resident',    value: 'Resident' },
  { label: 'Co-resident', value: 'Co-resident' },
  { label: 'Gatekeeper',  value: 'Gatekeeper' },
]

const OCCUPANCY_TYPE_OPTIONS: PickerOption[] = [
  { label: 'Owner Resident', value: 'OWNER_RESIDENT' },
  { label: 'Tenant',         value: 'TENANT' },
  { label: 'Family Member',  value: 'FAMILY' },
  { label: 'Caretaker',      value: 'CARETAKER' },
]

// ─── Screen ───────────────────────────────────────────────────────────────────

export function DirectAddMemberScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { memberships, permissions } = useAuth()

  const currentMembership = memberships.find((m) => m.org.id === societyId)
  const callerRole = currentMembership?.role ?? null
  const isBuilder = callerRole === 'Builder'
  const roleOptions = isBuilder ? ROLE_OPTIONS_BUILDER : ROLE_OPTIONS_ADMIN

  // ── Form state ──
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedOccupancyType, setSelectedOccupancyType] = useState<string | null>(null)

  // ── Picker visibility ──
  const [showRolePicker, setShowRolePicker] = useState(false)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [showOccupancyPicker, setShowOccupancyPicker] = useState(false)

  // ── Units ──
  const [units, setUnits] = useState<UnitListItem[]>([])
  const [unitsLoading, setUnitsLoading] = useState(true)

  // ── Submission ──
  const [isSaving, setIsSaving] = useState(false)

  // ── Reactivation sheet ──
  const [showReactivateSheet, setShowReactivateSheet] = useState(false)
  const [inactiveMemberId, setInactiveMemberId] = useState<string | null>(null)
  const [reactivateLoading, setReactivateLoading] = useState(false)

  // ── Field errors ──
  const [phoneError, setPhoneError] = useState('')
  const [nameError, setNameError] = useState('')
  const [roleError, setRoleError] = useState('')
  const [occupancyError, setOccupancyError] = useState('')

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  // ── Load units on mount ───────────────────────────────────────────────────

  useEffect(() => {
    listUnits(societyId)
      .then((data) => setUnits(data.units))
      .catch(() => {}) // non-blocking — unit picker just stays empty
      .finally(() => setUnitsLoading(false))
  }, [societyId])

  // ── Unit picker options ───────────────────────────────────────────────────

  const unitPickerOptions: PickerOption[] = [
    { label: 'No unit assigned', value: '' },
    ...units.map((u) => ({
      label: `${u.name}${u.primaryOccupant ? ' (Occupied)' : ' (Vacant)'}`,
      value: u.id,
    })),
  ]

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handlePhoneChange(text: string) {
    setPhone(formatPhoneDisplay(text))
    setPhoneError('')
  }

  function handleUnitSelect(value: string) {
    setSelectedUnitId(value || null)
    setSelectedOccupancyType(null)
    setOccupancyError('')
  }

  async function handleSubmit() {
    let valid = true

    const rawPhone = normalizePhone(phone)
    if (!isValidIndianPhone(rawPhone)) {
      setPhoneError('Enter a valid 10-digit mobile number starting with 6–9.')
      valid = false
    }
    if (!name.trim() || name.trim().length < 2) {
      setNameError('Name must be at least 2 characters.')
      valid = false
    }
    if (!selectedRole) {
      setRoleError('Please select a role.')
      valid = false
    }
    if (selectedUnitId && !selectedOccupancyType) {
      setOccupancyError('Please select an occupancy type.')
      valid = false
    }
    if (!valid) return

    setIsSaving(true)
    try {
      await directAddMember(societyId, {
        phone: `+91${rawPhone}`,
        name: name.trim(),
        role: selectedRole!,
        ...(selectedUnitId ? { unitId: selectedUnitId } : {}),
        ...(selectedOccupancyType ? { occupancyType: selectedOccupancyType } : {}),
      })
      setToast({ message: 'Member added successfully.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      const code = getApiErrorCode(e)
      const details = getApiErrorDetails(e)

      if (code === 'already_member') {
        setToast({ message: 'This person is already a member of the society.', type: 'error' })
      } else if (code === 'inactive_member') {
        setInactiveMemberId((details as any)?.memberId ?? null)
        setShowReactivateSheet(true)
      } else if (code === 'invalid_phone') {
        setPhoneError('Invalid phone number.')
      } else if (code === 'invalid_name') {
        setNameError('Name must be at least 2 characters.')
      } else if (code === 'role_not_allowed') {
        setRoleError('You cannot assign this role.')
      } else {
        setToast({ message: getErrorMessage(code), type: 'error' })
      }
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReactivateConfirm() {
    if (!inactiveMemberId) return
    setReactivateLoading(true)
    try {
      await reactivateMember(societyId, inactiveMemberId)
      setShowReactivateSheet(false)
      setToast({ message: 'Member access restored.', type: 'success' })
      setTimeout(() => navigation.goBack(), 1500)
    } catch (e) {
      const code = getApiErrorCode(e)
      setShowReactivateSheet(false)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setReactivateLoading(false)
    }
  }

  // ── Picker label helpers ──────────────────────────────────────────────────

  const roleLabelMap = Object.fromEntries(roleOptions.map((o) => [o.value, o.label]))
  const occupancyLabelMap = Object.fromEntries(OCCUPANCY_TYPE_OPTIONS.map((o) => [o.value, o.label]))
  const unitLabelMap = Object.fromEntries(unitPickerOptions.map((o) => [o.value, o.label]))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Member Details ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Details</Text>

          <TextInput
            label="Mobile Number"
            value={phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={11}
            placeholder="98765 43210"
            error={phoneError}
            helper="Must be a 10-digit Indian mobile number"
          />

          <TextInput
            label="Full Name"
            value={name}
            onChangeText={(t) => { setName(t); setNameError('') }}
            placeholder="Member's full name"
            error={nameError}
            maxLength={80}
          />
        </View>

        {/* ── Role ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Role</Text>
          <View style={styles.field}>
            <Pressable
              onPress={() => { setShowRolePicker(true); setRoleError('') }}
              style={({ pressed }) => [
                styles.pickerTrigger,
                selectedRole ? styles.pickerTriggerFilled : null,
                roleError ? styles.pickerTriggerError : null,
                pressed && styles.pickerTriggerPressed,
              ]}
            >
              <Text style={[styles.pickerText, !selectedRole && styles.pickerPlaceholder]}>
                {selectedRole ? roleLabelMap[selectedRole] : 'Select role'}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
            {roleError ? <Text style={styles.fieldError}>{roleError}</Text> : null}
          </View>
        </View>

        {/* ── Unit Assignment (optional) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Unit Assignment <Text style={styles.optional}>(optional)</Text></Text>

          <View style={styles.field}>
            <Pressable
              onPress={() => setShowUnitPicker(true)}
              style={({ pressed }) => [
                styles.pickerTrigger,
                selectedUnitId ? styles.pickerTriggerFilled : null,
                pressed && styles.pickerTriggerPressed,
              ]}
              disabled={unitsLoading}
            >
              <Text style={[styles.pickerText, !selectedUnitId && styles.pickerPlaceholder]}>
                {unitsLoading
                  ? 'Loading units…'
                  : selectedUnitId
                    ? unitLabelMap[selectedUnitId]
                    : 'No unit assigned'}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </Pressable>
          </View>

          {selectedUnitId ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Occupancy Type</Text>
              <Pressable
                onPress={() => { setShowOccupancyPicker(true); setOccupancyError('') }}
                style={({ pressed }) => [
                  styles.pickerTrigger,
                  selectedOccupancyType ? styles.pickerTriggerFilled : null,
                  occupancyError ? styles.pickerTriggerError : null,
                  pressed && styles.pickerTriggerPressed,
                ]}
              >
                <Text style={[styles.pickerText, !selectedOccupancyType && styles.pickerPlaceholder]}>
                  {selectedOccupancyType ? occupancyLabelMap[selectedOccupancyType] : 'Select type'}
                </Text>
                <Text style={styles.chevron}>⌄</Text>
              </Pressable>
              {occupancyError ? <Text style={styles.fieldError}>{occupancyError}</Text> : null}
            </View>
          ) : null}
        </View>

        <Button
          label="Add Member"
          onPress={handleSubmit}
          loading={isSaving}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* Pickers */}
      <BottomSheetPicker
        visible={showRolePicker}
        title="Select Role"
        options={roleOptions}
        selected={selectedRole}
        onSelect={(v) => { setSelectedRole(v); setRoleError('') }}
        onClose={() => setShowRolePicker(false)}
      />

      <BottomSheetPicker
        visible={showUnitPicker}
        title="Select Unit"
        options={unitPickerOptions}
        selected={selectedUnitId ?? ''}
        onSelect={handleUnitSelect}
        onClose={() => setShowUnitPicker(false)}
      />

      <BottomSheetPicker
        visible={showOccupancyPicker}
        title="Occupancy Type"
        options={OCCUPANCY_TYPE_OPTIONS}
        selected={selectedOccupancyType}
        onSelect={(v) => { setSelectedOccupancyType(v); setOccupancyError('') }}
        onClose={() => setShowOccupancyPicker(false)}
      />

      {/* Reactivation sheet */}
      <ConfirmSheet
        visible={showReactivateSheet}
        title="Previously a Member"
        message="This person was previously a member of this society. Would you like to reactivate their access?"
        confirmLabel="Reactivate"
        loading={reactivateLoading}
        onConfirm={handleReactivateConfirm}
        onClose={() => setShowReactivateSheet(false)}
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
  content: {
    padding: Spacing.screenPadding,
    gap: Spacing.sectionGap,
    paddingBottom: 40,
  },

  section: {
    gap: Spacing.itemGap,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optional: {
    fontSize: 11,
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    color: Colors.subtle,
  },

  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  fieldError: {
    fontSize: 13,
    color: Colors.error,
  },

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
  pickerTriggerFilled: {
    borderColor: Colors.primary,
  },
  pickerTriggerError: {
    borderColor: Colors.error,
  },
  pickerTriggerPressed: {
    backgroundColor: Colors.background,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  pickerPlaceholder: {
    color: Colors.subtle,
  },
  chevron: {
    fontSize: 20,
    color: Colors.subtle,
    lineHeight: 24,
  },

  submitBtn: {
    marginTop: 8,
  },
})
