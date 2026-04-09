import React, { useState, useMemo } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { TextInput } from '../../components/TextInput'
import { Button } from '../../components/Button'
import { BottomSheetPicker, PickerOption } from '../../components/BottomSheetPicker'
import { Toast } from '../../components/Toast'
import { Card } from '../../components/Card'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { addNode, bulkAddNodes, NodeType } from '../../services/nodes'
import { getApiErrorCode, getApiErrorDetails } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'AddNode'>

// ─── Options ──────────────────────────────────────────────────────────────────

const NODE_TYPE_OPTIONS: PickerOption[] = [
  { label: 'Tower',       value: 'TOWER' },
  { label: 'Wing',        value: 'WING' },
  { label: 'Floor',       value: 'FLOOR' },
  { label: 'Unit',        value: 'UNIT' },
  { label: 'Building',    value: 'BUILDING' },
  { label: 'Villa',       value: 'VILLA' },
  { label: 'Plot',        value: 'PLOT' },
  { label: 'Phase',       value: 'PHASE' },
  { label: 'Common Area', value: 'COMMON_AREA' },
  { label: 'Basement',    value: 'BASEMENT' },
]

const BHK_OPTIONS: PickerOption[] = [
  { label: '1 RK',   value: '1RK' },
  { label: '1 BHK',  value: '1BHK' },
  { label: '2 BHK',  value: '2BHK' },
  { label: '3 BHK',  value: '3BHK' },
  { label: '4 BHK',  value: '4BHK' },
  { label: '5 BHK+', value: '5BHK+' },
]

const NODE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  NODE_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

type Mode = 'single' | 'bulk'

// ─── Screen ───────────────────────────────────────────────────────────────────

