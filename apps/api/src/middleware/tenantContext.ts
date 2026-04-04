import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

// ─────────────────────────────────────────────
// enforceTenantContext
//
// Prevents cross-tenant privilege escalation.
//
// The exploit: user has Admin role in Society A
// and Resident role in Society B. They use their
// Society A token to hit Society B's endpoints.
// Auth middleware loads Society A's permissions.
// Route handler finds Society B membership.
// Result: Resident acts as Admin in Society B.
//
// The fix: token's orgId MUST match URL's :id.
// If they differ → 403 tenant_context_mismatch.
// No exceptions for org-scoped routes.
// ─────────────────────────────────────────────
export const enforceTenantContext = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const urlOrgId = req.params.id

  // No :id param — not an org-scoped route
  if (!urlOrgId) {
    next()
    return
  }

  // Must have org context in token
  if (!req.user?.orgId) {
    res.status(403).json({
      error: 'no_org_context',
      message: 'Select a society first via POST /auth/select-org'
    })
    return
  }

  // Token orgId must exactly match URL orgId
  if (urlOrgId !== req.user.orgId) {
    res.status(403).json({
      error: 'tenant_context_mismatch',
      message: 'Token context does not match requested resource'
    })
    return
  }

  next()
}