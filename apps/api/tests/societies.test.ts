import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'

describe('Societies', () => {
  let builderToken: string
  let residentToken: string
  let societyId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    societyId = await getSocietyId()
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
})