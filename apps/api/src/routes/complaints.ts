import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { sendSuccess, sendError, sendNotFound } from '../utils/response'
import { uploadMultipleImages } from '../utils/cloudinary'
import { sendPushNotification } from '../utils/notifications'

const router = Router()

// ─────────────────────────────────────────────
// POST /api/societies/:id/complaints
// Raise a new complaint
// ─────────────────────────────────────────────
router.post(
  '/:id/complaints',
  authenticate,
  enforceTenantContext,
  requirePermission('complaint.create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { title, description, category, visibility, images } = req.body

      if (!title || !description || !category) {
        return sendError(res, 'missing_field', 400, {
          field: !title ? 'title' : !description ? 'description' : 'category'
        })
      }

      const validCategories = [
        'WATER_SUPPLY', 'ELECTRICITY', 'LIFT_ELEVATOR', 'GENERATOR',
        'INTERNET_CABLE', 'PARKING', 'GARBAGE_WASTE', 'GARDEN_LANDSCAPING',
        'GYM_CLUBHOUSE', 'SWIMMING_POOL', 'SECURITY', 'NOISE', 'PET_RELATED',
        'DOMESTIC_HELP', 'NEIGHBOUR_BEHAVIOUR', 'STAFF_BEHAVIOUR',
        'MAINTENANCE_REPAIR', 'RULE_VIOLATION', 'OTHER'
      ]

      if (!validCategories.includes(category)) {
        return sendError(res, 'invalid_category', 400)
      }

      if (visibility && !['PUBLIC', 'PRIVATE'].includes(visibility)) {
        return sendError(res, 'invalid_visibility', 400)
      }

      if (images && images.length > 5) {
        return sendError(res, 'too_many_images', 400, {
          message: 'Maximum 5 images allowed'
        })
      }

      // Upload images to Cloudinary if provided
      let imageUrls: string[] = []
      if (images && images.length > 0) {
        try {
          imageUrls = await uploadMultipleImages(images)
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError)
          return sendError(res, 'image_upload_failed', 400)
        }
      }

      // Create complaint
      const complaint = await prisma.complaint.create({
        data: {
          orgId,
          raisedBy:   req.user!.userId,
          title:      title.trim(),
          description: description.trim(),
          category,
          visibility: visibility ?? 'PRIVATE',
          images: {
            create: imageUrls.map(url => ({ imageUrl: url }))
          }
        },
        include: {
          images: true
        }
      })

      // Notify all admins and builders
      const adminMembers = await prisma.membership.findMany({
        where: {
          orgId,
          isActive: true,
          role: {
            name: { in: ['Builder', 'Admin'] }
          }
        },
        select: { userId: true }
      })

      const raiser = await prisma.person.findFirst({
        where: { userId: req.user!.userId }
      })

      const raiserName = raiser?.fullName || 'A resident'

      for (const member of adminMembers) {
        await sendPushNotification(
          member.userId,
          'New Complaint',
          `${raiserName}: ${title}`
        )
      }

      return sendSuccess(res, {
        id:         complaint.id,
        title:      complaint.title,
        category:   complaint.category,
        visibility: complaint.visibility,
        status:     complaint.status,
        imageCount: complaint.images.length,
        createdAt:  complaint.createdAt
      }, 201)

    } catch (error) {
      console.error('POST /complaints error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/complaints
// List complaints
// ─────────────────────────────────────────────
router.get(
  '/:id/complaints',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { status, category, page = '1', limit = '20' } = req.query

      const permissions = req.user!.permissions
      const canViewAll = permissions.includes('complaint.view_all')
      const userId = req.user!.userId

      const pageNum  = Math.max(1, parseInt(page as string))
      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)))
      const skip     = (pageNum - 1) * limitNum

      // Build where clause
      const where: any = { orgId }

      if (status) {
        const validStatuses = ['OPEN', 'RESOLVED', 'REJECTED']
        if (!validStatuses.includes(status as string)) {
          return sendError(res, 'invalid_status', 400)
        }
        where.status = status
      }

      if (category) {
        where.category = category
      }

      if (!canViewAll) {
        // Resident sees own + public from others
        where.OR = [
          { raisedBy: userId },
          { visibility: 'PUBLIC' }
        ]
      }

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            raiser: {
              include: { person: true }
            },
            images: {
              select: { id: true }
            }
          }
        }),
        prisma.complaint.count({ where })
      ])

      const formatted = complaints.map(c => ({
        id:         c.id,
        title:      c.title,
        category:   c.category,
        visibility: c.visibility,
        status:     c.status,
        raisedBy:   canViewAll || c.raisedBy === userId
          ? c.raiser.person?.fullName ?? 'Unknown'
          : null,
        raisedByMe: c.raisedBy === userId,
        imageCount: c.images.length,
        createdAt:  c.createdAt
      }))

      return sendSuccess(res, {
        complaints: formatted,
        total,
        page:  pageNum,
        pages: Math.ceil(total / limitNum)
      })

    } catch (error) {
      console.error('GET /complaints error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/complaints/:complaintId
// Complaint detail
// ─────────────────────────────────────────────
router.get(
  '/:id/complaints/:complaintId',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, complaintId } = req.params
      const permissions = req.user!.permissions
      const canViewAll  = permissions.includes('complaint.view_all')
      const userId      = req.user!.userId

      const complaint = await prisma.complaint.findFirst({
        where: { id: complaintId, orgId },
        include: {
          raiser: {
            include: { person: true }
          },
          resolver: {
            include: { person: true }
          },
          images: true
        }
      })

      if (!complaint) {
        return sendNotFound(res, 'complaint_not_found')
      }

      // Resident can only see own or public complaints
      if (!canViewAll) {
        if (complaint.raisedBy !== userId && complaint.visibility === 'PRIVATE') {
          return sendNotFound(res, 'complaint_not_found')
        }
      }

      const isOwn = complaint.raisedBy === userId

      return sendSuccess(res, {
        id:              complaint.id,
        title:           complaint.title,
        description:     complaint.description,
        category:        complaint.category,
        visibility:      complaint.visibility,
        status:          complaint.status,
        rejectionReason: complaint.rejectionReason,
        raisedBy:        canViewAll || isOwn ? {
          name:  complaint.raiser.person?.fullName ?? 'Unknown',
          phone: complaint.raiser.phone
        } : null,
        resolvedBy:   complaint.resolver?.person?.fullName ?? null,
        resolvedAt:   complaint.resolvedAt,
        images:       complaint.images.map(img => ({
          id:       img.id,
          imageUrl: img.imageUrl
        })),
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt
      })

    } catch (error) {
      console.error('GET /complaints/:id error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/complaints/:complaintId
// Update complaint status
// ─────────────────────────────────────────────
router.patch(
  '/:id/complaints/:complaintId',
  authenticate,
  enforceTenantContext,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, complaintId } = req.params
      const { status, rejectionReason } = req.body
      const permissions = req.user!.permissions
      const userId      = req.user!.userId

      if (!status) {
        return sendError(res, 'missing_field', 400, { field: 'status' })
      }

      if (!['RESOLVED', 'REJECTED'].includes(status)) {
        return sendError(res, 'invalid_status', 400)
      }

      const complaint = await prisma.complaint.findFirst({
        where: { id: complaintId, orgId }
      })

      if (!complaint) {
        return sendNotFound(res, 'complaint_not_found')
      }

      if (complaint.status === 'RESOLVED') {
        return sendError(res, 'already_resolved', 400)
      }

      if (complaint.status === 'REJECTED') {
        return sendError(res, 'already_rejected', 400)
      }

      // Check permissions
      const canResolveAny = permissions.includes('complaint.resolve_any')
      const canResolveOwn = permissions.includes('complaint.resolve_own')
      const canReject     = permissions.includes('complaint.reject')

      if (status === 'REJECTED') {
        if (!canReject) {
          return sendError(res, 'insufficient_permissions', 403)
        }
        if (!rejectionReason) {
          return sendError(res, 'rejection_reason_required', 400)
        }
      }

      if (status === 'RESOLVED') {
        if (!canResolveAny && !canResolveOwn) {
          return sendError(res, 'insufficient_permissions', 403)
        }
        if (canResolveOwn && !canResolveAny && complaint.raisedBy !== userId) {
          return sendError(res, 'cannot_resolve_others', 403)
        }
      }

      // Update complaint
      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status,
          rejectionReason: rejectionReason ?? null,
          resolvedAt:      status === 'RESOLVED' ? new Date() : null,
          resolvedBy:      status === 'RESOLVED' ? userId : null
        },
        include: {
          resolver: {
            include: { person: true }
          }
        }
      })

      // Notify complainant if admin resolved/rejected
      if (userId !== complaint.raisedBy) {
        const notifTitle = status === 'RESOLVED'
          ? 'Complaint Resolved'
          : 'Complaint Update'
        const notifBody = status === 'RESOLVED'
          ? 'Your complaint has been resolved'
          : 'Your complaint was not accepted'

        await sendPushNotification(complaint.raisedBy, notifTitle, notifBody)
      }

      // Notify admin if resident resolved own complaint
      if (userId === complaint.raisedBy && status === 'RESOLVED') {
        const adminMembers = await prisma.membership.findMany({
          where: {
            orgId,
            isActive: true,
            role: { name: { in: ['Builder', 'Admin'] } }
          },
          select: { userId: true }
        })

        const raiser = await prisma.person.findFirst({
          where: { userId }
        })
        const raiserName = raiser?.fullName ?? 'A resident'

        for (const member of adminMembers) {
          await sendPushNotification(
            member.userId,
            'Complaint Closed',
            `${raiserName} marked their complaint as resolved`
          )
        }
      }

      return sendSuccess(res, {
        id:         updated.id,
        status:     updated.status,
        resolvedAt: updated.resolvedAt,
        resolvedBy: updated.resolver?.person?.fullName ?? null
      })

    } catch (error) {
      console.error('PATCH /complaints/:id error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

export default router