import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { TextInput } from './TextInput'
import { Button } from './Button'
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker'
import { NodeData, updateNode } from '../services/nodes'
import { getApiErrorCode, getApiErrorDetails } from '../services/api'
import { getErrorMessage } from '../utils/errorMessages'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

const BHK_OPTIONS: PickerOption[] = [
  { label: '1 RK', value: '1RK' },
  { label: '1 BHK', value: '1BHK' },
  { label: '2 BHK', value: '2BHK' },
  { label: '3 BHK', value: '3BHK' },
  { label: '4 BHK', value: '4BHK' },
  { label: '5 BHK+', value: '5BHK+' },
]

interface EditNodeSheetProps {
  visible: boolean
  node: NodeData | null
  societyId: string
  onSuccess: () => void
  onClose: () => void
}

interface FormErrors {
  name?: string
  code?: string
}

export function EditNodeSheet({
  visible,
  node,
  societyId,
  onSuccess,
  onClose,
}: EditNodeSheetProps) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [bhk, setBhk] = useState('')
  const [floorNo, setFloorNo] = useState('')
  const [sqFt, setSqFt] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [bhkPickerOpen, setBhkPickerOpen] = useState(false)

  useEffect(() => {
    if (node && visible) {
      setName(node.name)
      setCode(node.code)
      setBhk(node.metadata?.bhk ?? '')
      setFloorNo(node.metadata?.floorNo?.toString() ?? '')
      setSqFt(node.metadata?.sqFt?.toString() ?? '')
      setErrors({})
    }
  }, [node, visible])

  const isUnit = node?.nodeType === 'UNIT'

  function validate(): boolean {
    const next: FormErrors = {}
    if (!name.trim()) next.name = 'Name is required.'
    if (!code.trim()) next.code = 'Code is required.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave() {
    if (!node || !validate()) return
    setLoading(true)
    try {
      const payload: Parameters<typeof updateNode>[2] = {
        name: name.trim(),
        code: code.trim(),
      }
      if (isUnit) {
        payload.metadata = {
          ...(bhk ? { bhk } : {}),
          ...(floorNo ? { floorNo: parseInt(floorNo, 10) } : {}),
          ...(sqFt ? { sqFt: parseInt(sqFt, 10) } : {}),
        }
      }
      await updateNode(societyId, node.id, payload)
      onSuccess()
      onClose()
    } catch (e) {
      const apiCode = getApiErrorCode(e)
      const details = getApiErrorDetails(e)
      if (apiCode === 'duplicate_code') {
        setErrors({ code: 'This code is already taken.' })
      } else if (apiCode === 'missing_field' && details.field) {
        setErrors({ [details.field as string]: getErrorMessage(apiCode) })
      } else {
        setErrors({ name: getErrorMessage(apiCode) })
      }
    } finally {
      setLoading(false)
    }
  }

  if (!node) return null

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.titleRow}>
              <Text style={styles.title}>Edit {node.name}</Text>
              <Text style={styles.nodeType}>{node.nodeType}</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                label="Name"
                value={name}
                onChangeText={(v) => { setName(v); setErrors((e) => ({ ...e, name: undefined })) }}
                error={errors.name}
                autoCapitalize="words"
              />
              <TextInput
                label="Code"
                value={code}
                onChangeText={(v) => { setCode(v); setErrors((e) => ({ ...e, code: undefined })) }}
                error={errors.code}
                autoCapitalize="characters"
                helper="Short identifier, e.g. TA, 101"
              />

              {isUnit ? (
                <>
                  <View>
                    <Text style={styles.label}>BHK Type</Text>
                    <TextInput
                      value={BHK_OPTIONS.find((o) => o.value === bhk)?.label ?? ''}
                      placeholder="Select BHK type"
                      editable={false}
                      onPressIn={() => setBhkPickerOpen(true)}
                      pointerEvents="none"
                    />
                    <Text
                      style={styles.fakePressable}
                      onPress={() => setBhkPickerOpen(true)}
                    >
                      {''}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.rowHalf}>
                      <TextInput
                        label="Floor No."
                        value={floorNo}
                        onChangeText={(v) => setFloorNo(v.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        placeholder="e.g. 3"
                      />
                    </View>
                    <View style={styles.rowHalf}>
                      <TextInput
                        label="Area (sq.ft)"
                        value={sqFt}
                        onChangeText={(v) => setSqFt(v.replace(/\D/g, ''))}
                        keyboardType="number-pad"
                        placeholder="e.g. 950"
                      />
                    </View>
                  </View>
                </>
              ) : null}

              <View style={styles.buttons}>
                <Button label="Save Changes" onPress={handleSave} loading={loading} />
                <Button label="Cancel" onPress={onClose} variant="secondary" disabled={loading} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <BottomSheetPicker
        visible={bhkPickerOpen}
        title="BHK Type"
        options={BHK_OPTIONS}
        selected={bhk || null}
        onSelect={setBhk}
        onClose={() => setBhkPickerOpen(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  nodeType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.subtle,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  form: {
    padding: Spacing.screenPadding,
    gap: Spacing.itemGap,
    paddingBottom: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 6,
  },
  fakePressable: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    height: 52,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowHalf: {
    flex: 1,
  },
  buttons: {
    gap: 10,
    marginTop: 4,
  },
})
