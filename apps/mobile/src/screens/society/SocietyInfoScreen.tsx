import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { getSociety } from '../../services/societies'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'SocietyInfo'>

const SOCIETY_TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA:     'Villa',
  MIXED:     'Mixed',
  PLOTTED:   'Plotted',
}

interface Society {
  id: string
  name: string
  address: string
  city: string
  state: string
  pincode: string
  type: string
  photoUrl: string | null
  contactPhone: string | null
  contactEmail: string | null
  description: string | null
}

export function SocietyInfoScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions } = useAuth()

  const canEdit = permissions.includes('society.update')

  useEffect(() => {
    if (!canEdit) return
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('SocietySettings', { societyId })}
          style={{ padding: 4, marginRight: 4 }}
          hitSlop={12}
        >
          <Ionicons name="create-outline" size={22} color={Colors.primary} />
        </Pressable>
      ),
    })
  }, [canEdit, navigation, societyId])

  const [society, setSociety] = useState<Society | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getSociety(societyId)
        setSociety(data)
      } catch (e) {
        const code = getApiErrorCode(e)
        setErrorMsg(getErrorMessage(code))
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [societyId])

  if (isLoading) return <LoadingSpinner fullScreen />

  if (errorMsg || !society) {
    return (
      <ScreenWrapper>
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{errorMsg ?? 'Could not load society info.'}</Text>
        </View>
      </ScreenWrapper>
    )
  }

  const avatarLetter = society.name.trim().charAt(0).toUpperCase()
  const fullAddress = [society.address, society.city, society.state, society.pincode]
    .filter(Boolean)
    .join(', ')

  return (
    <ScreenWrapper scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card ── */}
        <View style={styles.headerCard}>
          {society.photoUrl ? (
            <Image source={{ uri: society.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>{avatarLetter}</Text>
            </View>
          )}
          <Text style={styles.societyName}>{society.name}</Text>
          {society.type ? (
            <View style={styles.typePill}>
              <Text style={styles.typePillText}>
                {SOCIETY_TYPE_LABEL[society.type] ?? society.type}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Address ── */}
        {fullAddress ? (
          <InfoSection icon="location-outline" label={fullAddress} />
        ) : null}

        {/* ── Contact Phone ── */}
        {society.contactPhone ? (
          <InfoSection
            icon="call-outline"
            label={society.contactPhone}
            onPress={() => Linking.openURL(`tel:${society.contactPhone}`)}
          />
        ) : null}

        {/* ── Contact Email ── */}
        {society.contactEmail ? (
          <InfoSection
            icon="mail-outline"
            label={society.contactEmail}
            onPress={() => Linking.openURL(`mailto:${society.contactEmail}`)}
          />
        ) : null}

        {/* ── Description ── */}
        {society.description ? (
          <View style={styles.descSection}>
            <Text style={styles.descLabel}>About</Text>
            <Text style={styles.descText}>{society.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoSection({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress?: () => void
}) {
  const content = (
    <View style={infoStyles.row}>
      <Ionicons name={icon} size={18} color={Colors.subtle} style={infoStyles.icon} />
      <Text style={[infoStyles.label, onPress ? infoStyles.labelLink : null]}>{label}</Text>
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [infoStyles.wrap, pressed && infoStyles.wrapPressed]}
      >
        {content}
      </Pressable>
    )
  }

  return <View style={infoStyles.wrap}>{content}</View>
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    paddingBottom: 48,
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: Spacing.screenPadding,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  societyName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  typePill: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  descSection: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  descLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.subtle,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  descText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.screenPadding,
  },
  errorText: {
    fontSize: 15,
    color: Colors.subtle,
    textAlign: 'center',
  },
})

const infoStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  wrapPressed: {
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    flexShrink: 0,
  },
  label: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  labelLink: {
    color: Colors.primary,
  },
})
