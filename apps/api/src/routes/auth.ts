import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    orgId?: string
    permissions: string[]
  }
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'no_token' })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({ error: 'invalid_token' })
    }

    req.user = {
      userId: decoded.userId,
      orgId: decoded.orgId,
      permissions: []
    }

    // If org context exists, load permissions
    if (decoded.orgId) {
      const membership = await prisma.membership.findFirst({
        where: {
          userId: decoded.userId,
          orgId: decoded.orgId,
          isActive: true
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      })

      if (membership) {
        req.user.permissions = membership.role.rolePermissions
          .map(rp => rp.permission.name)
      }
    }

    next()
  } catch (error) {
    return res.status(401).json({ error: 'auth_failed' })
  }
}