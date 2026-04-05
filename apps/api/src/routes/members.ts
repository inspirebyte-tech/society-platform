import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { prisma } from '../lib/prisma'
import {
  sendSuccess,
  sendError,
  sendNotFound,
  sendServerError
} from '../utils/response'

const router = Router()

// ─────────────────────────────────────────────
// GET /api/societies/:id/members
// List all members of a society
// Admin and Builder only — residents cannot see member list
// DPDP Act 2023 compliance
// ─────────────────────────────────────────────
router.get(
  '/:id/members',
  authenticate,
  enforceTenantContext,
  requirePermission('member.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { status = 'active', role } = req.query

      // validate status query param
      const validStatuses = ['active', 'inactive', 'all']
      if (!validStatuses.includes(status as string)) {
        return sendError(res, 'invalid_status', 400, {
          allowed: validStatuses
        })
      }

      // build membership filter
      const membershipWhere: Record<string, unknown> = { orgId: id }

      if (status === 'active') membershipWhere.isActive = true
      if (status === 'inactive') membershipWhere.isActive = false

      // fetch all memberships with person, role, occupancy
      const memberships = await prisma.membership.findMany({
        where: membershipWhere,
        include: {
          user: {
            include: {
              person: true
            }
          },
          role: {
            select: { name: true }
          }
        },
        orderBy: { joinedAt: 'asc' }
      })

      // filter by role if provided
      const filtered = role
        ? memberships.filter(m =>
            m.role.name.toLowerCase() === (role as string).toLowerCase()
          )
        : memberships

      // for each member get their current unit occupancy
      const memberIds = filtered.map(m => m.userId)

      const occupancies = await prisma.unitOccupancy.findMany({
        where: {
          occupiedUntil: null,
          person: {
            userId: { in: memberIds }
          }
        },
        include: {
          unit: {
            select: { id: true, name: true, code: true }
          },
          person: {
            select: { userId: true }
          }
        }
      })

      // map userId → occupancy for quick lookup
      const occupancyMap = Object.fromEntries(
        occupancies.map(o => [o.person.userId, o])
      )

      // separate active members with unit vs without unit
      const active: unknown[] = []
      const pendingSetup: unknown[] = []

      for (const m of filtered) {
        if (!m.isActive && status !== 'inactive' && status !== 'all') continue

        const occupancy = occupancyMap[m.userId]
        const memberData = {
          membershipId:  m.id,
          userId:        m.userId,
          name:          m.user.person?.fullName || 'Unknown',
          phone:         m.user.phone,
          role:          m.role.name,
          unit:          occupancy?.unit.name || null,
          unitId:        occupancy?.unit.id || null,
          occupancyType: occupancy?.occupancyType || null,
          joinedAt:      m.joinedAt,
          isActive:      m.isActive
        }

        if (m.isActive && !occupancy) {
          pendingSetup.push(memberData)
        } else {
          active.push(memberData)
        }
      }

      return sendSuccess(res, { active, pendingSetup })

    } catch (error) {
      console.error('GET /societies/:id/members error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/members/:memberId
// Get full details of one member
// ─────────────────────────────────────────────
router.get(
  '/:id/members/:memberId',
  authenticate,
  enforceTenantContext,
  requirePermission('member.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, memberId } = req.params

      // find membership
      const membership = await prisma.membership.findFirst({
        where: { id: memberId, orgId: id },
        include: {
          user: {
            include: { person: true }
          },
          role: {
            select: { name: true }
          }
        }
      })

      if (!membership) {
        return sendNotFound(res, 'member_not_found')
      }

      // get current occupancy
      const currentOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          occupiedUntil: null,
          person: { userId: membership.userId }
        },
        include: {
          unit: {
            select: { id: true, name: true, code: true }
          }
        }
      })

      // get full occupancy history
      const occupancyHistory = await prisma.unitOccupancy.findMany({
        where: {
          person: { userId: membership.userId }
        },
        include: {
          unit: {
            select: { name: true }
          }
        },
        orderBy: { occupiedFrom: 'desc' }
      })

      // get inviter name if invited
      let invitedByName: string | null = null
      if (membership.invitedBy) {
        const inviter = await prisma.person.findFirst({
          where: { userId: membership.invitedBy },
          select: { fullName: true }
        })
        invitedByName = inviter?.fullName || null
      }

      return sendSuccess(res, {
        membershipId:  membership.id,
        userId:        membership.userId,
        name:          membership.user.person?.fullName || 'Unknown',
        phone:         membership.user.phone,
        role:          membership.role.name,
        unit:          currentOccupancy?.unit.name || null,
        unitId:        currentOccupancy?.unit.id || null,
        occupancyType: currentOccupancy?.occupancyType || null,
        isPrimary:     currentOccupancy?.isPrimary || null,
        joinedAt:      membership.joinedAt,
        invitedBy:     invitedByName,
        isActive:      membership.isActive,
        occupancyHistory: occupancyHistory.map(o => ({
          unitName: o.unit.name,
          from:     o.occupiedFrom,
          until:    o.occupiedUntil,
          type:     o.occupancyType
        }))
      })

    } catch (error) {
      console.error('GET /societies/:id/members/:memberId error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/members/:memberId/deactivate
// Remove app access only — membership.isActive = false
// Occupancy and ownership preserved
// ─────────────────────────────────────────────
router.patch(
  '/:id/members/:memberId/deactivate',
  authenticate,
  enforceTenantContext,
  requirePermission('member.remove'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, memberId } = req.params

      // find membership
      const membership = await prisma.membership.findFirst({
        where: { id: memberId, orgId: id },
        include: {
          role: { select: { name: true } }
        }
      })

      if (!membership) {
        return sendNotFound(res, 'member_not_found')
      }

      // cannot deactivate yourself
      if (membership.userId === req.user!.userId) {
        return sendError(res, 'cannot_deactivate_self', 400, {
          message: 'You cannot remove your own access'
        })
      }

      // admin cannot deactivate builder
      const actorMembership = await prisma.membership.findFirst({
        where: { userId: req.user!.userId, orgId: id, isActive: true },
        include: { role: { select: { name: true } } }
      })

      if (
        membership.role.name === 'Builder' &&
        actorMembership?.role.name !== 'Builder'
      ) {
        return sendError(res, 'cannot_deactivate_builder', 400, {
          message: 'Only a Builder can deactivate another Builder'
        })
      }

      // check if already inactive
      if (!membership.isActive) {
        return sendError(res, 'already_inactive', 400, {
          message: 'This member is already deactivated'
        })
      }

      // check if only active admin
      if (membership.role.name === 'Admin') {
        const activeAdminCount = await prisma.membership.count({
          where: {
            orgId: id,
            isActive: true,
            role: { name: 'Admin' }
          }
        })
        if (activeAdminCount === 1) {
          // allow but warn — builder still has access
          await prisma.membership.update({
            where: { id: memberId },
            data: { isActive: false }
          })

          // audit log
          await prisma.auditLog.create({
            data: {
              orgId:     id,
              tableName: 'memberships',
              recordId:  memberId,
              action:    'deactivate',
              actorId:   req.user!.userId,
              oldData:   { isActive: true },
              newData:   { isActive: false }
            }
          })

          return sendSuccess(res, {
            message: 'member_deactivated',
            warning: 'This was the only active Admin. Builder still has access.'
          })
        }
      }

      // deactivate
      await prisma.membership.update({
        where: { id: memberId },
        data: { isActive: false }
      })

      // audit log
      await prisma.auditLog.create({
        data: {
          orgId:     id,
          tableName: 'memberships',
          recordId:  memberId,
          action:    'deactivate',
          actorId:   req.user!.userId,
          oldData:   { isActive: true },
          newData:   { isActive: false }
        }
      })

      return sendSuccess(res, { message: 'member_deactivated' })

    } catch (error) {
      console.error('PATCH /members/:memberId/deactivate error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/members/:memberId/moveout
// Remove access AND end occupancy
// membership.isActive = false + occupiedUntil = today
// Ownership NOT affected
// ─────────────────────────────────────────────
router.patch(
  '/:id/members/:memberId/moveout',
  authenticate,
  enforceTenantContext,
  requirePermission('member.remove'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, memberId } = req.params

      // find membership
      const membership = await prisma.membership.findFirst({
        where: { id: memberId, orgId: id },
        include: {
          role: { select: { name: true } }
        }
      })

      if (!membership) {
        return sendNotFound(res, 'member_not_found')
      }

      // cannot moveout yourself
      if (membership.userId === req.user!.userId) {
        return sendError(res, 'cannot_deactivate_self', 400, {
          message: 'You cannot mark yourself as moved out'
        })
      }

      // admin cannot moveout builder
      const actorMembership = await prisma.membership.findFirst({
        where: { userId: req.user!.userId, orgId: id, isActive: true },
        include: { role: { select: { name: true } } }
      })

      if (
        membership.role.name === 'Builder' &&
        actorMembership?.role.name !== 'Builder'
      ) {
        return sendError(res, 'cannot_deactivate_builder', 400, {
          message: 'Only a Builder can remove another Builder'
        })
      }

      // find active occupancy for this member
      const activeOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          occupiedUntil: null,
          person: { userId: membership.userId }
        }
      })

      if (!activeOccupancy) {
        return sendError(res, 'no_active_occupancy', 400, {
          message: 'This member has no active occupancy to end'
        })
      }

      const today = new Date()

      // deactivate membership + end occupancy in transaction
      await prisma.$transaction([
        prisma.membership.update({
          where: { id: memberId },
          data: { isActive: false }
        }),
        prisma.unitOccupancy.update({
          where: { id: activeOccupancy.id },
          data: { occupiedUntil: today }
        })
      ])

      // audit log
      await prisma.auditLog.create({
        data: {
          orgId:     id,
          tableName: 'memberships',
          recordId:  memberId,
          action:    'moveout',
          actorId:   req.user!.userId,
          oldData:   { isActive: true, occupiedUntil: null },
          newData:   { isActive: false, occupiedUntil: today }
        }
      })

      return sendSuccess(res, { message: 'member_moved_out' })

    } catch (error) {
      console.error('PATCH /members/:memberId/moveout error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/members/:memberId/reactivate
// Restore app access — membership.isActive = true
// Builder only — Admin cannot reactivate
// ─────────────────────────────────────────────
router.patch(
  '/:id/members/:memberId/reactivate',
  authenticate,
  enforceTenantContext,
  requirePermission('member.reactivate'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, memberId } = req.params

      // find membership
      const membership = await prisma.membership.findFirst({
        where: { id: memberId, orgId: id },
        include: {
          role: { select: { name: true } }
        }
      })

      if (!membership) {
        return sendNotFound(res, 'member_not_found')
      }

      // already active
      if (membership.isActive) {
        return sendError(res, 'already_active', 400, {
          message: 'This member is already active'
        })
      }

      // reactivate
      await prisma.membership.update({
        where: { id: memberId },
        data: { isActive: true }
      })

      // check if their previous unit is still available
      const previousOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          person: { userId: membership.userId },
          occupiedUntil: { not: null }
        },
        orderBy: { occupiedUntil: 'desc' }
      })

      // audit log
      await prisma.auditLog.create({
        data: {
          orgId:     id,
          tableName: 'memberships',
          recordId:  memberId,
          action:    'reactivate',
          actorId:   req.user!.userId,
          oldData:   { isActive: false },
          newData:   { isActive: true }
        }
      })

      // warn if they had a unit that is now potentially occupied
      const warning = previousOccupancy
        ? 'Member reactivated. Unit assignment may need review.'
        : null

      return sendSuccess(res, {
        message: 'member_reactivated',
        ...(warning && { warning })
      })

    } catch (error) {
      console.error('PATCH /members/:memberId/reactivate error:', error)
      return sendServerError(res)
    }
  }
)

export default router