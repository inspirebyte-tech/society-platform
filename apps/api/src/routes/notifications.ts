import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'

const router = Router()

// ─────────────────────────────────────────────
// GET /api/notifications/unread-count
// User-scoped — no society context needed
// ─────────────────────────────────────────────
router.get(
  '/notifications/unread-count',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId

      const count = await prisma.userNotification.count({
        where: { userId, isRead: false }
      })

      return sendSuccess(res, { count })

    } catch (error) {
      console.error('GET /notifications/unread-count error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// PATCH /api/notifications/read
// If ids provided: mark those only (must belong to userId)
// If no ids: mark ALL unread for this user as read
// ─────────────────────────────────────────────
router.patch(
  '/notifications/read',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId
      const { ids } = req.body

      let result

      if (ids && Array.isArray(ids) && ids.length > 0) {
        result = await prisma.userNotification.updateMany({
          where: { id: { in: ids }, userId },
          data: { isRead: true }
        })
      } else {
        result = await prisma.userNotification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true }
        })
      }

      return sendSuccess(res, { updated: result.count })

    } catch (error) {
      console.error('PATCH /notifications/read error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

// ─────────────────────────────────────────────
// GET /api/notifications
// Paginated inbox — newest first
// Query: limit (default 20, max 50), before (ISO cursor)
// ─────────────────────────────────────────────
router.get(
  '/notifications',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId
      const { before } = req.query

      const rawLimit = parseInt(req.query.limit as string, 10)
      const limit = isNaN(rawLimit) ? 20 : Math.min(rawLimit, 50)

      const where: any = { userId }
      if (before) {
        where.createdAt = { lt: new Date(before as string) }
      }

      const notifications = await prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1
      })

      const hasMore = notifications.length > limit
      if (hasMore) notifications.pop()

      return sendSuccess(res, {
        notifications: notifications.map(n => ({
          id: n.id,
          title: n.title,
          body: n.body,
          screen: n.screen,
          data: n.data,
          isRead: n.isRead,
          createdAt: n.createdAt.toISOString()
        })),
        hasMore,
        nextCursor: hasMore
          ? notifications[notifications.length - 1].createdAt.toISOString()
          : null
      })

    } catch (error) {
      console.error('GET /notifications error:', error)
      return sendError(res, 'server_error', 500)
    }
  }
)

export default router