export function AddNodeScreen({ route, navigation }: Props) {
  const { societyId, parentId, parentName } = route.params

  const [mode, setMode] = useState<Mode>('single')

  // ── Single form state ──
  const [sNodeType, setSNodeType] = useState<string>('')
  const [sName, setSName] = useState('')
  const [sCode, setSCode] = useState('')
  const [sBhk, setSBhk] = useState('')
  const [sFloor, setSFloor] = useState('')
  const [sSqFt, setSSqFt] = useState('')
  const [sErrors, setSErrors] = useState<Partial<Record<string, string>>>({})

  // ── Bulk form state ──
  const [bNodeType, setBNodeType] = useState<string>('UNIT')
  const [bCount, setBCount] = useState('')
  const [bStart, setBStart] = useState('1')
  const [bPrefix, setBPrefix] = useState('')
  const [bBhk, setBBhk] = useState('')
  const [bErrors, setBErrors] = useState<Partial<Record<string, string>>>({})

  // ── Shared ──
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)
  const [nodeTypePicker, setNodeTypePicker] = useState(false)
  const [bhkPicker, setBhkPicker] = useState(false)

  const isUnit = (mode === 'single' ? sNodeType : bNodeType) === 'UNIT'

  // ── Live preview (bulk only) ──────────────────────────────────────────────

  const bulkPreview = useMemo(() => {
    const count = parseInt(bCount, 10)
    const start = parseInt(bStart, 10)
    if (!count || count <= 0 || isNaN(start)) return null

    const prefix = bPrefix.trim()
    const MAX_SHOWN = 5
    const shown = Math.min(count, MAX_SHOWN)

    const names = Array.from({ length: shown }, (_, i) => {
      const n = start + i
      return prefix ? `${prefix} ${n}` : `${n}`
    })

    const nodeLabel = NODE_TYPE_LABEL[bNodeType]?.toLowerCase() ?? 'item'
    const plural = count !== 1 ? `${nodeLabel}s` : nodeLabel

    return {
      preview: names.join(', ') + (count > MAX_SHOWN ? '...' : ''),
      summary: `${count} ${plural} total`,
    }
  }, [bCount, bStart, bPrefix, bNodeType])

  // ── Validation ────────────────────────────────────────────────────────────

  function validateSingle(): boolean {
    const errs: Partial<Record<string, string>> = {}
    if (!sNodeType) errs.nodeType = 'Please select a node type.'
    if (!sName.trim()) errs.name = 'Name is required.'
    if (!sCode.trim()) errs.code = 'Code is required.'
    setSErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateBulk(): boolean {
    const errs: Partial<Record<string, string>> = {}
    if (!bNodeType) errs.nodeType = 'Please select a node type.'
    const count = parseInt(bCount, 10)
    if (!bCount || isNaN(count) || count < 1) {
      errs.count = 'Enter a count between 1 and 500.'
    } else if (count > 500) {
      errs.count = 'Maximum 500 units at once.'
    }
    const start = parseInt(bStart, 10)
    if (!bStart || isNaN(start) || start < 1) {
      errs.start = 'Enter a valid start number.'
    }
    setBErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (mode === 'single') await submitSingle()
    else await submitBulk()
  }

  async function submitSingle() {
    if (!validateSingle() || !parentId) return
    setLoading(true)
    try {
      await addNode(societyId, {
        parentId,
        nodeType: sNodeType as NodeType,
        name: sName.trim(),
        code: sCode.trim(),
        metadata: isUnit
          ? {
              ...(sBhk ? { bhk: sBhk } : {}),
              ...(sFloor ? { floorNo: parseInt(sFloor, 10) } : {}),
              ...(sSqFt ? { sqFt: parseInt(sSqFt, 10) } : {}),
            }
          : undefined,
      })
      navigation.goBack()
    } catch (e) {
      handleApiError(e, setSErrors)
    } finally {
      setLoading(false)
    }
  }

  async function submitBulk() {
    if (!validateBulk() || !parentId) return
    setLoading(true)
    try {
      const result = await bulkAddNodes(societyId, {
        parentId,
        nodeType: bNodeType as NodeType,
        count: parseInt(bCount, 10),
        startNumber: parseInt(bStart, 10),
        prefix: bPrefix.trim() || undefined,
        metadata: bBhk ? { bhk: bBhk } : undefined,
      })
      setToast({
        message: `${result.created} ${NODE_TYPE_LABEL[bNodeType]?.toLowerCase() ?? 'item'}s added.`,
        type: 'success',
      })
      setTimeout(() => navigation.goBack(), 1200)
    } catch (e) {
      handleApiError(e, setBErrors)
    } finally {
      setLoading(false)
    }
  }

  function handleApiError(e: unknown, setErrs: (errs: Partial<Record<string, string>>) => void) {
    const code = getApiErrorCode(e)
    const details = getApiErrorDetails(e)
    if (code === 'duplicate_code') {
      setErrs({ code: 'This code is already taken under this parent.' })
    } else if (code === 'missing_field' && details.field) {
      setErrs({ [details.field as string]: getErrorMessage(code) })
    } else if (code === 'invalid_parent') {
      setToast({ message: 'Invalid parent. Please go back and try again.', type: 'error' })
    } else {
      setToast({ message: getErrorMessage(code), type: 'error' })
    }
  }

  // ── Derived labels for submit button ──────────────────────────────────────

  const submitLabel = useMemo(() => {
    if (mode === 'single') {
      return sNodeType ? `Add ${NODE_TYPE_LABEL[sNodeType]}` : 'Add'
    }
    const count = parseInt(bCount, 10)
    const typeLabel = NODE_TYPE_LABEL[bNodeType]?.toLowerCase() ?? 'item'
    if (count > 0) {
      return `Add ${count} ${typeLabel}${count !== 1 ? 's' : ''}`
    }
    return `Add ${typeLabel}s`
  }, [mode, sNodeType, bNodeType, bCount])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ScreenWrapper>
      {/* Parent context */}
      {parentName ? (
        <View style={styles.contextBar}>
          <Text style={styles.contextLabel}>Under</Text>
          <Text style={styles.contextValue} numberOfLines={1}>{parentName}</Text>
        </View>
      ) : null}

      {/* Single / Bulk toggle */}
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, mode === 'single' && styles.toggleBtnActive]}
          onPress={() => setMode('single')}
        >
          <Text style={[styles.toggleBtnText, mode === 'single' && styles.toggleBtnTextActive]}>
            Single
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, mode === 'bulk' && styles.toggleBtnActive]}
          onPress={() => setMode('bulk')}
        >
          <Text style={[styles.toggleBtnText, mode === 'bulk' && styles.toggleBtnTextActive]}>
            Bulk
          </Text>
        </Pressable>
      </View>

      {/* ── Single mode ── */}
      {mode === 'single' ? (
        <View style={styles.form}>
          {/* Node type */}
          <TypePickerField
            value={sNodeType}
            error={sErrors.nodeType}
            onPress={() => setNodeTypePicker(true)}
          />

          <TextInput
            label="Name"
            value={sName}
            onChangeText={(v) => { setSName(v); setSErrors((e) => ({ ...e, name: undefined })) }}
            placeholder="e.g. Tower A"
            error={sErrors.name}
            autoCapitalize="words"
          />

          <TextInput
            label="Code"
            value={sCode}
            onChangeText={(v) => { setSCode(v); setSErrors((e) => ({ ...e, code: undefined })) }}
            placeholder="e.g. TA"
            error={sErrors.code}
            autoCapitalize="characters"
            helper="Short identifier — must be unique under this parent"
          />

          {/* UNIT metadata */}
          {isUnit ? (
            <>
              <BhkPickerField
                value={sBhk}
                onPress={() => setBhkPicker(true)}
              />
              <View style={styles.row}>
                <View style={styles.rowHalf}>
                  <TextInput
                    label="Floor No."
                    value={sFloor}
                    onChangeText={(v) => setSFloor(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    placeholder="e.g. 3"
                  />
                </View>
                <View style={styles.rowHalf}>
                  <TextInput
                    label="Area (sq.ft)"
                    value={sSqFt}
                    onChangeText={(v) => setSSqFt(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    placeholder="e.g. 950"
                  />
                </View>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {/* ── Bulk mode ── */}
      {mode === 'bulk' ? (
        <View style={styles.form}>
          {/* Node type */}
          <TypePickerField
            value={bNodeType}
            error={bErrors.nodeType}
            onPress={() => setNodeTypePicker(true)}
          />

          <View style={styles.row}>
            <View style={styles.rowHalf}>
              <TextInput
                label="Count"
                value={bCount}
                onChangeText={(v) => { setBCount(v.replace(/\D/g, '')); setBErrors((e) => ({ ...e, count: undefined })) }}
                keyboardType="number-pad"
                placeholder="e.g. 10"
                error={bErrors.count}
                helper="Max 500"
              />
            </View>
            <View style={styles.rowHalf}>
              <TextInput
                label="Start Number"
                value={bStart}
                onChangeText={(v) => { setBStart(v.replace(/\D/g, '')); setBErrors((e) => ({ ...e, start: undefined })) }}
                keyboardType="number-pad"
                placeholder="e.g. 101"
                error={bErrors.start}
              />
            </View>
          </View>

          <TextInput
            label="Prefix (optional)"
            value={bPrefix}
            onChangeText={setBPrefix}
            placeholder='e.g. Flat'
            helper='Combined with number: "Flat 101"'
            autoCapitalize="words"
          />

          {/* BHK for UNIT bulk */}
          {isUnit ? (
            <BhkPickerField value={bBhk} onPress={() => setBhkPicker(true)} />
          ) : null}

          {/* Live preview */}
          {bulkPreview ? (
            <Card style={styles.previewCard}>
              <Text style={styles.previewTitle}>Will create</Text>
              <Text style={styles.previewNames} numberOfLines={3}>
                {bulkPreview.preview}
              </Text>
              <Text style={styles.previewSummary}>{bulkPreview.summary}</Text>
            </Card>
          ) : null}
        </View>
      ) : null}

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        style={styles.submitBtn}
      />

      {/* Node type picker — shared between single and bulk */}
      <BottomSheetPicker
        visible={nodeTypePicker}
        title="Node Type"
        options={NODE_TYPE_OPTIONS}
        selected={mode === 'single' ? sNodeType || null : bNodeType || null}
        onSelect={(v) => {
          if (mode === 'single') {
            setSNodeType(v)
            setSErrors((e) => ({ ...e, nodeType: undefined }))
          } else {
            setBNodeType(v)
            setBErrors((e) => ({ ...e, nodeType: undefined }))
          }
        }}
        onClose={() => setNodeTypePicker(false)}
      />

      {/* BHK picker — shared between single and bulk */}
      <BottomSheetPicker
        visible={bhkPicker}
        title="BHK Type"
        options={BHK_OPTIONS}
        selected={mode === 'single' ? sBhk || null : bBhk || null}
        onSelect={(v) => {
          if (mode === 'single') setSBhk(v)
          else setBBhk(v)
        }}
        onClose={() => setBhkPicker(false)}
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypePickerField({
  value,
  error,
  onPress,
}: {
  value: string
  error?: string
  onPress: () => void
}) {
  return (
    <View>
      <Text style={fieldStyles.label}>Node Type</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          fieldStyles.picker,
          value ? fieldStyles.pickerFilled : null,
          error ? fieldStyles.pickerError : null,
          pressed && fieldStyles.pickerPressed,
        ]}
      >
        <Text style={[fieldStyles.pickerText, !value && fieldStyles.pickerPlaceholder]}>
          {value ? NODE_TYPE_LABEL[value] : 'Select type'}
        </Text>
        <Text style={fieldStyles.chevron}>⌄</Text>
      </Pressable>
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
    </View>
  )
}

function BhkPickerField({
  value,
  onPress,
}: {
  value: string
  onPress: () => void
}) {
  const label = BHK_OPTIONS.find((o) => o.value === value)?.label ?? ''
  return (
    <View>
      <Text style={fieldStyles.label}>BHK Type (optional)</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          fieldStyles.picker,
          value ? fieldStyles.pickerFilled : null,
          pressed && fieldStyles.pickerPressed,
        ]}
      >
        <Text style={[fieldStyles.pickerText, !value && fieldStyles.pickerPlaceholder]}>
          {label || 'Select BHK type'}
        </Text>
        <Text style={fieldStyles.chevron}>⌄</Text>
      </Pressable>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    marginBottom: Spacing.itemGap,
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contextValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },

  // Toggle
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    marginBottom: Spacing.sectionGap,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.subtle,
  },
  toggleBtnTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },

  // Form
  form: {
    gap: Spacing.itemGap + 2,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowHalf: {
    flex: 1,
  },

  // Bulk preview card
  previewCard: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    gap: 6,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewNames: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
    lineHeight: 22,
  },
  previewSummary: {
    fontSize: 13,
    color: Colors.subtle,
    fontWeight: '500',
  },

  submitBtn: {
    marginTop: Spacing.sectionGap,
    marginBottom: 8,
  },
})

const fieldStyles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  picker: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
  },
  pickerFilled: {
    borderColor: Colors.primary,
  },
  pickerError: {
    borderColor: Colors.error,
  },
  pickerPressed: {
    backgroundColor: Colors.background,
  },
  pickerText: {
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
  error: {
    fontSize: 13,
    color: Colors.error,
    marginTop: 4,
  },
})
