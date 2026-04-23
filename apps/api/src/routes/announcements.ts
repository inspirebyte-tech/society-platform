import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { enforceTenantContext } from '../middleware/tenantContext'
import { sendSuccess, sendError, sendNotFound } from '../utils/response'
import { uploadMultipleImages } from '../utils/cloudinary'
import { appEvents, Events } from '../events/emitter'

const router = Router()

const VALID_CATEGORIES = ['GENERAL', 'MAINTENANCE', 'MEETING', 'EMERGENCY', 'CELEBRATION']

// ─────────────────────────────────────────────
// POST /api/societies/:id/announcements
// Create a new announcement
// ─────────────────────────────────────────────
router.post(
  '/:id/announcements',
  authenticate,
  enforceTenantContext,
  requirePermission('announcement.create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { title, body, category, images } = req.body

      if (!title || !title.trim()) {
        return sendError(res, 'missing_field', 400, { field: 'title' })
      }
      if (!body || !body.trim()) {
        return sendError(res, 'missing_field', 400, { field: 'body' })
      }
      if (category && !VALID_CATEGORIES.includes(category)) {
        return sendError(res, 'invalid_category', 400)
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

      const announcement = await prisma.announcement.create({
        data: {
          orgId,
          createdBy: req.user!.userId,
          title:     title.trim(),
          body:      body.trim(),
          category:  category ?? 'GENERAL',
          images: {
            create: imageUrls.map(url => ({ imageUrl: url }))
          }
        },
        include: {
          images:  true,
          creator: { include: { person: true } }
        }
      })

      const org = await prisma.organization.findUnique({ where: { id: orgId } })

      appEvents.emit(Events.ANNOUNCEMENT_CREATED, {
        orgId,
        announcementId:  announcement.id,
        title:           announcement.title,
        category:        announcement.category,
        createdByUserId: req.user!.userId,
        societyName:     org?.name ?? '',
      })

      return sendSuccess(res, {
        id:        announcement.id,
        title:     announcement.title,
        body:      announcement.body,
        category:  announcement.category,
        isPinned:  announcement.isPinned,
        images:    announcement.images.map(img => ({ id: img.id, imageUrl: img.imageUrl })),
        createdBy: { name: announcement.creator.person?.fullName ?? 'Unknown' },
        createdAt: announcement.createdAt,
      }, 201)

    } catch (error) {
      console.error('POST /announcements error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/announcements
// List announcements — pinned first, then newest
// ─────────────────────────────────────────────
router.get(
  '/:id/announcements',
  authenticate,
  enforceTenantContext,
  requirePermission('announcement.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId } = req.params
      const { category } = req.query

      if (category && !VALID_CATEGORIES.includes(category as string)) {
        return sendError(res, 'invalid_category', 400)
      }

      const where: any = { orgId, deletedAt: null }
      if (category) where.category = category

      const announcements = await prisma.announcement.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          images:  { select: { id: true, imageUrl: true } },
          creator: { include: { person: true } }
        }
      })

      return sendSuccess(res, {
        announcements: announcements.map(a => ({
          id:        a.id,
          title:     a.title,
          body:      a.body,
          category:  a.category,
          isPinned:  a.isPinned,
          images:    a.images,
          createdBy: { name: a.creator.person?.fullName ?? 'Unknown' },
          createdAt: a.createdAt,
        }))
      })

    } catch (error) {
      console.error('GET /announcements error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/societies/:id/announcements/:announcementId
// Announcement detail
// ─────────────────────────────────────────────
router.get(
  '/:id/announcements/:announcementId',
  authenticate,
  enforceTenantContext,
  requirePermission('announcement.view'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, announcementId } = req.params

      const announcement = await prisma.announcement.findFirst({
        where:   { id: announcementId, orgId, deletedAt: null },
        include: {
          images:  true,
          creator: { include: { person: true } }
        }
      })

      if (!announcement) {
        return sendNotFound(res, 'announcement_not_found')
      }

      return sendSuccess(res, {
        id:        announcement.id,
        title:     announcement.title,
        body:      announcement.body,
        category:  announcement.category,
        isPinned:  announcement.isPinned,
        images:    announcement.images.map(img => ({ id: img.id, imageUrl: img.imageUrl })),
        createdBy: {
          name:  announcement.creator.person?.fullName ?? 'Unknown',
          phone: announcement.creator.phone,
        },
        createdAt: announcement.createdAt,
      })

    } catch (error) {
      console.error('GET /announcements/:id error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/societies/:id/announcements/:announcementId/pin
// Toggle pin — max 3 pinned at a time
// ─────────────────────────────────────────────
router.patch(
  '/:id/announcements/:announcementId/pin',
  authenticate,
  enforceTenantContext,
  requirePermission('announcement.pin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, announcementId } = req.params

      const announcement = await prisma.announcement.findFirst({
        where: { id: announcementId, orgId, deletedAt: null }
      })

      if (!announcement) {
        return sendNotFound(res, 'announcement_not_found')
      }

      // Enforce max 3 pinned when pinning
      if (!announcement.isPinned) {
        const pinnedCount = await prisma.announcement.count({
          where: { orgId, isPinned: true, deletedAt: null }
        })
        if (pinnedCount >= 3) {
          return sendError(res, 'max_pinned_reached', 400, {
            message: 'Maximum 3 announcements can be pinned. Unpin one first.'
          })
        }
      }

      const updated = await prisma.announcement.update({
        where: { id: announcementId },
        data:  { isPinned: !announcement.isPinned }
      })

      return sendSuccess(res, {
        message:  'pin_updated',
        isPinned: updated.isPinned,
      })

    } catch (error) {
      console.error('PATCH /announcements/:id/pin error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// DELETE /api/societies/:id/announcements/:announcementId
// Hard delete — cascade removes images
// ─────────────────────────────────────────────
router.delete(
  '/:id/announcements/:announcementId',
  authenticate,
  enforceTenantContext,
  requirePermission('announcement.delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id: orgId, announcementId } = req.params

      const announcement = await prisma.announcement.findFirst({
        where: { id: announcementId, orgId, deletedAt: null }
      })

      if (!announcement) {
        return sendNotFound(res, 'announcement_not_found')
      }

      await prisma.announcement.delete({
        where: { id: announcementId }
      })

      return sendSuccess(res, { message: 'announcement_deleted' })

    } catch (error) {
      console.error('DELETE /announcements/:id error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

export default router
