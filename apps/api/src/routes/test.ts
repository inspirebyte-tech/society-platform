import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { generateToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

const router = Router()

// Public
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// Needs login
router.get('/me', authenticate, (req, res) => {
  res.json({ user: (req as any).user })
})

// Admin only
router.get(
  '/admin-only',
  authenticate,
  requirePermission('complaint.view_all'),
  (req, res) => {
    res.json({ message: 'You have admin access' })
  }
)

// Gate only
router.get(
  '/gate-only',
  authenticate,
  requirePermission('visitor.log'),
  (req, res) => {
    res.json({ message: 'You have gate access' })
  }
)

// TEMPORARY - test tokens
router.get('/test-tokens', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'not_found' })
  }

  const users = await prisma.user.findMany({
    include: {
      person: true,
      memberships: {
        include: { role: true }
      }
    }
  })

  const tokens = users.map(user => ({
    name: user.person?.fullName,
    role: user.memberships[0]?.role.name,
    token: generateToken({
      userId: user.id,
      orgId: user.memberships[0]?.orgId ?? undefined,
      tokenVersion: user.tokenVersion
    })
  }))

  res.json(tokens)
})

export default router