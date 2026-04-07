import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { authenticate, AuthRequest } from '../middleware/auth'
import { otpRateLimit } from '../middleware/rateLimit'
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { generateOtp, getOtpExpiry, isOtpExpired, getInvitationExpiry } from '../utils/otp'
import { sendOtp } from '../utils/sms'
import { validatePhone, validateOtp, validateRequired, normalizePhone } from '../utils/validate'
import { sendSuccess, sendCreated, sendError, sendUnauthorized, sendForbidden, sendNotFound, sendServerError } from '../utils/response'

const router = Router()

// ─────────────────────────────────────────────
// POST /api/auth/request-otp
// Public — no auth needed
// Rate limited — 3 per hour per IP
// ─────────────────────────────────────────────
router.post('/request-otp', otpRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.body

    // 1. validate phone
    const phoneValidation = validatePhone(phone)
    if (!phoneValidation.valid) {
      return sendError(res, phoneValidation.error!, 400, {
        field: phoneValidation.field
      })
    }

    const normalizedPhone = normalizePhone(phone)

    // 2. invalidate any existing unused OTPs for this phone
    await prisma.otpVerification.updateMany({
      where: {
        phone: normalizedPhone,
        verified: false
      },
      data: { verified: true }  // mark old ones as used
    })

    // 3. generate new OTP
    const otp = generateOtp()
    const expiresAt = getOtpExpiry()

    // 4. save to DB
    await prisma.otpVerification.create({
      data: {
        phone: normalizedPhone,
        otp,
        expiresAt,
        ipAddress: req.ip
      }
    })

    // 5. send SMS
    const smsResult = await sendOtp(normalizedPhone, otp)
    if (!smsResult.success) {
      return sendError(res, 'sms_failed', 500)
    }

    // 6. respond — never return OTP in response
    return sendSuccess(res, {
      message: 'otp_sent',
      phone: normalizedPhone,
      expiresIn: 600  // 10 minutes in seconds
    })

  } catch (error) {
    console.error('POST /auth/request-otp error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/verify-otp
// Public — no auth needed
// ─────────────────────────────────────────────
router.post('/verify-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { phone, otp } = req.body

    // 1. validate inputs
    const phoneValidation = validatePhone(phone)
    if (!phoneValidation.valid) {
      return sendError(res, phoneValidation.error!, 400, {
        field: phoneValidation.field
      })
    }

    const otpValidation = validateOtp(otp)
    if (!otpValidation.valid) {
      return sendError(res, otpValidation.error!, 400, {
        field: otpValidation.field
      })
    }

    const normalizedPhone = normalizePhone(phone)

    // 2. find latest unverified OTP for this phone
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        verified: false
      },
      orderBy: { createdAt: 'desc' }
    })

    // 3. no OTP found
    if (!otpRecord) {
      return sendError(res, 'otp_not_found', 400)
    }

    // 4. check attempts — block after 3 wrong guesses
    if (otpRecord.attempts >= 3) {
      return sendError(res, 'otp_blocked', 400, {
        message: 'Too many wrong attempts. Request a new OTP.'
      })
    }

    // 5. check expiry
    if (isOtpExpired(otpRecord.expiresAt)) {
      return sendError(res, 'otp_expired', 400)
    }

    // 6. check OTP match
    if (otpRecord.otp !== otp) {
      // increment attempts
      await prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } }
      })
      return sendError(res, 'invalid_otp', 400, {
        attemptsRemaining: 3 - (otpRecord.attempts + 1)
      })
    }

    // 7. mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    })

    // 8. check if user exists
    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
      include: {
        person: true,
        memberships: {
          where: { isActive: true },
          include: {
            org: true,
            role: true
          }
        }
      }
    })

    // 9. new user — create user + person
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          person: {
            create: {
              fullName: '',  // collected later in onboarding
              phone: normalizedPhone
            }
          }
        },
        include: {
          person: true,
          memberships: {
            where: { isActive: true },
            include: {
              org: true,
              role: true
            }
          }
        }
      })
    }

    // 10. check for pending invitation
    const invitation = await prisma.invitation.findFirst({
      where: {
        phone: normalizedPhone,
        acceptedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { org: true, role: true }
    })

    if (invitation) {
      // auto-accept invitation — create membership
      await prisma.membership.create({
        data: {
          userId: user.id,
          orgId: invitation.orgId,
          roleId: invitation.roleId,
          invitedBy: invitation.invitedBy,
          isActive: true
        }
      })

      // mark invitation accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      // reload user with new membership
      user = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          person: true,
          memberships: {
            where: { isActive: true },
            include: { org: true, role: true }
          }
        }
      }) as typeof user
    }

    const activeMemberships = user!.memberships

    // 11. generate refresh token always
