import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'

describe('Security — Tenant Context', () => {
  let builderToken: string
  let residentToken: string
  let greenValleyId: string
  let sunriseTowersId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    greenValleyId = await getSocietyId()

    // create second society for cross-tenant tests
    const res = await request(app)
      .post('/api/societies')
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        name: 'Sunrise Towers',
        address: '456 Park Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        type: 'APARTMENT'
      })
    sunriseTowersId = res.body.data.id
  })

  // ─────────────────────────────────────────────
  // Tenant context mismatch
  // ─────────────────────────────────────────────
  it('blocks PATCH on wrong society', async () => {
    const res = await request(app)
      .patch(`/api/societies/${sunriseTowersId}`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ city: 'Hacked' })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('tenant_context_mismatch')
  })

  it('blocks GET nodes on wrong society', async () => {
    const res = await request(app)
      .get(`/api/societies/${sunriseTowersId}/nodes`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('tenant_context_mismatch')
  })

  it('blocks POST nodes on wrong society', async () => {
    const res = await request(app)
      .post(`/api/societies/${sunriseTowersId}/nodes`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        parentId: 'any-uuid',
        nodeType: 'TOWER',
        name: 'Tower X',
        code: 'TX'
      })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('tenant_context_mismatch')
  })

  it('blocks POST invitations on wrong society', async () => {
    const res = await request(app)
      .post(`/api/societies/${sunriseTowersId}/invitations`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        phone: '9876543210',
        roleId: 'role-resident'
      })
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('tenant_context_mismatch')
  })

  it('blocks GET members on wrong society', async () => {
    const res = await request(app)
      .get(`/api/societies/${sunriseTowersId}/members`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('tenant_context_mismatch')
  })

  it('allows correct society access', async () => {
    const res = await request(app)
      .get(`/api/societies/${greenValleyId}/nodes`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
  })

  // ─────────────────────────────────────────────
  // Token revocation
  // ─────────────────────────────────────────────
  it('rejects token after logout', async () => {
    const tokens = await getTokens()
    const token = tokens['Gatekeeper']

    // logout
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)

    // use same token
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('token_revoked')
  })

  // ─────────────────────────────────────────────
  // No org context
  // ─────────────────────────────────────────────
  it('blocks org route with no orgId in token', async () => {
  await request(app)
    .post('/api/auth/request-otp')
    .send({ phone: '9000000001' })

  const { prisma } = await import('../src/lib/prisma')
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { phone: '+919000000001', verified: false },
    orderBy: { createdAt: 'desc' }
  })

  const verifyRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ phone: '9000000001', otp: otpRecord!.otp })

  const noOrgToken = verifyRes.body.data.token

  const res = await request(app)
    .get(`/api/societies/${greenValleyId}/nodes`)
    .set('Authorization', `Bearer ${noOrgToken}`)

  expect(res.status).toBe(403)
  expect(res.body.error).toBe('no_org_context')
})
})