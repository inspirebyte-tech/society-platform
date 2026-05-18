import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native'
import { Colors } from '../constants/colors'
import { Spacing } from '../constants/spacing'

export interface PickerOption {
  label: string
  value: string
}

interface BottomSheetPickerProps {
  visible: boolean
  title: string
  options: PickerOption[]
  selected: string | null
  onSelect: (value: string) => void
  onClose: () => void
  searchable?: boolean
}

export function BottomSheetPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
}: BottomSheetPickerProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!visible) setQuery('')
  }, [visible])

  const filtered = searchable && query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {searchable && (
          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search..."
              placeholderTextColor={Colors.subtle}
              style={styles.searchInput}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => {
            const isSelected = item.value === selected
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.value)
                  onClose()
                }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {item.label}
                </Text>
                {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            )
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View style={styles.cancelWrapper}>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
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
    paddingBottom: 32,
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
    fontSize: 14,
    fontWeight: '600',
    color: Colors.subtle,
    textAlign: 'center',
    paddingVertical: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: Spacing.screenPadding,
    minHeight: Spacing.minTapTarget,
  },
  optionSelected: {
    backgroundColor: '#ede9fe',
  },
  optionPressed: {
    backgroundColor: Colors.background,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  optionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.screenPadding,
  },
  searchBox: {
    marginHorizontal: Spacing.screenPadding,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  searchInput: {
    fontSize: 15,
    color: Colors.text,
  },
  cancelWrapper: {
    marginTop: 8,
    paddingHorizontal: Spacing.screenPadding,
  },
  cancelBtn: {
    height: Spacing.buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.subtle,
  },
})
