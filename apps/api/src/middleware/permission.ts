import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

export const requirePermission = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'not_authenticated' })
        }

        if (!req.user.permissions.includes(permission)) {
            return res.status(403).json({
                error: 'insufficient_permissions',
                required: permission
            })
        }

        next()
    }
}