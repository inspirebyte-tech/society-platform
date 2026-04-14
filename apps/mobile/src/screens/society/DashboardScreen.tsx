import React, { useEffect, useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Toast } from '../../components/Toast'
import { TextInput } from '../../components/TextInput'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { useSociety } from '../../hooks/useSociety'
import { updateProfile } from '../../services/auth'
import { getApiErrorCode } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>

const SOCIETY_TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  MIXED: 'Mixed',
  PLOTTED: 'Plotted',
}

export function DashboardScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions, isLoading: authLoading, loadUser, signOut, memberships, user } = useAuth()
  const { society, isLoading: societyLoading, error, load } = useSociety(societyId)

  const isLoading = authLoading || societyLoading

  const role = memberships.find((m) => m.org.id === societyId)?.role ?? null

  // Profile sheet state
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileError, setProfileError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  function openProfile() {
    setProfileName(user?.name ?? '')
    setProfileError('')
    setShowProfile(true)
  }

  async function handleSaveName() {
    const trimmed = profileName.trim()
    if (trimmed.length < 2) {
      setProfileError('Name must be at least 2 characters.')
      return
    }
    setIsSaving(true)
    try {
      await updateProfile(trimmed)
      await loadUser()
      setShowProfile(false)
      setToast({ message: 'Name updated.', type: 'success' })
    } catch (e) {
      const code = getApiErrorCode(e)
      if (code === 'missing_field' || code === 'invalid_name') {
        setProfileError(getErrorMessage(code))
      } else {
        setProfileError(getErrorMessage(code))
      }
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    await Promise.all([load(), loadUser()])
  }, [load, loadUser])

  const canCreateSociety = permissions.includes('society.create')

  // Profile avatar in header left — always visible
  useEffect(() => {
    const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase()
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={openProfile} hitSlop={12} style={styles.headerAvatarBtn}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initial}</Text>
          </View>
        </TouchableOpacity>
      ),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, navigation])

  // "+" to create another society — builders only
  useEffect(() => {
    if (!canCreateSociety) return
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateSociety', { source: 'dashboard' })}
          hitSlop={12}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>+</Text>
        </TouchableOpacity>
      ),
    })
  }, [canCreateSociety, navigation])

  // Permission gates — as per MOBILE_CONTEXT.md
  const canViewStructure = permissions.includes('node.view')
  const canInvite = permissions.includes('invitation.create')
  const canViewMembers = permissions.includes('member.view')
  const canSwitchSociety = memberships.length > 1
  const canViewComplaints =
    permissions.includes('complaint.create') ||
    permissions.includes('complaint.view_own') ||
    permissions.includes('complaint.view_all')
  const canViewUnitInventory = permissions.includes('unit.view_all')
  const canViewMyHome = permissions.includes('unit.view_own')

  // memberId for MyHome — find current user's membership in this society
  const currentMembership = memberships.find((m) => m.org.id === societyId)
  const currentMemberId = currentMembership?.id ?? null

  const hasAnyAction =
    canViewStructure || canInvite || canViewMembers || canSwitchSociety ||
    canViewComplaints || canViewUnitInventory || canViewMyHome

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (error || !society) {
    return (
      <ScreenWrapper>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Could not load society</Text>
          <Text style={styles.errorSubtitle}>{error ?? 'Something went wrong. Please try again.'}</Text>
          <Button label="Retry" onPress={load} style={styles.errorBtn} />
          <Button label="Sign out" variant="secondary" onPress={signOut} style={styles.errorBtn} />
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper scroll={false} style={styles.wrapper}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Society identity */}
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {society.name.trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.identityText}>
            <Text style={styles.societyName} numberOfLines={2}>
              {society.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.typePill}>
                {SOCIETY_TYPE_LABEL[society.type] ?? society.type}
              </Text>
              {role ? <Text style={styles.rolePill}>{role}</Text> : null}
            </View>
          </View>
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>
          {society.address}, {society.city}, {society.state} – {society.pincode}
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{society.totalUnits}</Text>
            <Text style={styles.statLabel}>Total Units</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>{society.totalMembers}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </Card>
        </View>

        {/* Actions */}
        {hasAnyAction ? (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsList}>
              {canViewStructure ? (
                <ActionRow
                  icon="🏗"
                  label="Manage Structure"
                  subtitle="Towers, wings, and units"
                  onPress={() => navigation.navigate('Structure', { societyId })}
                />
              ) : null}
              {canInvite ? (
                <ActionRow
                  icon="✉️"
                  label="Invite Member"
                  subtitle="Send invitation via SMS"
                  onPress={() => navigation.navigate('InviteMember', { societyId })}
                />
              ) : null}
              {canViewMembers ? (
                <ActionRow
                  icon="👥"
                  label="View Members"
                  subtitle="Active residents and staff"
                  onPress={() => navigation.navigate('MemberList', { societyId })}
                />
              ) : null}
              {canViewComplaints ? (
                <ActionRow
                  icon="📋"
                  label="Complaints"
                  subtitle="View and raise complaints"
                  onPress={() => navigation.navigate('ComplaintList', { societyId })}
                />
              ) : null}
              {canViewUnitInventory ? (
                <ActionRow
                  icon="🏢"
                  label="Unit Inventory"
                  subtitle="All flats, owners, and occupants"
                  onPress={() => navigation.navigate('UnitInventory', { societyId })}
                />
              ) : null}
              {canViewMyHome && currentMemberId ? (
                <ActionRow
                  icon="🏠"
                  label="My Home"
                  subtitle="Your flat details and co-occupants"
                  onPress={() => navigation.navigate('MyHome', { societyId, memberId: currentMemberId })}
                />
              ) : null}
              {canSwitchSociety ? (
                <ActionRow
                  icon="🔀"
                  label="Switch Society"
                  subtitle="You belong to multiple societies"
                  onPress={() => navigation.navigate('SwitchSociety')}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Sign out */}
        <View style={styles.footer}>
          <Pressable onPress={signOut} hitSlop={12}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ── Profile sheet ── */}
      <Modal
        visible={showProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfile(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowProfile(false)}>
          <View style={profileStyles.overlay} />
        </TouchableWithoutFeedback>

        <View style={profileStyles.sheet}>
          <View style={profileStyles.handle} />

          <View style={profileStyles.body}>
            <Text style={profileStyles.title}>Edit Name</Text>
            {user ? (
              <Text style={profileStyles.phoneHint}>{user.phone}</Text>
            ) : null}
            <TextInput
              label="Full Name"
              value={profileName}
              onChangeText={(v) => { setProfileName(v); setProfileError('') }}
              error={profileError}
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              maxLength={80}
            />
          </View>

          <View style={profileStyles.actions}>
            <Button label="Save" onPress={handleSaveName} loading={isSaving} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => setShowProfile(false)}
              disabled={isSaving}
            />
          </View>
        </View>
      </Modal>

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

// ─── Action Row ──────────────────────────────────────────────────────────────

interface ActionRowProps {
  icon: string
  label: string
  subtitle: string
  onPress: () => void
}

function ActionRow({ icon, label, subtitle, onPress }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
    >
      <View style={styles.actionIcon}>
        <Text style={styles.actionIconText}>{icon}</Text>
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
  },

  // Error state
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: Colors.subtle,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },
  errorBtn: {
    paddingHorizontal: 32,
    alignSelf: 'stretch',
  },
  content: {
    padding: Spacing.screenPadding,
    paddingBottom: 40,
    gap: Spacing.sectionGap,
  },

  // Identity
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.surface,
  },
  identityText: {
    flex: 1,
    gap: 6,
  },
  societyName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typePill: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.primary,
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rolePill: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.subtle,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // Address
  address: {
    fontSize: 14,
    color: Colors.subtle,
    lineHeight: 20,
    marginTop: -Spacing.itemGap,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.itemGap,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 4,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.subtle,
    fontWeight: '500',
  },

  // Actions section
  actionsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.subtle,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionsList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: Spacing.minTapTarget,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionRowPressed: {
    backgroundColor: Colors.background,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 18,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: Colors.subtle,
  },
  actionChevron: {
    fontSize: 22,
    color: Colors.subtle,
    lineHeight: 26,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  signOutText: {
    fontSize: 14,
    color: Colors.subtle,
    fontWeight: '500',
  },

  // Header
  headerButton: {
    marginRight: 4,
    padding: 4,
  },
  headerButtonText: {
    fontSize: 26,
    color: Colors.primary,
    fontWeight: '400',
    lineHeight: 30,
  },

  // Header avatar (profile button)
  headerAvatarBtn: {
    marginLeft: 4,
    padding: 4,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.surface,
  },
})

// ─── Profile sheet styles ─────────────────────────────────────────────────────

const profileStyles = StyleSheet.create({
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
  body: {
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: 20,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  phoneHint: {
    fontSize: 13,
    color: Colors.subtle,
    marginTop: -6,
  },
  actions: {
    paddingHorizontal: Spacing.screenPadding,
    gap: 10,
  },
})
