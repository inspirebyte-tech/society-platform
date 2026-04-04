import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { prisma } from '../lib/prisma'
import { enforceTenantContext } from '../middleware/tenantContext'
import { validateRequired } from '../utils/validate'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendServerError
} from '../utils/response'

const router = Router()

const VALID_NODE_TYPES = [
  'SOCIETY', 'TOWER', 'WING', 'FLOOR', 'UNIT',
  'COMMON_AREA', 'PHASE', 'BUILDING', 'VILLA',
  'PLOT', 'BASEMENT'
]

// ─────────────────────────────────────────────
// Helper — build nested tree from flat array
// One DB query, built in memory
// ─────────────────────────────────────────────
interface NodeWithChildren {
  id: string
  name: string
  code: string
  nodeType: string
  parentId: string | null
  metadata: unknown
  isActive: boolean
  createdAt: Date
  children: NodeWithChildren[]
}

function buildTree(
  nodes: Omit<NodeWithChildren, 'children'>[],
  parentId: string | null
): NodeWithChildren[] {
  return nodes
    .filter(n => n.parentId === parentId)
    .map(n => ({
      ...n,
      children: buildTree(nodes, n.id)
    }))
}

// ─────────────────────────────────────────────
// Helper — verify node belongs to org
// ─────────────────────────────────────────────
async function getNodeInOrg(
  nodeId: string,
  orgId: string
) {
  return prisma.propertyNode.findFirst({
    where: { id: nodeId, orgId }
  })
}

