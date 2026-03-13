import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        person: true,
        memberships: {
          where: { isActive: true },
          include: {
            org: true,
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'user_not_found' })
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.person?.fullName,
      },
      memberships: user.memberships.map(m => ({
        org: {
          id: m.org.id,
          name: m.org.name,
        },
        role: m.role.name,
        permissions: m.role.rolePermissions.map(rp => rp.permission.name),
        isActive: m.isActive,
      }))
    })
  } catch (error) {
    res.status(500).json({ error: 'server_error' })
  }
})

export default router