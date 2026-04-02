import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { prisma } from '../lib/prisma'
import { validatePhone, validateRequired, normalizePhone } from '../utils/validate'
import { sendOtp } from '../utils/sms'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendServerError
} from '../utils/response'

const router = Router()

// ─────────────────────────────────────────────
// POST /api/societies/:id/invitations
// Invite someone to the society
// ─────────────────────────────────────────────
router.post(
  '/:id/invitations',
  authenticate,
  requirePermission('invitation.create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { phone, roleId } = req.body

      // 1. validate required fields
      const validation = validateRequired(
        { phone, roleId },
        ['phone', 'roleId']
      )
      if (!validation.valid) {
        return sendError(res, validation.error!, 400, {
          field: validation.field
        })
      }

      // 2. validate phone format
      const phoneValidation = validatePhone(phone)
      if (!phoneValidation.valid) {
        return sendError(res, phoneValidation.error!, 400, {
          field: phoneValidation.field
        })
      }

      const normalizedPhone = normalizePhone(phone)

      // 3. verify membership — inviter must be member
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // 4. validate roleId exists and is accessible
      const role = await prisma.role.findFirst({
        where: {
          id: roleId,
          OR: [
            { orgId: id },        // custom role for this org
            { orgId: null }       // system role
          ]
        }
      })
      if (!role) {
        return sendError(res, 'invalid_role', 400, {
          message: 'Role does not exist or is not accessible in this society'
        })
      }

      // 5. check if phone already has active membership
      const existingUser = await prisma.user.findUnique({
        where: { phone: normalizedPhone },
        include: {
          memberships: {
            where: { orgId: id, isActive: true }
          }
        }
      })
      if (existingUser?.memberships.length > 0) {
        return sendError(res, 'already_member', 400, {
          message: 'This person already has access to this society'
        })
      }

      // 6. check for pending invitation
      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          phone: normalizedPhone,
          orgId: id,
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        }
      })
      if (existingInvitation) {
        return sendError(res, 'invitation_exists', 400, {
          message: 'A pending invitation already exists for this phone number'
        })
      }

      // 7. create invitation — expires in 7 days
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const invitation = await prisma.invitation.create({
        data: {
          orgId: id,
          phone: normalizedPhone,
          roleId,
          invitedBy: req.user!.userId,
          expiresAt
        },
        include: {
          role: {
            select: { name: true }
          }
        }
      })

      // 8. send SMS notification
      await sendOtp(
        normalizedPhone,
        `You have been invited to join ${membership ? 'a society' : 'a society'} on Society Platform. Download the app and register with this number to join.`
      )

      return sendCreated(res, {
        id: invitation.id,
        phone: invitation.phone,
        role: invitation.role.name,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      })

    } catch (error) {
      console.error('POST /societies/:id/invitations error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/invitations
// List pending invitations
// ─────────────────────────────────────────────
router.get(
  '/:id/invitations',
  authenticate,
  requirePermission('invitation.view'),
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

      // fetch pending invitations only
      const invitations = await prisma.invitation.findMany({
        where: {
          orgId: id,
          acceptedAt: null,
          expiresAt: { gt: new Date() }
        },
        include: {
          role: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // get inviter names
      const inviterIds = [...new Set(invitations.map(i => i.invitedBy))]
      const inviters = await prisma.person.findMany({
        where: { userId: { in: inviterIds } },
        select: { userId: true, fullName: true }
      })
      const inviterMap = Object.fromEntries(
        inviters.map(p => [p.userId, p.fullName])
      )

      return sendSuccess(res, invitations.map(inv => ({
        id: inv.id,
        phone: inv.phone,
        role: inv.role.name,
        invitedBy: inviterMap[inv.invitedBy] || 'Unknown',
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      })))

    } catch (error) {
      console.error('GET /societies/:id/invitations error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /api/societies/:id/invitations/:invitationId
// Cancel a pending invitation
// ─────────────────────────────────────────────
router.delete(
  '/:id/invitations/:invitationId',
  authenticate,
  requirePermission('invitation.cancel'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, invitationId } = req.params

      // verify membership
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })
      if (!membership) return sendNotFound(res, 'society_not_found')

      // find invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          id: invitationId,
          orgId: id
        }
      })
      if (!invitation) return sendNotFound(res, 'invitation_not_found')

      // block if already accepted
      if (invitation.acceptedAt) {
        return sendError(res, 'already_accepted', 400, {
          message: 'Cannot cancel an invitation that has already been accepted'
        })
      }

      // delete the invitation
      await prisma.invitation.delete({
        where: { id: invitationId }
      })

      return sendSuccess(res, { message: 'invitation_cancelled' })

    } catch (error) {
      console.error('DELETE /societies/:id/invitations error:', error)
      return sendServerError(res)
    }
  }
)

export default router