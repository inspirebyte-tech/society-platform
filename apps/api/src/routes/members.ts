import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { prisma } from '../lib/prisma'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendServerError
} from '../utils/response'
import { validatePhone, normalizePhone } from '../utils/validate'

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
          photoUrl:      m.user.person?.photoUrl ?? null,
          role:          m.role.name,
          unit:          occupancy?.unit.name || null,
          unitId:        occupancy?.unit.id || null,
          occupancyType: occupancy?.occupancyType || null,
          joinedAt:      m.joinedAt,
          isActive:      m.isActive
        }

        const isResidentRole = ['Resident', 'Co-resident'].includes(m.role.name)
        if (m.isActive && !occupancy && isResidentRole) {
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
        photoUrl:      membership.user.person?.photoUrl ?? null,
        role:          membership.role.name,
        unit:          currentOccupancy?.unit.name || null,
        unitId:        currentOccupancy?.unit.id || null,
        occupancyType: currentOccupancy?.occupancyType || null,
        isPrimary:     currentOccupancy?.isPrimary || null,
        occupancyId:   currentOccupancy?.id ?? null,
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
// POST /api/societies/:id/members/direct-add
// Admin/Builder directly adds a member without SMS invite
// Creates User + Person if phone not in system
// Optionally assigns unit occupancy in same transaction
// ─────────────────────────────────────────────
router.post(
  '/:id/members/direct-add',
  authenticate,
  enforceTenantContext,
  requirePermission('member.remove'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.params.id as string
      const { name, phone, role, unitId, occupancyType } = req.body

      // 1. Validate required fields
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        return sendError(res, 'invalid_name', 400, {
          message: 'Name must be at least 2 characters'
        })
      }
      if (!phone || typeof phone !== 'string') {
        return sendError(res, 'invalid_phone', 400, {
          message: 'Phone number is required'
        })
      }
      if (!role || typeof role !== 'string') {
        return sendError(res, 'invalid_role', 400, {
          message: 'Role is required'
        })
      }

      // 2. Normalize and validate phone
      const normalizedPhone = normalizePhone(phone)
      const phoneValidation = validatePhone(normalizedPhone)
      if (!phoneValidation.valid) {
        return sendError(res, 'invalid_phone', 400, {
          message: 'Invalid phone number format'
        })
      }

      // 3. Role permission check
      const callerMembership = await prisma.membership.findFirst({
        where: { userId: req.user!.userId, orgId, isActive: true },
        include: { role: true }
      })
      const callerRole = callerMembership?.role.name
      const allowedRolesForAdmin = ['Resident', 'Co-resident', 'Gatekeeper']
      const allowedRolesForBuilder = ['Admin', 'Resident', 'Co-resident', 'Gatekeeper']

      if (callerRole === 'Admin' && !allowedRolesForAdmin.includes(role)) {
        return sendError(res, 'role_not_allowed', 403, {
          message: 'Admin can only add Resident, Co-resident, or Gatekeeper'
        })
      }
      if (callerRole === 'Builder' && !allowedRolesForBuilder.includes(role)) {
        return sendError(res, 'role_not_allowed', 403, {
          message: 'Invalid role'
        })
      }

      // 4. Find role record (org-specific first, then system roles with orgId: null)
      const roleRecord = await prisma.role.findFirst({
        where: {
          name: role,
          OR: [{ orgId: orgId }, { orgId: null }]
        }
      })
      if (!roleRecord) {
        return sendError(res, 'invalid_role', 400, {
          message: 'Role not found'
        })
      }

      // 5. Check if user with this phone already exists
      const existingUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        include: {
          memberships: {
            where: { orgId },
            include: { role: true }
          },
          person: true
        }
      })

      if (existingUser) {
        const existingMembership = existingUser.memberships[0]
        if (existingMembership) {
          if (existingMembership.isActive) {
            return sendError(res, 'already_member', 409, {
              message: 'This person is already an active member'
            })
          } else {
            return sendError(res, 'inactive_member', 409, {
              message: 'This person was previously a member',
              memberId: existingMembership.id
            })
          }
        }
      }

      // 6. Validate unit if provided
      if (unitId) {
        if (!occupancyType) {
          return sendError(res, 'missing_field', 400, {
            message: 'Occupancy type required when unit is selected'
          })
        }
        const unit = await prisma.propertyNode.findFirst({
          where: { id: unitId as string, orgId, nodeType: { in: ['UNIT', 'VILLA', 'FLOOR', 'PLOT'] } }
        })
        if (!unit) {
          return sendError(res, 'unit_not_found', 404, {
            message: 'Unit not found'
          })
        }
      }

      // 7. All in one transaction
      const result = await prisma.$transaction(async (tx) => {
        let userId: string
        let personId: string

        if (existingUser) {
          userId = existingUser.id
          personId = existingUser.person!.id
          await tx.person.update({
            where: { id: personId },
            data: { fullName: name.trim() }
          })
        } else {
          const newUser = await tx.user.create({
            data: {
              phone: normalizedPhone,
              tokenVersion: 0,
              person: {
                create: {
                  fullName: name.trim(),
                  phone: normalizedPhone,
                }
              }
            },
            include: { person: true }
          })
          userId = newUser.id
          personId = newUser.person!.id
        }

        const membership = await tx.membership.create({
          data: {
            userId,
            orgId,
            roleId: roleRecord.id,
            isActive: true,
            invitedBy: req.user!.userId,
          }
        })

        if (unitId && occupancyType) {
          const existingPrimary = await tx.unitOccupancy.findFirst({
            where: {
              unitId: unitId as string,
              isPrimary: true,
              occupiedUntil: null
            }
          })
          await tx.unitOccupancy.create({
            data: {
              unitId: unitId as string,
              personId,
              occupancyType: occupancyType as any,
              isPrimary: !existingPrimary,
              occupiedFrom: new Date(),
            }
          })
        }

        await tx.auditLog.create({
          data: {
            orgId,
            tableName: 'memberships',
            recordId: membership.id,
            action: 'direct_add',
            actorId: req.user!.userId,
            newData: {
              addedPhone: normalizedPhone,
              addedName: name.trim(),
              role,
              unitId: unitId ?? null
            }
          }
        })

        return membership
      })

      return sendCreated(res, {
        memberId: result.id,
        message: 'Member added successfully'
      })

    } catch (error) {
      console.error('direct-add error:', error)
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
          // Block if no Builder remains — society would be unmanageable
          const activeBuilderCount = await prisma.membership.count({
            where: {
              orgId: id,
              isActive: true,
              role: { name: 'Builder' }
            }
          })

          if (activeBuilderCount === 0) {
            return sendError(res, 'last_admin_no_builder', 400, {
              message: 'Cannot deactivate the last Admin when no Builder exists in the society.'
            })
          }

          // Builder exists — allow but warn
          await prisma.$transaction([
            prisma.membership.update({
              where: { id: memberId },
              data: { isActive: false }
            }),
            prisma.auditLog.create({
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
          ])

          return sendSuccess(res, {
            message: 'member_deactivated',
            warning: 'This was the only active Admin. Builder still has access.'
          })
        }
      }

      // deactivate
      await prisma.$transaction([
        prisma.membership.update({
          where: { id: memberId },
          data: { isActive: false }
        }),
        prisma.auditLog.create({
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
      ])

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

      // deactivate membership + end occupancy + audit in one transaction
      await prisma.$transaction([
        prisma.membership.update({
          where: { id: memberId },
          data: { isActive: false }
        }),
        prisma.unitOccupancy.update({
          where: { id: activeOccupancy.id },
          data: { occupiedUntil: today }
        }),
        prisma.auditLog.create({
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
      ])

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

      // check if their previous unit may need review (read before transaction)
      const previousOccupancy = await prisma.unitOccupancy.findFirst({
        where: {
          person: { userId: membership.userId },
          occupiedUntil: { not: null }
        },
        orderBy: { occupiedUntil: 'desc' }
      })

      // reactivate + audit in one transaction
      await prisma.$transaction([
        prisma.membership.update({
          where: { id: memberId },
          data: { isActive: true }
        }),
        prisma.auditLog.create({
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
      ])

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