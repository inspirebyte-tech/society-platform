import React, { useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/ScreenWrapper'
import { Card } from '../../components/Card'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { useSociety } from '../../hooks/useSociety'
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
  const { permissions, isLoading: authLoading, loadUser, signOut, memberships } = useAuth()
  const { society, isLoading: societyLoading, error, load } = useSociety(societyId)

  const isLoading = authLoading || societyLoading

  const role = memberships.find((m) => m.org.id === societyId)?.role ?? null

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    await Promise.all([load(), loadUser()])
  }, [load, loadUser])

  // Permission gates — as per MOBILE_CONTEXT.md
  const canViewStructure = permissions.includes('node.view')
  const canInvite = permissions.includes('invitation.create')
  const canViewMembers = permissions.includes('member.view')

  const hasAnyAction = canViewStructure || canInvite || canViewMembers

  if (isLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (error || !society) {
    return (
      <EmptyState
        title="Could not load society"
        subtitle={error ?? 'Something went wrong. Please try again.'}
        actionLabel="Retry"
        onAction={load}
      />
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
})
