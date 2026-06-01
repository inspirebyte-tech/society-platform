import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/lib/prisma'
import { generateToken } from '../src/utils/jwt'
import { getTokens, getSocietyId } from './setup'

jest.mock('../src/utils/cloudinary', () => ({
  uploadImage: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/vaastio/societies/photo.jpg'),
}))

const ADMIN_TEST_PHONE = '+919800001001'

describe('Societies', () => {
  let builderToken: string
  let residentToken: string
  let adminToken: string
  let societyId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    societyId = await getSocietyId()

    const adminUser = await prisma.user.create({
      data: {
        phone: ADMIN_TEST_PHONE,
        phoneVerified: true,
        person: { create: { fullName: 'Test Admin Settings', phone: ADMIN_TEST_PHONE } },
      },
    })
    await prisma.membership.create({
      data: { userId: adminUser.id, orgId: societyId, roleId: 'role-admin', isActive: true },
    })
    adminToken = generateToken({ userId: adminUser.id, orgId: societyId, tokenVersion: 0 })
  })

  afterAll(async () => {
    const user = await prisma.user.findFirst({ where: { phone: ADMIN_TEST_PHONE } })
    if (user) {
      await prisma.membership.deleteMany({ where: { userId: user.id } })
      await prisma.person.deleteMany({ where: { userId: user.id } })
      await prisma.user.delete({ where: { id: user.id } })
    }
  })

  // ─────────────────────────────────────────────
  // POST /societies
  // ─────────────────────────────────────────────
  describe('POST /societies', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post('/api/societies')
        .send({})
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('no_token')
    })

    it('returns 400 with missing fields', async () => {
      const res = await request(app)
        .post('/api/societies')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid type', async () => {
      const res = await request(app)
        .post('/api/societies')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          name: 'Test Society',
          address: '123 Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
          type: 'INVALID'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_type')
    })

    it('creates society with valid data', async () => {
      const res = await request(app)
        .post('/api/societies')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          name: 'New Test Society',
          address: '456 Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          type: 'APARTMENT'
        })
      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('New Test Society')
      expect(res.body.data.type).toBe('APARTMENT')
      expect(res.body.data.id).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies
  // ─────────────────────────────────────────────
  describe('GET /societies', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get('/api/societies')
      expect(res.status).toBe(401)
    })

    it('returns list of societies for builder', async () => {
      const res = await request(app)
        .get('/api/societies')
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0].role).toBe('Builder')
    })

    it('returns list of societies for resident', async () => {
      const res = await request(app)
        .get('/api/societies')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id
  // ─────────────────────────────────────────────
  describe('GET /societies/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for wrong society context', async () => {
  const res = await request(app)
    .get('/api/societies/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${builderToken}`)
  expect(res.status).toBe(403)
  expect(res.body.error).toBe('tenant_context_mismatch')
})

    it('returns society details for builder', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Green Valley Society')
      expect(res.body.data.totalUnits).toBeDefined()
      expect(res.body.data.totalMembers).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .send({ city: 'Bangalore' })
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ city: 'Bangalore' })
      expect(res.status).toBe(403)
    })

    it('returns 400 with no fields', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('no_fields_provided')
    })

    it('returns 400 with invalid type', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ type: 'WRONG' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_type')
    })

    it('updates society successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ city: 'Bangalore' })
      expect(res.status).toBe(200)
      expect(res.body.data.city).toBe('Bangalore')
    })

    it('returns 403 for resident on PATCH', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ city: 'Delhi' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns 400 with invalid type on PATCH', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ type: 'WRONG' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_type')
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id — settings fields
  // ─────────────────────────────────────────────
  describe('GET /societies/:id — settings fields', () => {
    it('returns photoUrl null when not set', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.photoUrl).toBeNull()
      expect(res.body.data.contactPhone).toBeNull()
      expect(res.body.data.contactEmail).toBeNull()
      expect(res.body.data.description).toBeNull()
    })

    it('returns contactPhone and description after PATCH /settings', async () => {
      await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ contactPhone: '9876543210', description: 'A nice society' })

      const res = await request(app)
        .get(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.contactPhone).toBe('9876543210')
      expect(res.body.data.description).toBe('A nice society')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id — photo + Admin restriction
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id — photo and Admin restriction', () => {
    it('returns 403 if Admin tries to edit name', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Hacked Name' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_allowed')
    })

    it('accepts photoUrl as base64 and returns cloudinary URL', async () => {
      const fakeBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const res = await request(app)
        .patch(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ photoUrl: fakeBase64 })
      expect(res.status).toBe(200)
      expect(res.body.data.photoUrl).toBe('https://res.cloudinary.com/test/vaastio/societies/photo.jpg')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/settings
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/settings', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .send({ contactPhone: '9876543210' })
      expect(res.status).toBe(401)
    })

    it('returns 400 if no fields provided', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('successfully sets contactPhone', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ contactPhone: '9000000001' })
      expect(res.status).toBe(200)
      expect(res.body.data.contactPhone).toBe('9000000001')
    })

    it('successfully sets contactPhone and description together', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ contactPhone: '9000000002', description: 'Updated description' })
      expect(res.status).toBe(200)
      expect(res.body.data.contactPhone).toBe('9000000002')
      expect(res.body.data.description).toBe('Updated description')
    })

    it('returns updated values in GET /societies/:id', async () => {
      await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ contactEmail: 'admin@greenvalley.com' })

      const res = await request(app)
        .get(`/api/societies/${societyId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.contactEmail).toBe('admin@greenvalley.com')
    })

    it('returns 400 for description over 300 characters', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ description: 'x'.repeat(301) })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('description_too_long')
    })

    it('allows Admin to update settings', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ contactPhone: '9111111199' })
      expect(res.status).toBe(200)
      expect(res.body.data.contactPhone).toBe('9111111199')
    })

    it('returns 403 for Resident', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/settings`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ contactPhone: '9999999999' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/leave
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/leave', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/leave`)
      expect(res.status).toBe(401)
    })

    it('returns 403 if caller is not Builder', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/leave`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_allowed')
    })

    it('returns 403 if Admin tries to leave', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/leave`)
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_allowed')
    })

    it('returns 400 if no active Admin exists', async () => {
      // Create a fresh society with only a builder — no admin
      const createRes = await request(app)
        .post('/api/societies')
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          name: 'Leave Guard Test Society',
          address: '1 Test Lane',
          city: 'Dehradun',
          state: 'Uttarakhand',
          pincode: '248001',
          type: 'APARTMENT',
        })
      expect(createRes.status).toBe(201)
      const noAdminSocietyId = createRes.body.data.id

      // Get builder user id from token to build a scoped token
      const builderUser = await prisma.user.findFirst({
        where: { memberships: { some: { orgId: noAdminSocietyId, isActive: true } } }
      })
      const scopedToken = generateToken({
        userId: builderUser!.id,
        orgId: noAdminSocietyId,
        tokenVersion: 0,
      })

      const res = await request(app)
        .patch(`/api/societies/${noAdminSocietyId}/leave`)
        .set('Authorization', `Bearer ${scopedToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('no_admin_exists')
    })

    // TODO: full integration test — builder leaves after admin is present,
    // verify membership deactivated and tokenVersion incremented.
    // Requires creating an isolated society, adding an admin, then leaving.
    // Skipped for now to avoid mutating the shared builderToken account.
    it.todo('deactivates builder membership and increments tokenVersion after leave')
    it.todo('old builder JWT returns 401 after leave')
  })
})