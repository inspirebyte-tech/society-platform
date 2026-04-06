import React, { useEffect, useState, useCallback } from 'react'
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
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmptyState } from '../../components/EmptyState'
import { ConfirmSheet } from '../../components/ConfirmSheet'
import { EditNodeSheet } from '../../components/EditNodeSheet'
import { Toast } from '../../components/Toast'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../hooks/useAuth'
import { getNodes, deleteNode, NodeData } from '../../services/nodes'
import { getApiErrorCode, getApiErrorDetails } from '../../services/api'
import { getErrorMessage } from '../../utils/errorMessages'
import { Colors } from '../../constants/colors'
import { Spacing } from '../../constants/spacing'

type Props = NativeStackScreenProps<AppStackParamList, 'Structure'>

// ─── Node type display config ─────────────────────────────────────────────────

const NODE_CONFIG: Record<string, { label: string; accent: string; bg: string }> = {
  SOCIETY:     { label: 'Society',     accent: Colors.primary, bg: '#ede9fe' },
  TOWER:       { label: 'Tower',       accent: '#6366f1',      bg: '#e0e7ff' },
  WING:        { label: 'Wing',        accent: '#7c3aed',      bg: '#ede9fe' },
  FLOOR:       { label: 'Floor',       accent: '#9333ea',      bg: '#f3e8ff' },
  UNIT:        { label: 'Unit',        accent: Colors.text,    bg: '#f1f5f9' },
  BUILDING:    { label: 'Building',    accent: '#6366f1',      bg: '#e0e7ff' },
  VILLA:       { label: 'Villa',       accent: '#059669',      bg: '#d1fae5' },
  PLOT:        { label: 'Plot',        accent: '#d97706',      bg: '#fef3c7' },
  PHASE:       { label: 'Phase',       accent: '#6366f1',      bg: '#e0e7ff' },
  COMMON_AREA: { label: 'Common',      accent: Colors.success, bg: '#dcfce7' },
  BASEMENT:    { label: 'Basement',    accent: Colors.subtle,  bg: '#f1f5f9' },
}

// Node types that are leaves — no Add button shown under them
const LEAF_NODE_TYPES = new Set(['UNIT', 'VILLA', 'PLOT', 'COMMON_AREA'])

const INDENT_PER_LEVEL = 20

// ─── StructureScreen ──────────────────────────────────────────────────────────

