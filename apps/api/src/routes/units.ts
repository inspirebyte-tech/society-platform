import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { sendSuccess, sendError, sendNotFound, sendServerError } from '../utils/response'

const router = Router()

// ─────────────────────────────────────────────
// Helper — get personId from userId
// ─────────────────────────────────────────────
const getPersonId = async (userId: string): Promise<string | null> => {
  const person = await prisma.person.findFirst({
    where: { userId }
  })
  return person?.id ?? null
}

// ─────────────────────────────────────────────
// Helper — verify node is a UNIT type
// ─────────────────────────────────────────────
const ASSIGNABLE_TYPES = ['UNIT', 'VILLA', 'FLOOR', 'PLOT'] as const

const verifyUnit = async (nodeId: string, orgId: string) => {
  return prisma.propertyNode.findFirst({
    where: { id: nodeId, orgId, nodeType: { in: [...ASSIGNABLE_TYPES] } }
  })
}

// ─────────────────────────────────────────────
// Helper — verify member belongs to this society
// ─────────────────────────────────────────────
const verifyMember = async (userId: string, orgId: string) => {
  const person = await prisma.person.findFirst({
    where: { userId }
  })
  if (!person) return null

  const membership = await prisma.membership.findFirst({
    where: { userId, orgId, isActive: true }
  })
  if (!membership) return null

  return { person, membership }
}

