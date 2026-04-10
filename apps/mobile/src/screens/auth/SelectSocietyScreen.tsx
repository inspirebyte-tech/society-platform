import React, { useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Card } from '../../components/Card'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { AuthStackParamList } from '../../navigation/AuthNavigator'
import { selectOrg, saveSessionToken, saveCurrentOrg } from '../../services/auth'
import { useAuth } from '../../hooks/useAuth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AuthStackParamList, 'SelectSociety'>

export function SelectSocietyScreen({ route }: Props) {
  const { memberships } = route.params
  const { loadUser } = useAuth()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  async function handleSelect(orgId: string) {
    setLoadingId(orgId)
    try {
      const data = await selectOrg(orgId)
      await saveSessionToken(data.token)
      await saveCurrentOrg(orgId)
      await loadUser(true)
    } catch (e) {
      const code = getApiErrorCode(e)
      setToast({ message: getErrorMessage(code), type: 'error' })
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <ScreenWrapper scroll={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Societies</Text>
        <Text style={styles.subtitle}>Select a society to continue</Text>
      </View>

      <FlatList
        data={memberships}
        keyExtractor={(item) => item.orgId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleSelect(item.orgId)} disabled={!!loadingId}>
            <Card style={styles.card}>
              <View style={styles.cardContent}>
                <View style={styles.cardText}>
                  <Text style={styles.orgName}>{item.orgName}</Text>
                  <Text style={styles.role}>{item.role}</Text>
                </View>
                {loadingId === item.orgId ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <Text style={styles.arrow}>›</Text>
                )}
              </View>
            </Card>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.itemGap }} />}
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

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: Spacing.sectionGap,
    paddingBottom: Spacing.itemGap,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtle,
  },
  list: {
    padding: Spacing.screenPadding,
  },
  card: {
    paddingVertical: 18,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    gap: 4,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  role: {
    fontSize: 13,
    color: Colors.subtle,
  },
  arrow: {
    fontSize: 24,
    color: Colors.subtle,
  },
})