export function StructureScreen({ route, navigation }: Props) {
  const { societyId } = route.params
  const { permissions, isLoading: authLoading, loadUser } = useAuth()

  const [tree, setTree] = useState<NodeData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sheets state
  const [deleteTarget, setDeleteTarget] = useState<NodeData | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<NodeData | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null)

  const canCreate = permissions.includes('node.create')
  const canUpdate = permissions.includes('node.update')
  const canDelete = permissions.includes('node.delete')

  const loadTree = useCallback(async () => {
    setError(null)
    try {
      const data = await getNodes(societyId)
      setTree(data)
    } catch (e) {
      const code = getApiErrorCode(e)
      setError(getErrorMessage(code))
    }
  }, [societyId])

  useEffect(() => {
    async function initialLoad() {
      setDataLoading(true)
      await loadTree()
      setDataLoading(false)
    }
    initialLoad()
  }, [loadTree])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadTree(), loadUser()])
    setRefreshing(false)
  }, [loadTree, loadUser])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteNode(societyId, deleteTarget.id)
      setDeleteTarget(null)
      setToast({ message: `"${deleteTarget.name}" deleted.`, type: 'success' })
      await loadTree()
    } catch (e) {
      const code = getApiErrorCode(e)
      const details = getApiErrorDetails(e)
      setDeleteTarget(null)
      // has_children returns a specific message in details
      const msg =
        code === 'has_children' && details.message
          ? String(details.message)
          : getErrorMessage(code)
      setToast({ message: msg, type: 'error' })
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Render ──

  if (authLoading || dataLoading) {
    return <LoadingSpinner fullScreen />
  }

  if (error || !tree) {
    return (
      <EmptyState
        title="Could not load structure"
        subtitle={error ?? 'Something went wrong.'}
        actionLabel="Retry"
        onAction={() => {
          setDataLoading(true)
          loadTree().finally(() => setDataLoading(false))
        }}
      />
    )
  }

  const hasChildren = tree.children && tree.children.length > 0

  return (
    <ScreenWrapper scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Root society node — header style */}
        <SocietyRoot node={tree} />

        {/* Empty state when no children */}
        {!hasChildren ? (
          <View style={styles.emptyTree}>
            <Text style={styles.emptyTreeText}>No structure added yet.</Text>
            {canCreate ? (
              <Pressable
                onPress={() => navigation.navigate('AddNode', { societyId, parentId: tree.id })}
                style={styles.emptyAddBtn}
              >
                <Text style={styles.emptyAddBtnText}>+ Add Tower / Wing</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <>
            {/* Render children of root */}
            {tree.children.map((child) => (
              <NodeBranch
                key={child.id}
                node={child}
                depth={1}
                societyId={societyId}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
                onAddChild={(parentId) =>
                  navigation.navigate('AddNode', { societyId, parentId })
                }
              />
            ))}

            {/* Add under root */}
            {canCreate ? (
              <AddRow
                label="Add Tower / Wing"
                depth={1}
                onPress={() => navigation.navigate('AddNode', { societyId, parentId: tree.id })}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Delete confirmation — bottom sheet, NOT alert */}
      <ConfirmSheet
        visible={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        message={
          deleteTarget && deleteTarget.children.length > 0
            ? `This has ${deleteTarget.children.length} item${deleteTarget.children.length !== 1 ? 's' : ''} inside. Remove them first.`
            : 'This action cannot be undone.'
        }
        confirmLabel="Delete"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Edit node */}
      <EditNodeSheet
        visible={!!editTarget}
        node={editTarget}
        societyId={societyId}
        onSuccess={() => {
          setToast({ message: 'Changes saved.', type: 'success' })
          loadTree()
        }}
        onClose={() => setEditTarget(null)}
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

// ─── Society root header ──────────────────────────────────────────────────────

function SocietyRoot({ node }: { node: NodeData }) {
  const cfg = NODE_CONFIG['SOCIETY']
  return (
    <View style={styles.societyRoot}>
      <View style={[styles.societyRootBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.societyRootBadgeText, { color: cfg.accent }]}>
          {cfg.label}
        </Text>
      </View>
      <Text style={styles.societyRootName}>{node.name}</Text>
      <Text style={styles.societyRootCode}>{node.code}</Text>
    </View>
  )
}

// ─── Recursive branch ─────────────────────────────────────────────────────────

interface NodeBranchProps {
  node: NodeData
  depth: number
  societyId: string
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
  onEdit: (node: NodeData) => void
  onDelete: (node: NodeData) => void
  onAddChild: (parentId: string) => void
}

function NodeBranch({
  node,
  depth,
  societyId,
  canCreate,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onAddChild,
}: NodeBranchProps) {
  const isLeaf = LEAF_NODE_TYPES.has(node.nodeType)
  const hasChildren = node.children && node.children.length > 0
  const indentLeft = depth * INDENT_PER_LEVEL

  return (
    <View>
      {/* Node row */}
      <View style={[styles.nodeRow, { marginLeft: indentLeft }]}>
        {/* Left depth indicator */}
        <View style={styles.depthLine} />

        <View style={styles.nodeContent}>
          {/* Type badge + name */}
          <View style={styles.nodeMain}>
            <NodeTypeBadge nodeType={node.nodeType} />
            <View style={styles.nodeTextBlock}>
              <Text style={styles.nodeName} numberOfLines={1}>{node.name}</Text>
              {/* Unit metadata subtitle */}
              {node.nodeType === 'UNIT' && (node.metadata?.bhk || node.metadata?.floorNo) ? (
                <Text style={styles.nodeSubtitle}>
                  {[
                    node.metadata.bhk,
                    node.metadata.floorNo != null ? `Floor ${node.metadata.floorNo}` : null,
                    node.metadata.sqFt ? `${node.metadata.sqFt} sq.ft` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
            <Text style={styles.nodeCode}>{node.code}</Text>
          </View>

          {/* Action buttons */}
          <View style={styles.nodeActions}>
            {canUpdate ? (
              <Pressable
                onPress={() => onEdit(node)}
                style={styles.actionBtn}
                hitSlop={8}
              >
                <Text style={styles.actionBtnText}>Edit</Text>
              </Pressable>
            ) : null}
            {canDelete ? (
              <Pressable
                onPress={() => onDelete(node)}
                style={[styles.actionBtn, styles.actionBtnDanger]}
                hitSlop={8}
              >
                <Text style={[styles.actionBtnText, styles.actionBtnDangerText]}>Del</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Children */}
      {hasChildren
        ? node.children.map((child) => (
            <NodeBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              societyId={societyId}
              canCreate={canCreate}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))
        : null}

      {/* Add button — not on leaf types */}
      {canCreate && !isLeaf ? (
        <AddRow
          label={`Add under ${node.name}`}
          depth={depth + 1}
          onPress={() => onAddChild(node.id)}
        />
      ) : null}
    </View>
  )
}

// ─── Node type badge ──────────────────────────────────────────────────────────

function NodeTypeBadge({ nodeType }: { nodeType: string }) {
  const cfg = NODE_CONFIG[nodeType] ?? { label: nodeType, accent: Colors.subtle, bg: Colors.border }
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.accent }]}>{cfg.label}</Text>
    </View>
  )
}

// ─── Add row ──────────────────────────────────────────────────────────────────

function AddRow({
  label,
  depth,
  onPress,
}: {
  label: string
  depth: number
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.addRow,
        { marginLeft: depth * INDENT_PER_LEVEL },
        pressed && styles.addRowPressed,
      ]}
    >
      <Text style={styles.addRowText}>+ {label}</Text>
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
    paddingHorizontal: Spacing.screenPadding,
  },

  // Society root header
  societyRoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  societyRootBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  societyRootBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  societyRootName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  societyRootCode: {
    fontSize: 12,
    color: Colors.subtle,
    fontWeight: '500',
  },

  // Node row
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginVertical: 3,
  },
  depthLine: {
    width: 2,
    backgroundColor: Colors.border,
    borderRadius: 1,
    marginRight: 10,
    marginVertical: 2,
  },
  nodeContent: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: Spacing.minTapTarget,
  },
  nodeMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  nodeTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nodeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  nodeSubtitle: {
    fontSize: 11,
    color: Colors.subtle,
  },
  nodeCode: {
    fontSize: 11,
    color: Colors.subtle,
    fontWeight: '500',
    flexShrink: 0,
  },
  nodeActions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 36,
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.subtle,
  },
  actionBtnDangerText: {
    color: Colors.error,
  },

  // Type badge
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Add row
  addRow: {
    marginVertical: 3,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  addRowPressed: {
    backgroundColor: '#ede9fe',
    borderColor: Colors.primary,
  },
  addRowText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary,
  },

  // Empty tree
  emptyTree: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 14,
  },
  emptyTreeText: {
    fontSize: 15,
    color: Colors.subtle,
  },
  emptyAddBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
})
