import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { sendSuccess, sendError } from '../utils/response'
import { cleanupOldTokens } from '../utils/notifications'

const router = Router()

// ─────────────────────────────────────────────
// POST /api/auth/device-token
// Register device push token
// ─────────────────────────────────────────────
router.post('/device-token', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token, platform } = req.body

    if (!token || !platform) {
      return sendError(res, 'missing_field', 400, {
        field: !token ? 'token' : 'platform'
      })
    }

    if (!['IOS', 'ANDROID'].includes(platform)) {
      return sendError(res, 'invalid_platform', 400)
    }

    // Clean up old tokens if at limit
    await cleanupOldTokens(req.user!.userId)

    // Upsert — update if exists, create if not
    await prisma.deviceToken.upsert({
      where: { token },
      update: {
        userId: req.user!.userId,
        platform,
        updatedAt: new Date()
      },
      create: {
        userId: req.user!.userId,
        token,
        platform
      }
    })

    return sendSuccess(res, { registered: true })

  } catch (error) {
    console.error('POST /device-token error:', error)
    return sendError(res, 'server_error', 500)
  }
})

export default router