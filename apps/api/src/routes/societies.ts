import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { prisma } from '../lib/prisma'
import { enforceTenantContext } from '../middleware/tenantContext'
import { validateRequired } from '../utils/validate'
import { uploadImage } from '../utils/cloudinary'
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendServerError
} from '../utils/response'

const router = Router()

const VALID_TYPES = ['APARTMENT', 'VILLA', 'MIXED', 'PLOTTED']

// ─────────────────────────────────────────────
// POST /api/societies
// Create a new society
// Special: authenticate only — no orgId exists yet
// ─────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, address, city, state, pincode, type } = req.body

    // 1. Validate required fields
    const validation = validateRequired(
      { name, address, city, state, pincode, type },
      ['name', 'address', 'city', 'state', 'pincode', 'type']
    )
    if (!validation.valid) {
      return sendError(res, validation.error!, 400, {
        field: validation.field
      })
    }

    // 2. Validate lengths and formats
    if (name.length > 100) return sendError(res, 'name_too_long', 400, { max: 100 })
    if (address.length > 200) return sendError(res, 'address_too_long', 400, { max: 200 })
    if (city.length > 100) return sendError(res, 'city_too_long', 400, { max: 100 })
    if (state.length > 100) return sendError(res, 'state_too_long', 400, { max: 100 })
    if (!/^\d{6}$/.test(pincode)) return sendError(res, 'invalid_pincode', 400, { message: 'Pincode must be exactly 6 digits' })

    // 3. Validate type enum
    if (!VALID_TYPES.includes(type)) {
      return sendError(res, 'invalid_type', 400, {
        allowed: VALID_TYPES
      })
    }

    // 3. Create org + root node + membership in one transaction
    // If any step fails — all roll back
    const org = await prisma.$transaction(async (tx) => {
      const society = await tx.organization.create({
        data: {
          name,
          address,
          city,
          state,
          pincode,
          type
        }
      })

      await tx.propertyNode.create({
        data: {
          orgId: society.id,
          nodeType: 'SOCIETY',
          name: name,
          code: name.substring(0, 3).toUpperCase(),
          parentId: null
        }
      })

      await tx.membership.create({
        data: {
          userId: req.user!.userId,
          orgId: society.id,
          roleId: 'role-builder'
        }
      })

      return society
    })

    // 4. Return only society details
    return sendCreated(res, {
      id: org.id,
      name: org.name,
      address: org.address,
      city: org.city,
      state: org.state,
      pincode: org.pincode,
      type: org.type,
      createdAt: org.createdAt
    })

  } catch (error) {
    console.error('POST /societies error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// GET /api/societies
// List all societies for current user
// Special: ignores orgId in token
// Queries ALL memberships for this user
// ─────────────────────────────────────────────
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: req.user!.userId,
        isActive: true
      },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            city: true,
            type: true,
            createdAt: true,
            _count: {
              select: {
                propertyNodes: {
                  where: { nodeType: 'UNIT' }
                }
              }
            }
          }
        },
        role: {
          select: { name: true }
        }
      }
    })

    const societies = memberships.map(m => ({
      id: m.org.id,
      name: m.org.name,
      city: m.org.city,
      type: m.org.type,
      role: m.role.name,
      totalUnits: m.org._count.propertyNodes,
      createdAt: m.org.createdAt
    }))

    return sendSuccess(res, societies)

  } catch (error) {
    console.error('GET /societies error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// GET /api/societies/:id
// Get one society details
// ─────────────────────────────────────────────
router.get('/:id', authenticate, enforceTenantContext, requirePermission('society.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params

      // verify society exists AND user is a member
      const membership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        }
      })

      if (!membership) {
        return sendNotFound(res, 'society_not_found')
      }

      const org = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          type: true,
          photoUrl: true,
          isActive: true,
          createdAt: true,
          settings: true,
          _count: {
            select: {
              propertyNodes: {
                where: { nodeType: 'UNIT' }
              },
              memberships: {
                where: { isActive: true }
              }
            }
          }
        }
      })

      if (!org) {
        return sendNotFound(res, 'society_not_found')
      }

      const settingsMap = Object.fromEntries(
        (org.settings ?? []).map(s => [s.key, s.value])
      )

      return sendSuccess(res, {
        id: org.id,
        name: org.name,
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        type: org.type,
        photoUrl: org.photoUrl ?? null,
        isActive: org.isActive,
        totalUnits: org._count.propertyNodes,
        totalMembers: org._count.memberships,
        createdAt: org.createdAt,
        contactPhone: settingsMap['contactPhone'] ?? null,
        contactEmail: settingsMap['contactEmail'] ?? null,
        description: settingsMap['description'] ?? null,
      })

    } catch (error) {
      console.error('GET /societies/:id error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id
// Update society details
// ─────────────────────────────────────────────
router.patch('/:id', authenticate, enforceTenantContext, requirePermission('society.update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { name, address, city, state, pincode, type, photoUrl } = req.body

      // verify membership and get caller role
      const callerMembership = await prisma.membership.findFirst({
        where: {
          userId: req.user!.userId,
          orgId: id,
          isActive: true
        },
        include: { role: true }
      })

      if (!callerMembership) {
        return sendNotFound(res, 'society_not_found')
      }

      const callerRole = callerMembership.role.name

      // Admin cannot edit structural fields
      if (callerRole === 'Admin') {
        if (name || address || city || state || pincode || type) {
          return sendError(res, 'not_allowed', 403, {
            message: 'Admin cannot edit structural society info'
          })
        }
      }

      // validate type if provided
      if (type && !VALID_TYPES.includes(type)) {
        return sendError(res, 'invalid_type', 400, {
          allowed: VALID_TYPES
        })
      }

      // build update object — only include provided fields
      const updates: Record<string, unknown> = {}
      if (name)    updates.name    = name
      if (address) updates.address = address
      if (city)    updates.city    = city
      if (state)   updates.state   = state
      if (pincode) updates.pincode = pincode
      if (type)    updates.type    = type

      // handle photo upload if provided
      if (photoUrl) {
        if (typeof photoUrl !== 'string') {
          return sendError(res, 'invalid_photo', 400, {
            message: 'Invalid photo'
          })
        }
        try {
          updates.photoUrl = await uploadImage(photoUrl, 'societies')
        } catch {
          return sendError(res, 'upload_failed', 500, {
            message: 'Photo upload failed'
          })
        }
      }

      if (Object.keys(updates).length === 0) {
        return sendError(res, 'no_fields_provided', 400)
      }

      const org = await prisma.organization.update({
        where: { id },
        data: updates
      })

      return sendSuccess(res, {
        id: org.id,
        name: org.name,
        address: org.address,
        city: org.city,
        state: org.state,
        pincode: org.pincode,
        type: org.type,
        photoUrl: org.photoUrl ?? null,
        updatedAt: org.updatedAt
      })

    } catch (error) {
      console.error('PATCH /societies/:id error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/settings
// Update society contact/about settings
// ─────────────────────────────────────────────
router.patch(
  '/:id/settings',
  authenticate,
  enforceTenantContext,
  requirePermission('society.update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.params.id as string
      const { contactPhone, contactEmail, description } = req.body

      if (!contactPhone && !contactEmail && !description) {
        return sendError(res, 'missing_field', 400, {
          message: 'At least one setting required'
        })
      }

      if (contactPhone && typeof contactPhone !== 'string') {
        return sendError(res, 'invalid_phone', 400, {})
      }
      if (contactPhone && !/^\+?[\d\s\-]{7,15}$/.test(contactPhone)) {
        return sendError(res, 'invalid_phone', 400, { message: 'Invalid phone format' })
      }
      if (contactPhone && contactPhone.length > 15) {
        return sendError(res, 'invalid_phone', 400, { message: 'Phone max 15 characters' })
      }
      if (contactEmail && typeof contactEmail !== 'string') {
        return sendError(res, 'invalid_email', 400, {})
      }
      if (contactEmail && contactEmail.length > 100) {
        return sendError(res, 'invalid_email', 400, { message: 'Email max 100 characters' })
      }
      if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        return sendError(res, 'invalid_email', 400, { message: 'Invalid email format' })
      }
      if (description && typeof description !== 'string') {
        return sendError(res, 'invalid_description', 400, {})
      }
      if (description && description.trim().length > 300) {
        return sendError(res, 'description_too_long', 400, {
          message: 'Description max 300 characters'
        })
      }

      const settingsToUpdate = [
        { key: 'contactPhone', value: contactPhone },
        { key: 'contactEmail', value: contactEmail },
        { key: 'description', value: description },
      ].filter(s => s.value !== undefined && s.value !== null)

      await Promise.all(
        settingsToUpdate.map(({ key, value }) =>
          prisma.organizationSetting.upsert({
            where: { orgId_key: { orgId, key } },
            create: { orgId, key, value: value as string },
            update: { value: value as string },
          })
        )
      )

      return sendSuccess(res, {
        contactPhone: contactPhone ?? undefined,
        contactEmail: contactEmail ?? undefined,
        description: description ?? undefined,
      })

    } catch (error) {
      console.error('PATCH /societies/:id/settings error:', error)
      return sendServerError(res)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/leave
// Builder hands over and leaves the society
// ─────────────────────────────────────────────
router.patch(
  '/:id/leave',
  authenticate,
  enforceTenantContext,
  requirePermission('society.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const orgId = req.params.id as string
      const userId = req.user!.userId

      // 1. Find caller's membership and role
      const membership = await prisma.membership.findFirst({
        where: { userId, orgId, isActive: true },
        include: { role: true }
      })

      if (!membership) {
        return sendNotFound(res, 'membership_not_found')
      }

      // 2. Only Builder can use this endpoint
      if (membership.role.name !== 'Builder') {
        return sendError(res, 'not_allowed', 403, {
          message: 'Only a Builder can leave a society via handover'
        })
      }

      // 3. Guard: at least one active Admin must exist
      const activeAdminCount = await prisma.membership.count({
        where: {
          orgId,
          isActive: true,
          role: { name: 'Admin' }
        }
      })

      if (activeAdminCount === 0) {
        return sendError(res, 'no_admin_exists', 400, {
          message: 'You must add an Admin before leaving. They will manage the society after you.'
        })
      }

      // 4. Guard: society must have other active members
      const otherActiveMemberCount = await prisma.membership.count({
        where: {
          orgId,
          isActive: true,
          userId: { not: userId }
        }
      })

      if (otherActiveMemberCount === 0) {
        return sendError(res, 'no_other_members', 400, {
          message: 'You are the only member. Add members before leaving.'
        })
      }

      // 5. Execute in transaction
      await prisma.$transaction(async (tx) => {
        // Deactivate membership
        await tx.membership.update({
          where: { id: membership.id },
          data: { isActive: false }
        })

        // Increment tokenVersion — invalidates all active JWTs
        await tx.user.update({
          where: { id: userId },
          data: { tokenVersion: { increment: 1 } }
        })

        // Audit log
        await tx.auditLog.create({
          data: {
            orgId,
            tableName: 'memberships',
            recordId: membership.id,
            action: 'society_leave',
            actorId: userId,
            oldData: { isActive: true, role: membership.role.name },
            newData: { isActive: false, reason: 'builder_handover' }
          }
        })
      })

      return sendSuccess(res, {
        message: 'You have successfully left the society.'
      })

    } catch (error) {
      console.error('PATCH /societies/:id/leave error:', error)
      return sendServerError(res)
    }
  }
)

export default router