const refreshToken = generateRefreshToken(
  user!.id,
  user!.tokenVersion     
)
    // 12. no memberships — new user with no society
    if (activeMemberships.length === 0) {
      const token = generateToken({
  userId: user!.id,
  tokenVersion: user!.tokenVersion
})
      return sendSuccess(res, {
        token,
        refreshToken,
        isNewUser: !user!.person?.fullName,
        memberships: [],
        message: 'no_society_joined'
      })
    }

    // 13. exactly one society — auto select it
    if (activeMemberships.length === 1) {
      const membership = activeMemberships[0]
      const token = generateToken({
        userId: user!.id,
        orgId: membership.orgId,
        tokenVersion: user!.tokenVersion
      })
      return sendSuccess(res, {
        token,
        refreshToken,
        isNewUser: !user!.person?.fullName,
        currentOrg: {
          id: membership.org.id,
          name: membership.org.name,
          role: membership.role.name
        }
      })
    }

    // 14. multiple societies — return list, let user pick
    const token = generateToken({
  userId: user!.id,
  tokenVersion: user!.tokenVersion    
})
    return sendSuccess(res, {
      token,
      refreshToken,
      isNewUser: !user!.person?.fullName,
      requiresOrgSelection: true,
      memberships: activeMemberships.map(m => ({
        orgId: m.org.id,
        orgName: m.org.name,
        role: m.role.name
      }))
    })

  } catch (error) {
    console.error('POST /auth/verify-otp error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/select-org
// Protected — auth token required (no orgId needed)
// ─────────────────────────────────────────────
router.post('/select-org', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.body

    const validation = validateRequired({ orgId }, ['orgId'])
    if (!validation.valid) {
      return sendError(res, validation.error!, 400, {
        field: validation.field
      })
    }

    // verify membership exists
    const membership = await prisma.membership.findFirst({
      where: {
        userId: req.user!.userId,
        orgId,
        isActive: true
      },
      include: {
        org: true,
        role: true
      }
    })

    if (!membership) {
      return sendForbidden(res, 'not_a_member')
    }

    // generate new session token with orgId
    const token = generateToken({
      userId: req.user!.userId,
      orgId,
      tokenVersion: req.user!.tokenVersion
    })

    return sendSuccess(res, {
      token,
      currentOrg: {
        id: membership.org.id,
        name: membership.org.name,
        role: membership.role.name
      }
    })

  } catch (error) {
    console.error('POST /auth/select-org error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// GET /api/auth/me
// Protected — session token required
// ─────────────────────────────────────────────
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
      return sendNotFound(res, 'user_not_found')
    }

    return sendSuccess(res, {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.person?.fullName,
        isProfileComplete: !!user.person?.fullName
      },
      memberships: user.memberships.map(m => ({
        org: {
          id: m.org.id,
          name: m.org.name
        },
        role: m.role.name,
        permissions: m.role.rolePermissions.map(rp => rp.permission.name)
      }))
    })

  } catch (error) {
    console.error('GET /auth/me error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/logout
// Protected — any valid token
// ─────────────────────────────────────────────
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Increment tokenVersion — invalidates ALL existing tokens
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { tokenVersion: { increment: 1 } }
    })

    return sendSuccess(res, { message: 'logged_out' })

  } catch (error) {
    console.error('POST /auth/logout error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// Public — refresh token in body
// ─────────────────────────────────────────────
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body

    const validation = validateRequired({ refreshToken }, ['refreshToken'])
    if (!validation.valid) {
      return sendError(res, validation.error!, 400, {
        field: validation.field
      })
    }

    // 1. verify refresh token signature
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      return sendUnauthorized(res, 'invalid_refresh_token')
    }

    // 2. check user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { org: true, role: true }
        }
      }
    })

    if (!user || !user.isActive) {
      return sendUnauthorized(res, 'user_not_found')
    }

    // 3. verify tokenVersion matches — prevents use after logout
    if (user.tokenVersion !== decoded.tokenVersion) {
      return sendUnauthorized(res, 'token_revoked')
    }

    // 4. generate new tokens
    const activeMemberships = user.memberships
    const orgId = activeMemberships.length === 1
      ? activeMemberships[0].orgId
      : undefined

    const newToken = generateToken({
      userId: user.id,
      orgId,
      tokenVersion: user.tokenVersion    // ← add
    })

    const newRefreshToken = generateRefreshToken(
      user.id,
      user.tokenVersion                  // ← add
    )

    return sendSuccess(res, {
      token: newToken,
      refreshToken: newRefreshToken,
      ...(orgId && {
        currentOrg: {
          id: activeMemberships[0].org.id,
          name: activeMemberships[0].org.name,
          role: activeMemberships[0].role.name
        }
      })
    })

  } catch (error) {
    console.error('POST /auth/refresh error:', error)
    return sendServerError(res)
  }
})

// ─────────────────────────────────────────────
// PATCH /api/auth/profile
// Update current user's name
// ─────────────────────────────────────────────
router.patch('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body

    const validation = validateRequired({ name }, ['name'])
    if (!validation.valid) {
      return sendError(res, validation.error!, 400, {
        field: validation.field
      })
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      return sendError(res, 'invalid_name', 400, {
        message: 'Name must be at least 2 characters'
      })
    }

    const person = await prisma.person.findFirst({
      where: { userId: req.user!.userId }
    })

    if (!person) {
      return sendNotFound(res, 'profile_not_found')
    }

    const updated = await prisma.person.update({
      where: { id: person.id },
      data: { fullName: name.trim() }
    })

    return sendSuccess(res, {
      name: updated.fullName,
      isProfileComplete: true
    })

  } catch (error) {
    console.error('PATCH /auth/profile error:', error)
    return sendServerError(res)
  }
})

export default router