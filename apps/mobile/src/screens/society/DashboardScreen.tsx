import React, { useEffect, useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
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
  Image,
  Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
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
import { VisitorEntry, getActiveVisitors, getEntryLog } from '../../services/visitors'
import { getUnreadCount } from '../../services/notificationInbox'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'
import { Ionicons } from '@expo/vector-icons'

type Props = NativeStackScreenProps<AppStackParamList, 'Dashboard'>

const SOCIETY_TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Apartment',
  VILLA: 'Villa',
  MIXED: 'Mixed',
  PLOTTED: 'Plotted',
}

// ─── Action Components ───────────────────────────────────────────────────────

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}

function ActionRow({ icon, label, subtitle, onPress }: ActionRowProps & { subtitle: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && styles.actionRowPressed,
      ]}
    >
      <View style={styles.actionIcon}>
        <Ionicons
          name={icon}
          size={20}
          color={Colors.primary}
        />
      </View>

      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.actionChevron}>›</Text>
    </Pressable>
  )
}

function ActionGridItem({ icon, label, onPress }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridItem,
        pressed && styles.actionRowPressed,
      ]}
    >
      <View style={styles.gridIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={Colors.primary}
        />
      </View>
      <Text style={styles.gridLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

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
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null)
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [activeCount, setActiveCount] = useState(0)
  const [todayCount, setTodayCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingEntry, setPendingEntry] = useState<VisitorEntry | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  function openProfile() {
    setProfileName(user?.name ?? '')
    setProfileError('')
    setPhotoBase64(null)
    setPhotoPreviewUri(null)
    setShowProfile(true)
  }

  async function handlePickPhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== 'granted') {
        setToast({ message: 'Camera permission required.', type: 'info' })
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      })
      if (result.canceled || !result.assets[0]?.base64) return
      setPhotoBase64(result.assets[0].base64)
      setPhotoPreviewUri(result.assets[0].uri)
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        setToast({ message: 'Allow photo access to choose an image.', type: 'info' })
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      })
      if (result.canceled || !result.assets[0]?.base64) return
      setPhotoBase64(result.assets[0].base64)
      setPhotoPreviewUri(result.assets[0].uri)
    }
  }

  function showPhotoOptions() {
    Alert.alert('Change Photo', undefined, [
      { text: 'Take Photo', onPress: () => handlePickPhoto('camera') },
      { text: 'Choose from Gallery', onPress: () => handlePickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function handleSaveName() {
    const trimmed = profileName.trim()
    if (trimmed.length < 2) {
      setProfileError('Name must be at least 2 characters.')
      return
    }
    setIsSaving(true)
    try {
      await updateProfile(trimmed, photoBase64 ?? undefined)
      await loadUser()
      setShowProfile(false)
      setToast({ message: 'Profile updated.', type: 'success' })
    } catch (e) {
      const code = getApiErrorCode(e)
      setProfileError(getErrorMessage(code))
    } finally {
      setIsSaving(false)
    }
  }

  const loadNotificationBadge = useCallback(async () => {
    try {
      const result = await getUnreadCount()
      setUnreadCount(result.count)
    } catch {
      // non-critical
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadNotificationBadge()
    }, [loadNotificationBadge]),
  )

  const loadVisitorStats = useCallback(async () => {
    if (permissions.includes('visitor.log')) {
      const active = await getActiveVisitors(societyId)
      setActiveCount(active.length)
      const today = new Date().toISOString().split('T')[0]
      const todayEntries = await getEntryLog(societyId, { date: today })
      setTodayCount(todayEntries.length)
      const pending = await getEntryLog(societyId, { status: 'PENDING' })
      setPendingCount(pending.length)
    }
    if (permissions.includes('visitor.approve')) {
      try {
        const entries = await getEntryLog(societyId, { status: 'PENDING' })
        const pending = entries.find(e => e.status === 'PENDING')
        setPendingEntry(pending ?? null)
      } catch {
        // non-critical — fail silently
      }
    }
  }, [societyId, permissions])

  useEffect(() => {
    load()
    loadVisitorStats()
  }, [load, loadVisitorStats])

  const onRefresh = useCallback(async () => {
    await Promise.all([load(), loadUser(), loadVisitorStats(), loadNotificationBadge()])
  }, [load, loadUser, loadVisitorStats, loadNotificationBadge])

  const canCreateSociety = permissions.includes('society.create')

  // Profile avatar in header left — always visible
  useEffect(() => {
    const initial = (user?.name ?? '?').trim().charAt(0).toUpperCase()
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={openProfile} hitSlop={12} style={styles.headerAvatarBtn}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, navigation])

  // Bell icon (all roles) + "+" button (builders only)
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerRightRow}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications', { societyId })}
            style={styles.headerButton}
            hitSlop={12}
          >
            <View>
              <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          {canCreateSociety && (
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateSociety', { source: 'dashboard' })}
              hitSlop={12}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>+</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    })
  }, [canCreateSociety, unreadCount, navigation, societyId])

  // Permission gates — as per MOBILE_CONTEXT.md
  const canViewStructure = permissions.includes('node.view')
  const canInvite = permissions.includes('invitation.create')
  const canViewMembers = permissions.includes('member.view')
  const canSwitchSociety = memberships.length > 1
  const canViewComplaints =
    permissions.includes('complaint.create') ||
    permissions.includes('complaint.view_own') ||
    permissions.includes('complaint.view_all')
  const canViewAnnouncements = permissions.includes('announcement.view')
  // unit.view_all is also granted to Gatekeepers (for flat picker in LogVisitor).
  // Unit Inventory tile should only show for management roles (Builder/Admin) who
  // also have unit.assign — Gatekeepers do not have that permission.
  const canViewUnitInventory = permissions.includes('unit.view_all') && permissions.includes('unit.assign')
  const canViewMyHome = permissions.includes('unit.view_own')

  // memberId for MyHome — find current user's membership in this society
  const currentMembership = memberships.find((m) => m.org.id === societyId)
  const currentMemberId = currentMembership?.id ?? null

  const canLogVisitor = permissions.includes('visitor.log')
  const canViewActiveVisitors = permissions.includes('visitor.log')
  const canViewEntryLog = permissions.includes('visitor.view_log')
  const canManageMyVisitors = permissions.includes('visitor.pre_approve') || permissions.includes('visitor.approve') || permissions.includes('visitor.view_own')

  const actions = [
    {
      show: canViewAnnouncements,
      icon: 'megaphone-outline' as const,
      label: 'Announcements',
      subtitle: 'Society notices and updates',
      onPress: () => navigation.navigate('AnnouncementsList', { societyId }),
    },
    {
      show: canViewStructure,
      icon: 'business-outline' as const,
      label: 'Structure',
      subtitle: 'Towers, wings, and units',
      onPress: () => navigation.navigate('Structure', { societyId }),
    },
    {
      show: canInvite,
      icon: 'mail-outline' as const,
      label: 'Invite Member',
      subtitle: 'Send invitation via SMS',
      onPress: () => navigation.navigate('InviteMember', { societyId }),
    },
    {
      show: canViewMembers,
      icon: 'people-outline' as const,
      label: 'View Members',
      subtitle: 'Active residents and staff',
      onPress: () => navigation.navigate('MemberList', { societyId }),
    },
    {
      show: canViewComplaints,
      icon: 'warning-outline' as const,
      label: 'Complaints',
      subtitle: 'View and raise complaints',
      onPress: () => navigation.navigate('ComplaintList', { societyId }),
    },
    {
      show: canViewUnitInventory,
      icon: 'clipboard-outline' as const,
      label: 'Unit Inventory',
      subtitle: 'All flats, owners, and occupants',
      onPress: () => navigation.navigate('UnitInventory', { societyId }),
    },
    {
      show: canLogVisitor,
      icon: 'person-add-outline' as const,
      label: 'Log Visitor',
      subtitle: 'Register walk-in or delivery',
      onPress: () => navigation.navigate('LogVisitor', { societyId }),
    },
    {
      show: canViewActiveVisitors,
      icon: 'radio-outline' as const,
      label: 'Active Visitors',
      subtitle: 'Visitors currently inside',
      onPress: () => navigation.navigate('ActiveVisitors', { societyId }),
    },
    {
      show: canViewEntryLog,
      icon: 'list-outline' as const,
      label: 'Entry Log',
      subtitle: 'History of all visitors',
      onPress: () => navigation.navigate('EntryLog', { societyId }),
    },
    {
      show: canManageMyVisitors,
      icon: 'people-circle-outline' as const,
      label: 'My Visitors',
      subtitle: 'Pre-approvals and history',
      onPress: () => navigation.navigate('MyVisitors', { societyId }),
    },
    {
      show: canViewMyHome && !!currentMemberId,
      icon: 'home-outline' as const,
      label: 'My Home',
      subtitle: 'Your flat and co-occupants',
      onPress: () => navigation.navigate('MyHome', { societyId, memberId: currentMemberId! }),
    },
    {
      show: canSwitchSociety,
      icon: 'swap-horizontal-outline' as const,
      label: 'Switch Society',
      subtitle: 'Switch between societies',
      onPress: () => navigation.navigate('SwitchSociety'),
    },
  ].filter((a) => a.show)

  const hasAnyAction = actions.length > 0

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
              {(role === 'Builder' || role === 'Admin') && (
                <Text style={styles.typePill}>
                  {SOCIETY_TYPE_LABEL[society.type] ?? society.type}
                </Text>
              )}
              {role ? <Text style={styles.rolePill}>{role}</Text> : null}
            </View>
          </View>
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={2}>
          {society.address}, {society.city}, {society.state} – {society.pincode}
        </Text>

        {/* Stats — role-specific */}
        {canLogVisitor ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeCount}</Text>
              <Text style={styles.statLabel}>Inside Now</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{todayCount}</Text>
              <Text style={styles.statLabel}>Today's Entries</Text>
            </View>
            <View style={[styles.statCard, pendingCount > 0 && styles.statCardAlert]}>
              <Text style={[styles.statNumber, pendingCount > 0 && styles.statNumberAlert]}>
                {pendingCount}
              </Text>
              <Text style={[styles.statLabel, pendingCount > 0 && styles.statLabelAlert]}>
                Awaiting Approval
              </Text>
            </View>
          </View>
        ) : !canManageMyVisitors ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{society.totalUnits}</Text>
              <Text style={styles.statLabel}>Total Units</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{society.totalMembers}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
          </View>
        ) : null}

        {/* Pending visitor alert — residents only */}
        {canManageMyVisitors && !canLogVisitor && pendingEntry && (
          <Pressable
            style={styles.pendingBanner}
            onPress={() => navigation.navigate('VisitorApproval', {
              societyId,
              entryId: pendingEntry.id,
            })}
          >
            <Ionicons name="notifications" size={20} color="#f97316" />
            <View style={styles.pendingBannerText}>
              <Text style={styles.pendingBannerTitle}>
                {pendingEntry.visitorName} is waiting at your gate
              </Text>
              <Text style={styles.pendingBannerSub}>
                Tap to approve or deny →
              </Text>
            </View>
          </Pressable>
        )}

        {/* Actions */}
        {hasAnyAction ? (
          <View style={styles.actionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                onPress={() => setLayoutMode(layoutMode === 'grid' ? 'list' : 'grid')}
                hitSlop={12}
                style={styles.layoutToggle}
              >
                <Ionicons
                  name={layoutMode === 'grid' ? 'list-outline' : 'grid-outline'}
                  size={20}
                  color={Colors.subtle}
                />
              </TouchableOpacity>
            </View>

            <View style={layoutMode === 'grid' ? styles.gridContainer : styles.actionsList}>
              {actions.map((action, index) => (
                layoutMode === 'grid' ? (
                  <ActionGridItem
                    key={index}
                    icon={action.icon}
                    label={action.label}
                    onPress={action.onPress}
                  />
                ) : (
                  <ActionRow
                    key={index}
                    icon={action.icon}
                    label={action.label}
                    subtitle={action.subtitle}
                    onPress={action.onPress}
                  />
                )
              ))}
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
            <Text style={profileStyles.title}>Edit Profile</Text>
            {user ? (
              <Text style={profileStyles.phoneHint}>{user.phone}</Text>
            ) : null}

            {/* Photo picker */}
            <View style={profileStyles.photoSection}>
              <TouchableOpacity onPress={showPhotoOptions} style={profileStyles.photoWrap}>
                {photoPreviewUri ? (
                  <Image source={{ uri: photoPreviewUri }} style={profileStyles.photoCircle} />
                ) : user?.photoUrl ? (
                  <Image source={{ uri: user.photoUrl }} style={profileStyles.photoCircle} />
                ) : (
                  <View style={profileStyles.photoCircle}>
                    <Text style={profileStyles.photoInitial}>
                      {(user?.name ?? '?').trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={showPhotoOptions} hitSlop={8}>
                <Text style={profileStyles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

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
    color: Colors.subtle,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCardAlert: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    borderWidth: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  statNumberAlert: { color: '#f97316' },
  statLabel: {
    fontSize: 13,
    color: Colors.subtle,
    fontWeight: '500',
  },
  statLabelAlert: { color: '#f97316' },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pendingBannerText: { flex: 1 },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  pendingBannerSub: {
    fontSize: 12,
    color: '#f97316',
    marginTop: 2,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  layoutToggle: {
    padding: 4,
    marginRight: -4,
  },
  actionsList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '31.1%', // Precise width for 3-column with gap
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 90,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
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
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  headerButton: {
    padding: 4,
  },
  headerButtonText: {
    fontSize: 26,
    color: Colors.primary,
    fontWeight: '400',
    lineHeight: 30,
  },

  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
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

  // Photo picker
  photoSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  photoWrap: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.surface,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
})