// ─────────────────────────────────────────────
// GET /societies/:id/units
// List all units with occupancy status
// ─────────────────────────────────────────────
router.get(
  '/:id/units',
  authenticate,
  enforceTenantContext,
  requirePermission('unit.view_all'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { status, tower } = req.query

      // Get all UNIT nodes in this society
      const whereNode: any = { orgId, nodeType: { in: [...ASSIGNABLE_TYPES] } }
      if (tower) {
        // Filter units under a specific tower
        const towerNode = await prisma.propertyNode.findFirst({
          where: { id: tower as string, orgId }
        })
        if (!towerNode) return sendError(res, 'tower_not_found', 404)
      }

      const units = await prisma.propertyNode.findMany({
        where: whereNode,
        include: {
          ownerships: {
            where: { ownedUntil: null },
            include: { person: true },
            orderBy: { isPrimary: 'desc' }
          },
          occupancies: {
            where: { occupiedUntil: null },
            include: { person: true },
            orderBy: { isPrimary: 'desc' }
          },
          parent: {
            include: { parent: true }
          }
        },
        orderBy: { name: 'asc' }
      })

      const formatted = units.map(unit => {
        const isVacant = unit.occupancies.length === 0
        const primaryOwner = unit.ownerships.find(o => o.isPrimary)
        const primaryOccupant = unit.occupancies.find(o => o.isPrimary)

        // Build path
        const path = [
          unit.parent?.parent?.name,
          unit.parent?.name,
        ].filter(Boolean).join(' → ')

        return {
          id: unit.id,
          name: unit.name,
          code: unit.code,
          path: path || null,
          metadata: unit.metadata,
          isVacant,
          primaryOwner: primaryOwner?.person.fullName ?? null,
          primaryOccupant: primaryOccupant?.person.fullName ?? null,
          occupancyType: primaryOccupant?.occupancyType ?? null
        }
      })

      // Apply vacancy filter
      let result = formatted
      if (status === 'vacant') result = formatted.filter(u => u.isVacant)
      if (status === 'occupied') result = formatted.filter(u => !u.isVacant)

      return sendSuccess(res, {
        units: result,
        total: result.length,
        occupied: result.filter(u => !u.isVacant).length,
        vacant: result.filter(u => u.isVacant).length
      })

    } catch (error) {
      console.error('GET /units error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// GET /societies/:id/units/:nodeId
// Get full details of a specific unit
// ─────────────────────────────────────────────
router.get(
  '/:id/units/:nodeId',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, nodeId } = req.params
      const permissions = req.user!.permissions
      const canViewAll = permissions.includes('unit.view_all')
      const canViewOwn = permissions.includes('unit.view_own')

      const unit = await prisma.propertyNode.findFirst({
        where: { id: nodeId, orgId, nodeType: { in: [...ASSIGNABLE_TYPES] } },
        include: {
          ownerships: {
            include: { person: true },
            orderBy: [{ isPrimary: 'desc' }, { ownedFrom: 'asc' }]
          },
          occupancies: {
            include: { person: true },
            orderBy: [{ isPrimary: 'desc' }, { occupiedFrom: 'asc' }]
          },
          parent: {
            include: { parent: true }
          }
        }
      })

      if (!unit) return sendNotFound(res, 'unit_not_found')

      // Residents can only view their own unit
      if (!canViewAll && canViewOwn) {
        const personId = await getPersonId(req.user!.userId)
        const isOwnUnit = unit.occupancies.some(
          o => o.personId === personId && o.occupiedUntil === null
        ) || unit.ownerships.some(
          o => o.personId === personId && o.ownedUntil === null
        )
        if (!isOwnUnit) {
          return sendError(res, 'insufficient_permissions', 403)
        }
      }

      const path = [
        unit.parent?.parent?.name,
        unit.parent?.name,
      ].filter(Boolean).join(' → ')

      const meta = unit.metadata as any ?? {}

      const activeOwnerships = unit.ownerships.filter(o => !o.ownedUntil)
      const activeOccupants = unit.occupancies.filter(o => !o.occupiedUntil)
      const pastOccupants = unit.occupancies.filter(o => o.occupiedUntil)

      return sendSuccess(res, {
        id: unit.id,
        name: unit.name,
        code: unit.code,
        path,
        floor: meta.floorNo ?? null,
        bhk: meta.bhk ?? null,
        area: meta.sqFt ?? null,
        isVacant: activeOccupants.length === 0,
        owners: activeOwnerships.map(o => ({
          id: o.id,
          name: o.person.fullName,
          phone: o.person.phone,
          ownershipType: o.ownershipType,
          isPrimary: o.isPrimary,
          ownedFrom: o.ownedFrom
        })),
        currentOccupants: activeOccupants.map(o => ({
          id: o.id,
          name: o.person.fullName,
          phone: o.person.phone,
          occupancyType: o.occupancyType,
          isPrimary: o.isPrimary,
          occupiedFrom: o.occupiedFrom
        })),
        occupancyHistory: pastOccupants.map(o => ({
          name: o.person.fullName,
          occupancyType: o.occupancyType,
          occupiedFrom: o.occupiedFrom,
          occupiedUntil: o.occupiedUntil
        }))
      })

    } catch (error) {
      console.error('GET /units/:nodeId error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// POST /societies/:id/units/:nodeId/ownership
// Assign ownership of a unit to a member
// ─────────────────────────────────────────────
router.post(
  '/:id/units/:nodeId/ownership',
  authenticate,
  enforceTenantContext,
  requirePermission('unit.assign'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, nodeId } = req.params
      const { userId, ownershipType, isPrimary = false } = req.body

      if (!userId || !ownershipType) {
        return sendError(res, 'missing_field', 400, {
          field: !userId ? 'userId' : 'ownershipType'
        })
      }

      const validTypes = ['PRIMARY_OWNER', 'CO_OWNER']
      if (!validTypes.includes(ownershipType)) {
        return sendError(res, 'invalid_ownership_type', 400)
      }

      // Verify it's a UNIT node
      const unit = await verifyUnit(nodeId, orgId)
      if (!unit) return sendError(res, 'not_a_unit', 400)

      // Verify member belongs to this society
      const memberData = await verifyMember(userId, orgId)
      if (!memberData) return sendNotFound(res, 'member_not_found')

      const { person } = memberData

      // Check if already has primary owner
      if (isPrimary) {
        const existingPrimary = await prisma.unitOwnership.findFirst({
          where: { unitId: nodeId, isPrimary: true, ownedUntil: null }
        })
        if (existingPrimary) {
          return sendError(res, 'already_has_primary', 400, {
            message: 'This unit already has a primary owner. End existing ownership first or use CO_OWNER.'
          })
        }
      }

      // Create ownership record
      const ownership = await prisma.unitOwnership.create({
        data: {
          orgId,
          unitId: nodeId,
          personId: person.id,
          ownershipType,
          isPrimary,
          ownedFrom: new Date()
        }
      })

      return sendSuccess(res, {
        id: ownership.id,
        flatName: unit.name,
        member: {
          name: person.fullName,
          phone: person.phone
        },
        ownershipType: ownership.ownershipType,
        isPrimary: ownership.isPrimary,
        ownedFrom: ownership.ownedFrom
      }, 201)

    } catch (error) {
      console.error('POST /ownership error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /societies/:id/units/:nodeId/ownership/:ownershipId
// End ownership
// ─────────────────────────────────────────────
router.delete(
  '/:id/units/:nodeId/ownership/:ownershipId',
  authenticate,
  enforceTenantContext,
  requirePermission('unit.assign'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, ownershipId } = req.params

      const ownership = await prisma.unitOwnership.findFirst({
        where: { id: ownershipId, orgId }
      })

      if (!ownership) return sendNotFound(res, 'ownership_not_found')
      if (ownership.ownedUntil) return sendError(res, 'already_ended', 400)

      const updated = await prisma.unitOwnership.update({
        where: { id: ownershipId },
        data: { ownedUntil: new Date() }
      })

      return sendSuccess(res, {
        message: 'ownership_ended',
        ownedUntil: updated.ownedUntil
      })

    } catch (error) {
      console.error('DELETE /ownership error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// POST /societies/:id/units/:nodeId/occupancy
// Assign occupancy of a unit to a member
// ─────────────────────────────────────────────
router.post(
  '/:id/units/:nodeId/occupancy',
  authenticate,
  enforceTenantContext,
  requirePermission('unit.assign'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, nodeId } = req.params
      const { userId, occupancyType, isPrimary = false } = req.body

      if (!userId || !occupancyType) {
        return sendError(res, 'missing_field', 400, {
          field: !userId ? 'userId' : 'occupancyType'
        })
      }

      const validTypes = ['OWNER_RESIDENT', 'TENANT', 'FAMILY', 'CARETAKER']
      if (!validTypes.includes(occupancyType)) {
        return sendError(res, 'invalid_occupancy_type', 400)
      }

      // Verify it's a UNIT node
      const unit = await verifyUnit(nodeId, orgId)
      if (!unit) return sendError(res, 'not_a_unit', 400)

      // Verify member belongs to this society
      const memberData = await verifyMember(userId, orgId)
      if (!memberData) return sendNotFound(res, 'member_not_found')

      const { person } = memberData

      // Check if already has primary occupant
      if (isPrimary) {
        const existingPrimary = await prisma.unitOccupancy.findFirst({
          where: { unitId: nodeId, isPrimary: true, occupiedUntil: null }
        })
        if (existingPrimary) {
          return sendError(res, 'already_has_primary', 400, {
            message: 'This unit already has a primary occupant.'
          })
        }
      }

      // Check if member already occupying this unit
      const existingOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          unitId: nodeId,
          personId: person.id,
          occupiedUntil: null
        }
      })
      if (existingOccupancy) {
        return sendError(res, 'already_occupying', 400)
      }

      const occupancy = await prisma.unitOccupancy.create({
        data: {
          unitId: nodeId,
          personId: person.id,
          occupancyType,
          isPrimary,
          occupiedFrom: new Date()
        }
      })

      return sendSuccess(res, {
        id: occupancy.id,
        flatName: unit.name,
        member: {
          name: person.fullName,
          phone: person.phone
        },
        occupancyType: occupancy.occupancyType,
        isPrimary: occupancy.isPrimary,
        occupiedFrom: occupancy.occupiedFrom
      }, 201)

    } catch (error) {
      console.error('POST /occupancy error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /societies/:id/units/:nodeId/occupancy/:occupancyId
// End occupancy
// ─────────────────────────────────────────────
router.delete(
  '/:id/units/:nodeId/occupancy/:occupancyId',
  authenticate,
  enforceTenantContext,
  requirePermission('unit.assign'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, occupancyId } = req.params

      const occupancy = await prisma.unitOccupancy.findFirst({
        where: { id: occupancyId },
        include: {
          unit: true
        }
      })

      if (!occupancy || occupancy.unit.orgId !== orgId) {
        return sendNotFound(res, 'occupancy_not_found')
      }
      if (occupancy.occupiedUntil) {
        return sendError(res, 'already_ended', 400)
      }

      const updated = await prisma.unitOccupancy.update({
        where: { id: occupancyId },
        data: { occupiedUntil: new Date() }
      })

      return sendSuccess(res, {
        message: 'occupancy_ended',
        occupiedUntil: updated.occupiedUntil
      })

    } catch (error) {
      console.error('DELETE /occupancy error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// GET /societies/:id/members/:memberId/units
// Get all units linked to a member (My Home)
// ─────────────────────────────────────────────
router.get(
  '/:id/members/:memberId/units',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, memberId } = req.params
      const permissions = req.user!.permissions
      const canViewAll = permissions.includes('unit.view_all')
      const canViewOwn = permissions.includes('unit.view_own')

      // Get the membership to find the userId
      const membership = await prisma.membership.findFirst({
        where: { id: memberId, orgId, isActive: true }
      })
      if (!membership) return sendNotFound(res, 'member_not_found')

      // Residents can only view their own units
      if (!canViewAll && canViewOwn) {
        if (membership.userId !== req.user!.userId) {
          return sendError(res, 'insufficient_permissions', 403)
        }
      }

      if (!canViewAll && !canViewOwn) {
        return sendError(res, 'insufficient_permissions', 403)
      }

      const person = await prisma.person.findFirst({
        where: { userId: membership.userId }
      })
      if (!person) return sendNotFound(res, 'member_not_found')

      // Get all ownerships
      const ownerships = await prisma.unitOwnership.findMany({
        where: { personId: person.id, ownedUntil: null },
        include: {
          unit: {
            include: {
              parent: { include: { parent: true } },
              ownerships: {
                where: { ownedUntil: null },
                include: { person: true }
              }
            }
          }
        }
      })

      // Get all occupancies
      const occupancies = await prisma.unitOccupancy.findMany({
        where: { personId: person.id, occupiedUntil: null },
        include: {
          unit: {
            include: {
              parent: { include: { parent: true } },
              occupancies: {
                where: { occupiedUntil: null },
                include: { person: true }
              }
            }
          }
        }
      })

      const formatPath = (unit: any) => [
        unit.parent?.parent?.name,
        unit.parent?.name
      ].filter(Boolean).join(' → ')

      return sendSuccess(res, {
        ownerships: ownerships.map(o => ({
          flatId: o.unit.id,
          flatName: o.unit.name,
          path: formatPath(o.unit),
          ownershipType: o.ownershipType,
          isPrimary: o.isPrimary,
          ownedFrom: o.ownedFrom,
          coOwners: o.unit.ownerships
            .filter(ow => ow.personId !== person.id)
            .map(ow => ({
              name: ow.person.fullName,
              ownershipType: ow.ownershipType
            }))
        })),
        occupancies: occupancies.map(o => ({
          flatId: o.unit.id,
          flatName: o.unit.name,
          path: formatPath(o.unit),
          occupancyType: o.occupancyType,
          isPrimary: o.isPrimary,
          occupiedFrom: o.occupiedFrom,
          coOccupants: o.unit.occupancies
            .filter(oc => oc.personId !== person.id)
            .map(oc => ({
              name: oc.person.fullName,
              occupancyType: oc.occupancyType
            }))
        }))
      })

    } catch (error) {
      console.error('GET /members/:id/units error:', error)
      return sendServerError(res)
    }
  }
)

export default router