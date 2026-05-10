import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { sendSuccess, sendError, sendNotFound } from '../utils/response'
import { appEvents, Events } from '../events/emitter'

const router = Router()

// ─────────────────────────────────────────────
// POST /api/societies/:id/visitors/search
// Search existing visitors in this society by name or mobile
// ─────────────────────────────────────────────
router.post(
  '/:id/visitors/search',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { name, mobile } = req.body

      if (!name && !mobile) {
        return sendSuccess(res, { visitors: [], preApprovals: [] })
      }

      // Build visitor where clause
      const visitorWhere: any = { orgId }
      if (name && mobile) {
        visitorWhere.OR = [
          { name: { contains: name, mode: 'insensitive' } },
          { mobile }
        ]
      } else if (name) {
        visitorWhere.name = { contains: name, mode: 'insensitive' }
      } else if (mobile) {
        visitorWhere.mobile = mobile
      }

      // Build pre-approval where clause (only unused ones)
      const preApprovalWhere: any = { orgId, isUsed: false }
      if (name && mobile) {
        preApprovalWhere.OR = [
          { visitorName: { contains: name, mode: 'insensitive' } },
          { visitorMobile: mobile }
        ]
      } else if (name) {
        preApprovalWhere.visitorName = { contains: name, mode: 'insensitive' }
      } else if (mobile) {
        preApprovalWhere.visitorMobile = mobile
      }

      const [visitors, preApprovals] = await Promise.all([
        prisma.visitor.findMany({
          where: visitorWhere,
          include: {
            frequentForUnit: true
          },
          take: 20,
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.visitorPreApproval.findMany({
          where: preApprovalWhere,
          include: {
            unit: true,
            approver: {
              include: { person: true }
            }
          },
          take: 20,
          orderBy: { createdAt: 'desc' }
        })
      ])

      return sendSuccess(res, {
        visitors: visitors.map(v => ({
          id: v.id,
          name: v.name,
          mobile: v.mobile,
          type: v.type,
          photoUrl: v.photoUrl,
          isFrequent: v.isFrequent,
          frequentForUnitId: v.frequentForUnitId,
          frequentFlatName: v.frequentForUnit?.name ?? null
        })),
        preApprovals: preApprovals.map(p => ({
          id: p.id,
          visitorName: p.visitorName,
          visitorMobile: p.visitorMobile,
          unitId: p.unitId,
          flatName: p.unit.name,
          note: p.note,
          approvedByName: p.approver.person?.fullName ?? 'Resident'
        }))
      })
    } catch (error) {
      console.error('POST /visitors/search error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/visitors
// Create new visitor record in this society
// ─────────────────────────────────────────────
router.post(
  '/:id/visitors',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { name, mobile, type, vehicleNo, photoUrl } = req.body

      if (!name || !type) {
        return sendError(res, 'missing_field', 400, {
          field: !name ? 'name' : 'type'
        })
      }

      const validTypes = ['INDIVIDUAL', 'DELIVERY', 'SERVICE', 'DOMESTIC', 'CAB', 'OTHER']
      if (!validTypes.includes(type)) {
        return sendError(res, 'invalid_type', 400)
      }

      const visitor = await prisma.visitor.create({
        data: {
          orgId,
          name,
          mobile: mobile ?? null,
          type,
          vehicleNo: vehicleNo ?? null,
          photoUrl: photoUrl ?? null
        }
      })

      return sendSuccess(res, visitor, 201)
    } catch (error) {
      console.error('POST /visitors error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/visitors/:visitorId/entries
// Create entry for a visitor
// ─────────────────────────────────────────────
router.post(
  '/:id/visitors/:visitorId/entries',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, visitorId } = req.params
      const { unitId, purpose, vehicleNo, photoUrl, preApprovalId } = req.body
      const userId = req.user!.userId

      // Check if visitor exists
      const visitor = await prisma.visitor.findFirst({
        where: { id: visitorId, orgId }
      })

      if (!visitor) {
        return sendNotFound(res, 'visitor_not_found')
      }

      // Update visitor vehicle number if provided
      if (vehicleNo || photoUrl) {
        await prisma.visitor.update({
          where: { id: visitor.id },
          data: {
            vehicleNo: vehicleNo ?? visitor.vehicleNo,
            photoUrl: photoUrl ?? visitor.photoUrl
          }
        })
      }

      // Check unit
      let flatName: string | null = null
      if (unitId) {
        const unit = await prisma.propertyNode.findFirst({
          where: { id: unitId, orgId }
        })
        if (!unit) return sendError(res, 'invalid_unit', 400)
        flatName = unit.name
      }

      const now = new Date()

      // Branch A: Pre-approval
      if (preApprovalId) {
        if (!unitId) return sendError(res, 'unit_required_for_preapproval', 400)

        const preApproval = await prisma.visitorPreApproval.findFirst({
          where: { id: preApprovalId, orgId, unitId, isUsed: false }
        })

        if (!preApproval) {
          return sendError(res, 'invalid_or_used_preapproval', 400)
        }

        // Create entry directly as ALLOWED
        const entry = await prisma.visitorEntry.create({
          data: {
            orgId,
            visitorId,
            unitId,
            flatName,
            purpose: purpose ?? preApproval.note,
            status: 'ALLOWED',
            loggedBy: userId,
            enteredAt: now
          },
          include: { visitor: true, unit: true }
        })

        // Mark pre-approval as used
        await prisma.visitorPreApproval.update({
          where: { id: preApproval.id },
          data: { isUsed: true, usedAt: now }
        })

        // Emit PRE_APPROVAL_USED
        appEvents.emit(Events.VISITOR_PRE_APPROVAL_USED, {
          orgId,
          approvedByUserId: preApproval.approvedBy,
          visitorName: visitor.name,
          entryId: entry.id
        })

        return sendSuccess(res, entry, 201)
      }

      // Branch B: Walk-in
      if (!unitId) {
        // e.g. Delivery for whole society, or someone just entering without flat specified
        const entry = await prisma.visitorEntry.create({
          data: {
            orgId,
            visitorId,
            purpose,
            status: 'PENDING',
            loggedBy: userId,
            notifiedAt: now
          },
          include: { visitor: true }
        })
        return sendSuccess(res, entry, 201)
      }

      // Walk-in to a specific unit - notify active occupants
      const entry = await prisma.visitorEntry.create({
        data: {
          orgId,
          visitorId,
          unitId,
          flatName,
          purpose,
          status: 'PENDING',
          loggedBy: userId,
          notifiedAt: now
        },
        include: { visitor: true, unit: true }
      })

      // Find active occupants
      const occupancies = await prisma.unitOccupancy.findMany({
        where: { unitId, occupiedUntil: null },
        include: { person: { include: { user: true } } }
      })

      const occupantUserIds = occupancies
        .map(o => o.person.user?.id)
        .filter(Boolean) as string[]

      if (occupantUserIds.length > 0) {
        // Emit VISITOR_AT_GATE
        appEvents.emit(Events.VISITOR_AT_GATE, {
          orgId,
          userIds: occupantUserIds,
          visitorName: visitor.name,
          entryId: entry.id
        })
      }

      return sendSuccess(res, entry, 201)

    } catch (error) {
      console.error('POST /visitors/:id/entries error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/entries/active
// All entries where enteredAt is set and exitedAt is null
// NOTE: Must be before /:entryId routes
// ─────────────────────────────────────────────
router.get(
  '/:id/entries/active',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.view_live'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params

      const entries = await prisma.visitorEntry.findMany({
        where: {
          orgId,
          enteredAt: { not: null },
          exitedAt: null
        },
        include: {
          visitor: { select: { name: true, type: true, photoUrl: true } }
        },
        orderBy: { enteredAt: 'desc' }
      })

      return sendSuccess(res, {
        entries: entries.map(e => ({
          id: e.id,
          visitorName: e.visitor.name,
          visitorType: e.visitor.type,
          visitorPhoto: e.visitor.photoUrl,
          flatName: e.flatName,
          status: e.status,
          enteredAt: e.enteredAt
        }))
      })
    } catch (error) {
      console.error('GET /entries/active error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/entries
// Full entry log
// ─────────────────────────────────────────────
router.get(
  '/:id/entries',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { status, unitId, date, type } = req.query
      const userId = req.user!.userId
      const permissions = req.user!.permissions

      const canViewLog = permissions.includes('visitor.view_log')
      const canViewOwn = permissions.includes('visitor.view_own')

      if (!canViewLog && !canViewOwn) {
        return sendError(res, 'insufficient_permissions', 403)
      }

      const where: any = { orgId }

      if (status) where.status = status
      if (type) where.visitor = { type }
      
      if (date) {
        const dateStr = date as string
        const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
        const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)
        where.createdAt = {
          gte: startOfDay,
          lte: endOfDay
        }
      }

      // If user only has view_own, restrict to their active units
      if (!canViewLog) {
        const myOccupancies = await prisma.unitOccupancy.findMany({
          where: {
            person: { userId },
            occupiedUntil: null
          },
          select: { unitId: true }
        })
        const myUnitIds = myOccupancies.map(o => o.unitId)
        
        if (myUnitIds.length === 0) {
          return sendSuccess(res, { entries: [] })
        }

        if (unitId) {
          // If filtering by unit, ensure they have access to it
          if (!myUnitIds.includes(unitId as string)) {
            return sendError(res, 'insufficient_permissions', 403)
          }
          where.unitId = unitId
        } else {
          where.unitId = { in: myUnitIds }
        }
      } else if (unitId) {
        where.unitId = unitId
      }

      const entries = await prisma.visitorEntry.findMany({
        where,
        include: {
          visitor: true,
          logger: { include: { person: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      })

      return sendSuccess(res, {
        entries: entries.map(e => ({
          id: e.id,
          visitorName: e.visitor.name,
          visitorType: e.visitor.type,
          flatName: e.flatName,
          status: e.status,
          loggedByName: e.logger.person?.fullName ?? 'Gatekeeper',
          createdAt: e.createdAt,
          enteredAt: e.enteredAt,
          exitedAt: e.exitedAt
        }))
      })

    } catch (error) {
      console.error('GET /entries error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/approve
// Resident approves visitor
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/approve',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params
      const userId = req.user!.userId

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId },
        include: { visitor: true }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (entry.status !== 'PENDING') return sendError(res, 'entry_not_pending', 400)
      if (!entry.unitId) return sendError(res, 'entry_has_no_unit', 400)

      // Verify user is an active occupant of the unit
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId: entry.unitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: {
          status: 'APPROVED',
          approvedBy: userId,
          respondedAt: new Date()
        }
      })

      // Get resident name for notification
      const resident = await prisma.person.findFirst({
        where: { userId }
      })

      appEvents.emit(Events.VISITOR_APPROVED, {
        orgId,
        loggedByUserId: entry.loggedBy,
        visitorName: entry.visitor.name,
        approvedByName: resident?.fullName ?? 'Resident',
        entryId: entry.id
      })

      return sendSuccess(res, { message: 'visitor_approved', status: updated.status })

    } catch (error) {
      console.error('PATCH /entries/approve error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/reject
// Resident rejects visitor
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/reject',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params
      const userId = req.user!.userId

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId },
        include: { visitor: true }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (entry.status !== 'PENDING') return sendError(res, 'entry_not_pending', 400)
      if (!entry.unitId) return sendError(res, 'entry_has_no_unit', 400)

      // Verify user is an active occupant
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId: entry.unitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: {
          status: 'DENIED',
          approvedBy: userId,
          respondedAt: new Date()
        }
      })

      const resident = await prisma.person.findFirst({
        where: { userId }
      })

      appEvents.emit(Events.VISITOR_DENIED, {
        orgId,
        loggedByUserId: entry.loggedBy,
        visitorName: entry.visitor.name,
        approvedByName: resident?.fullName ?? 'Resident',
        entryId: entry.id
      })

      return sendSuccess(res, { message: 'visitor_denied', status: updated.status })

    } catch (error) {
      console.error('PATCH /entries/reject error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/allow
// Gatekeeper manually allows entry
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/allow',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (!['PENDING', 'APPROVED'].includes(entry.status)) {
        return sendError(res, 'invalid_status_for_allow', 400)
      }

      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: { status: 'ALLOWED' }
      })

      return sendSuccess(res, { message: 'visitor_allowed', status: updated.status })

    } catch (error) {
      console.error('PATCH /entries/allow error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/turnaway
// Gatekeeper turns visitor away
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/turnaway',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (!['PENDING', 'DENIED'].includes(entry.status)) {
        return sendError(res, 'invalid_status_for_turnaway', 400)
      }

      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: { status: 'TURNED_AWAY' }
      })

      return sendSuccess(res, { message: 'visitor_turned_away', status: updated.status })

    } catch (error) {
      console.error('PATCH /entries/turnaway error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/enter
// Mark visitor as physically entered
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/enter',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (!['ALLOWED', 'APPROVED'].includes(entry.status)) {
        return sendError(res, 'entry_must_be_allowed_or_approved', 400)
      }

      const now = new Date()
      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: { enteredAt: now }
      })

      return sendSuccess(res, { message: 'visitor_entered', enteredAt: updated.enteredAt })

    } catch (error) {
      console.error('PATCH /entries/enter error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/entries/:entryId/exit
// Mark visitor as exited
// ─────────────────────────────────────────────
router.patch(
  '/:id/entries/:entryId/exit',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.log'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, entryId } = req.params

      const entry = await prisma.visitorEntry.findFirst({
        where: { id: entryId, orgId }
      })

      if (!entry) return sendNotFound(res, 'entry_not_found')
      if (!entry.enteredAt) {
        return sendError(res, 'visitor_has_not_entered', 400)
      }

      const now = new Date()
      const updated = await prisma.visitorEntry.update({
        where: { id: entry.id },
        data: {
          exitedAt: now,
          status: 'EXITED'
        }
      })

      return sendSuccess(res, { message: 'visitor_exited', exitedAt: updated.exitedAt })

    } catch (error) {
      console.error('PATCH /entries/exit error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/pre-approvals
// Create pre-approval
// ─────────────────────────────────────────────
router.post(
  '/:id/pre-approvals',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.pre_approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { visitorName, visitorMobile, unitId, note, expiresAt } = req.body
      const userId = req.user!.userId

      if (!visitorName || !unitId) {
        return sendError(res, 'missing_field', 400)
      }

      // Verify user is active occupant
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      const preApproval = await prisma.visitorPreApproval.create({
        data: {
          orgId,
          visitorName,
          visitorMobile: visitorMobile ?? null,
          unitId,
          approvedBy: userId,
          note: note ?? null,
          expiresAt: expiresAt ? new Date(expiresAt) : null
        }
      })

      return sendSuccess(res, preApproval, 201)

    } catch (error) {
      console.error('POST /pre-approvals error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/pre-approvals
// List my pre-approvals
// ─────────────────────────────────────────────
router.get(
  '/:id/pre-approvals',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.pre_approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const userId = req.user!.userId

      // Get units where user is active occupant
      const myOccupancies = await prisma.unitOccupancy.findMany({
        where: {
          person: { userId },
          occupiedUntil: null
        },
        select: { unitId: true }
      })
      
      const myUnitIds = myOccupancies.map(o => o.unitId)

      if (myUnitIds.length === 0) {
        return sendSuccess(res, { preApprovals: [] })
      }

      const preApprovals = await prisma.visitorPreApproval.findMany({
        where: {
          orgId,
          unitId: { in: myUnitIds }
        },
        include: { unit: true },
        orderBy: { createdAt: 'desc' }
      })

      return sendSuccess(res, {
        preApprovals: preApprovals.map(p => ({
          ...p,
          flatName: p.unit.name
        }))
      })

    } catch (error) {
      console.error('GET /pre-approvals error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /api/societies/:id/pre-approvals/:approvalId
// Cancel pre-approval
// ─────────────────────────────────────────────
router.delete(
  '/:id/pre-approvals/:approvalId',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.pre_approve'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, approvalId } = req.params
      const userId = req.user!.userId

      const preApproval = await prisma.visitorPreApproval.findFirst({
        where: { id: approvalId, orgId }
      })

      if (!preApproval) return sendNotFound(res, 'pre_approval_not_found')
      if (preApproval.isUsed) return sendError(res, 'pre_approval_already_used', 400)

      // Verify user is active occupant of the unit
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId: preApproval.unitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      await prisma.visitorPreApproval.delete({
        where: { id: approvalId }
      })

      return sendSuccess(res, { message: 'pre_approval_cancelled' })

    } catch (error) {
      console.error('DELETE /pre-approvals/:id error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// POST /api/societies/:id/visitors/:visitorId/frequent
// Mark visitor as frequent
// ─────────────────────────────────────────────
router.post(
  '/:id/visitors/:visitorId/frequent',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.mark_frequent'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, visitorId } = req.params
      const { unitId } = req.body
      const userId = req.user!.userId

      if (!unitId) return sendError(res, 'missing_unitId', 400)

      const visitor = await prisma.visitor.findFirst({
        where: { id: visitorId, orgId }
      })

      if (!visitor) return sendNotFound(res, 'visitor_not_found')

      // Verify user is active occupant
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      await prisma.visitor.update({
        where: { id: visitor.id },
        data: {
          isFrequent: true,
          frequentForUnitId: unitId,
          frequentApprovedBy: userId
        }
      })

      return sendSuccess(res, { message: 'marked_frequent' })

    } catch (error) {
      console.error('POST /visitors/:id/frequent error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /api/societies/:id/visitors/:visitorId/frequent
// Remove frequent status
// ─────────────────────────────────────────────
router.delete(
  '/:id/visitors/:visitorId/frequent',
  authenticate,
  enforceTenantContext,
  requirePermission('visitor.mark_frequent'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, visitorId } = req.params
      const userId = req.user!.userId

      const visitor = await prisma.visitor.findFirst({
        where: { id: visitorId, orgId }
      })

      if (!visitor) return sendNotFound(res, 'visitor_not_found')
      if (!visitor.frequentForUnitId) return sendError(res, 'visitor_not_frequent', 400)

      // Verify user is active occupant of the frequent unit
      const isOccupant = await prisma.unitOccupancy.findFirst({
        where: {
          unitId: visitor.frequentForUnitId,
          person: { userId },
          occupiedUntil: null
        }
      })

      if (!isOccupant) return sendError(res, 'not_an_occupant', 403)

      await prisma.visitor.update({
        where: { id: visitor.id },
        data: {
          isFrequent: false,
          frequentForUnitId: null,
          frequentApprovedBy: null
        }
      })

      return sendSuccess(res, { message: 'frequent_removed' })

    } catch (error) {
      console.error('DELETE /visitors/:id/frequent error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

export default router
