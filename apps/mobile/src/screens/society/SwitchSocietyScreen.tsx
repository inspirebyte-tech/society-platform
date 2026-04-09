import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, SafeAreaView } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { listSocieties } from '../../services/societies'
import { selectOrg, saveSessionToken, saveCurrentOrg } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'
import { StatusBar } from 'expo-status-bar'

type Props = NativeStackScreenProps<AppStackParamList, 'SwitchSociety'>

interface Society {
  id: string
  name: string
  city: string
  state: string
  type: string
}

export function SwitchSocietyScreen({ navigation }: Props) {
  const { loadUser } = useAuth()
  const [societies, setSocieties] = useState<Society[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await listSocieties()
      setSocieties(data)
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSelect(society: Society) {
    if (selecting) return
    setSelecting(society.id)
    try {
      const session = await selectOrg(society.id)
      await saveSessionToken(session.token)
      await saveCurrentOrg(society.id)
      await loadUser()
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard', params: { societyId: society.id } }] })
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
      setSelecting(null)
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Your Societies</Text>
        <Text style={styles.subtitle}>Choose which society to open</Text>
      </View>

      <FlatList
        data={societies}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelect(item)}
            disabled={!!selecting}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
              selecting === item.id && styles.rowSelecting,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {item.city}, {item.state}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={!!toast}
          onHide={() => setToast(null)}
        />
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    marginBottom: Spacing.sectionGap,
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.screenPadding,
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtle,
    lineHeight: 22,
  },
  flatList: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
  },
  listContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: Spacing.minTapTarget,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: Colors.background,
  },
  rowSelecting: {
    opacity: 0.5,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.surface,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  rowMeta: {
    fontSize: 12,
    color: Colors.subtle,
  },
  chevron: {
    fontSize: 22,
    color: Colors.subtle,
    lineHeight: 26,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 72,
  },
})
