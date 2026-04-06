import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/lib/prisma'
import { getTokens, getSocietyId } from './setup'

describe('Auth', () => {
  let builderToken: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
  })

  // ─────────────────────────────────────────────
  // POST /auth/request-otp
  // ─────────────────────────────────────────────
  describe('POST /auth/request-otp', () => {
    it('returns 400 with no phone', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid phone', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '1234' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_phone_format')
    })

    it('sends OTP for valid phone', async () => {
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9876543210' })
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('otp_sent')
      expect(res.body.data.phone).toBe('+919876543210')
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/verify-otp
  // ─────────────────────────────────────────────
  describe('POST /auth/verify-otp', () => {
    it('returns 400 with no inputs', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid otp', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: 'abc' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when no OTP requested', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9111222333', otp: '123456' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('otp_not_found')
    })

    it('returns token on valid OTP verification', async () => {
      // request OTP
      await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9876543210' })

      // get OTP from DB
      const otpRecord = await prisma.otpVerification.findFirst({
        where: { phone: '+919876543210', verified: false },
        orderBy: { createdAt: 'desc' }
      })

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9876543210', otp: otpRecord!.otp })

      expect(res.status).toBe(200)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.refreshToken).toBeDefined()
    })

    it('blocks OTP after 3 wrong attempts', async () => {
      // request OTP
      const reqRes = await request(app)
        .post('/api/auth/request-otp')
        .send({ phone: '9123456789' })
      expect(reqRes.status).toBe(200)

      // 3 wrong attempts
      const attempt1 = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9123456789', otp: '000000' })
      expect(attempt1.body.error).toBe('invalid_otp')

      await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9123456789', otp: '000000' })

      await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9123456789', otp: '000000' })

      // 4th attempt — now blocked regardless of OTP value
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phone: '9123456789', otp: '111111' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('otp_blocked')
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/select-org
  // ─────────────────────────────────────────────
  describe('POST /auth/select-org', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post('/api/auth/select-org')
        .send({ orgId: 'any' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('no_token')
    })

    it('returns 400 with no orgId', async () => {
      const res = await request(app)
        .post('/api/auth/select-org')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 403 for org user is not member of', async () => {
      const res = await request(app)
        .post('/api/auth/select-org')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ orgId: 'fake-org-id' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_a_member')
    })

    it('returns new token for valid org', async () => {
      const orgId = await getSocietyId()
      const res = await request(app)
        .post('/api/auth/select-org')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ orgId })
      expect(res.status).toBe(200)
      expect(res.body.data.token).toBeDefined()
      expect(res.body.data.currentOrg.name).toBe('Green Valley Society')
    })
  })

  // ─────────────────────────────────────────────
  // GET /auth/me
  // ─────────────────────────────────────────────
  describe('GET /auth/me', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('no_token')
    })

    it('returns user data with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.user.phone).toBe('+919111111111')
      expect(res.body.data.memberships).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────────
  describe('POST /auth/logout', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
      expect(res.status).toBe(401)
    })

    it('logs out successfully', async () => {
      const tokens = await getTokens()
      const token = tokens['Co-resident']

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('logged_out')
    })
  })

  // ─────────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('returns 400 with no refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 401 with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('invalid_refresh_token')
    })
  })
})