// ─────────────────────────────────────────────
// GET /api/societies/:id/nodes
// Get full structure tree
// ─────────────────────────────────────────────
router.get(
  '/:id/nodes',
  authenticate,
  enforceTenantContext,
  requirePermission('node.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params

      // verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // fetch all nodes in one query
      const allNodes = await prisma.propertyNode.findMany({
        where: { orgId: id, isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          nodeType: true,
          parentId: true,
          metadata: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      })

      // find root node
      const rootNode = allNodes.find(n => n.parentId === null)
      if (!rootNode) {
        return sendSuccess(res, null)
      }

      // build tree in memory
      const tree = {
        ...rootNode,
        children: buildTree(allNodes, rootNode.id)
      }

      return sendSuccess(res, tree)

    } catch (error) {
      console.error('GET /societies/:id/nodes error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/nodes
// Add a single node
// ─────────────────────────────────────────────
router.post(
  '/:id/nodes',
  authenticate,
  enforceTenantContext,
  requirePermission('node.create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { parentId, nodeType, name, code, metadata } = req.body

      // 1. validate required fields
      const validation = validateRequired(
        { parentId, nodeType, name, code },
        ['parentId', 'nodeType', 'name', 'code']
      )
      if (!validation.valid) {
        return sendError(res, validation.error!, 400, {
          field: validation.field
        })
      }

      // 2. validate nodeType
      if (!VALID_NODE_TYPES.includes(nodeType)) {
        return sendError(res, 'invalid_node_type', 400, {
          allowed: VALID_NODE_TYPES
        })
      }

      // 3. verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // 4. verify parentId belongs to this org
      const parentNode = await getNodeInOrg(parentId, id)
      if (!parentNode) {
        return sendError(res, 'invalid_parent', 400, {
          message: 'Parent node does not exist in this society'
        })
      }

      // 5. check duplicate code under same parent
      const duplicate = await prisma.propertyNode.findFirst({
        where: { orgId: id, parentId, code }
      })
      if (duplicate) {
        return sendError(res, 'duplicate_code', 400, {
          message: `Code '${code}' already exists under this parent`
        })
      }

      // 6. create node
      const node = await prisma.propertyNode.create({
        data: {
          orgId: id,
          parentId,
          nodeType,
          name,
          code,
          metadata: metadata || {}
        }
      })

      return sendCreated(res, {
        id: node.id,
        orgId: node.orgId,
        parentId: node.parentId,
        nodeType: node.nodeType,
        name: node.name,
        code: node.code,
        metadata: node.metadata,
        createdAt: node.createdAt
      })

    } catch (error) {
      console.error('POST /societies/:id/nodes error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/nodes/bulk
// Add multiple units at once
// ─────────────────────────────────────────────
router.post(
  '/:id/nodes/bulk',
  authenticate,
  enforceTenantContext,
  requirePermission('node.create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const {
        parentId,
        nodeType,
        count,
        startNumber,
        prefix,
        metadata
      } = req.body

      // 1. validate required fields
      const validation = validateRequired(
        { parentId, nodeType, count, startNumber },
        ['parentId', 'nodeType', 'count', 'startNumber']
      )
      if (!validation.valid) {
        return sendError(res, validation.error!, 400, {
          field: validation.field
        })
      }

      // 2. validate count
      const countNum = Number(count)
      if (isNaN(countNum) || countNum < 1 || countNum > 500) {
        return sendError(res, 'invalid_count', 400, {
          message: 'Count must be between 1 and 500'
        })
      }

      // 3. validate nodeType
      if (!VALID_NODE_TYPES.includes(nodeType)) {
        return sendError(res, 'invalid_node_type', 400, {
          allowed: VALID_NODE_TYPES
        })
      }

      // 4. verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // 5. verify parentId belongs to this org
      const parentNode = await getNodeInOrg(parentId, id)
      if (!parentNode) {
        return sendError(res, 'invalid_parent', 400, {
          message: 'Parent node does not exist in this society'
        })
      }

      // 6. generate all codes and names upfront
      const startNum = Number(startNumber)
      const nodes = Array.from({ length: countNum }, (_, i) => {
        const num = startNum + i
        const name = prefix ? `${prefix} ${num}` : `${num}`
        const code = String(num)
        return { name, code }
      })

      // 7. check ALL codes for duplicates before creating any
      const existingNodes = await prisma.propertyNode.findMany({
        where: {
          orgId: id,
          parentId,
          code: { in: nodes.map(n => n.code) }
        },
        select: { code: true }
      })

      if (existingNodes.length > 0) {
        return sendError(res, 'duplicate_code', 400, {
          existing: existingNodes.map(n => n.code),
          message: 'Some codes already exist under this parent'
        })
      }

      // 8. create all nodes in transaction
      const created = await prisma.$transaction(
        nodes.map(n =>
          prisma.propertyNode.create({
            data: {
              orgId: id,
              parentId,
              nodeType,
              name: n.name,
              code: n.code,
              metadata: metadata || {}
            }
          })
        )
      )

      return sendCreated(res, {
        created: created.length,
        nodes: created.map(n => ({
          id: n.id,
          name: n.name,
          code: n.code,
          nodeType: n.nodeType
        }))
      })

    } catch (error) {
      console.error('POST /societies/:id/nodes/bulk error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/nodes/:nodeId
// Edit a node
// ─────────────────────────────────────────────
router.patch(
  '/:id/nodes/:nodeId',
  authenticate,
  enforceTenantContext,
  requirePermission('node.update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, nodeId } = req.params
      const { name, code, metadata } = req.body

      // 1. verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // 2. verify node belongs to this org
      const node = await getNodeInOrg(nodeId, id)
      if (!node) return sendNotFound(res, 'node_not_found')

      // 3. if changing code — check duplicate under same parent
      if (code && code !== node.code) {
        const duplicate = await prisma.propertyNode.findFirst({
          where: {
            orgId: id,
            parentId: node.parentId,
            code,
            id: { not: nodeId }
          }
        })
        if (duplicate) {
          return sendError(res, 'duplicate_code', 400, {
            message: `Code '${code}' already exists under this parent`
          })
        }
      }

      // 4. build update object
      const updates: Record<string, unknown> = {}
      if (name) updates.name = name
      if (code) updates.code = code
      if (metadata) updates.metadata = {
        ...(node.metadata as object),
        ...metadata
      }

      if (Object.keys(updates).length === 0) {
        return sendError(res, 'no_fields_provided', 400)
      }

      const updated = await prisma.propertyNode.update({
        where: { id: nodeId },
        data: updates
      })

      return sendSuccess(res, {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        nodeType: updated.nodeType,
        metadata: updated.metadata,
        updatedAt: updated.updatedAt
      })

    } catch (error) {
      console.error('PATCH /societies/:id/nodes/:nodeId error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /api/societies/:id/nodes/:nodeId
// Remove a node — blocked if children, ownership, occupancy exist
// ─────────────────────────────────────────────
router.delete(
  '/:id/nodes/:nodeId',
  authenticate,
  enforceTenantContext,
  requirePermission('node.delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, nodeId } = req.params

      // 1. verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // 2. verify node belongs to this org
      const node = await getNodeInOrg(nodeId, id)
      if (!node) return sendNotFound(res, 'node_not_found')

      // 3. block if node has children
      const childCount = await prisma.propertyNode.count({
        where: { parentId: nodeId, isActive: true }
      })
      if (childCount > 0) {
        return sendError(res, 'has_children', 400, {
          message: `Remove all ${childCount} child nodes first`
        })
      }

      // 4. block if unit has active ownership
      const activeOwnership = await prisma.unitOwnership.findFirst({
        where: { unitId: nodeId, ownedUntil: null }
      })
      if (activeOwnership) {
        return sendError(res, 'has_active_ownership', 400, {
          message: 'Remove ownership record before deleting this unit'
        })
      }

      // 5. block if unit has active occupancy
      const activeOccupancy = await prisma.unitOccupancy.findFirst({
        where: { unitId: nodeId, occupiedUntil: null }
      })
      if (activeOccupancy) {
        return sendError(res, 'has_active_occupancy', 400, {
          message: 'Remove occupancy record before deleting this unit'
        })
      }

      // 6. soft delete — never hard delete
      await prisma.propertyNode.update({
        where: { id: nodeId },
        data: { isActive: false }
      })

      return sendSuccess(res, { message: 'node_deleted' })

    } catch (error) {
      console.error('DELETE /societies/:id/nodes/:nodeId error:', error)
      return sendServerError(res)
    }
  }
)

export default router