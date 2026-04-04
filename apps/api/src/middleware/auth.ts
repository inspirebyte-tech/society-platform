import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { prisma } from '../lib/prisma'

export interface AuthRequest extends Request {
    user?: {
        userId: string
        orgId?: string
        permissions: string[]
        tokenVersion: number
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

        // Verify user exists, is active, and token version matches
        const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { isActive: true, tokenVersion: true }
        })

        if (!user || !user.isActive) {
        return res.status(401).json({ error: 'user_inactive' })
        }

        // Token version check — handles logout and revocation
        if (user.tokenVersion !== decoded.tokenVersion) {
        return res.status(401).json({ error: 'token_revoked' })
        }
        
        req.user = {
            userId: decoded.userId,
            orgId: decoded.orgId,
            permissions: [],
            tokenVersion: decoded.tokenVersion
        }

        // Load permissions for this org context
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