import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'
import { prisma } from '../src/lib/prisma'

describe('Complaints', () => {
  let builderToken: string
  let residentToken: string
  let gatekeeperToken: string
  let societyId: string
  let complaintId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken    = tokens['Builder']
    residentToken   = tokens['Resident']
    gatekeeperToken = tokens['Gatekeeper']
    societyId       = await getSocietyId()
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/complaints
  // ─────────────────────────────────────────────
  describe('POST /complaints', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for builder', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          title: 'Test',
          description: 'Test description',
          category: 'NOISE'
        })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns 400 with missing fields', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ title: 'Test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid category', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Test',
          description: 'Test description',
          category: 'INVALID'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_category')
    })

    it('returns 400 with too many images', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Test',
          description: 'Test description',
          category: 'NOISE',
          images: ['a', 'b', 'c', 'd', 'e', 'f']
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('too_many_images')
    })

    it('creates complaint successfully', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Lift not working',
          description: 'Tower A lift out of service since 2 days',
          category: 'LIFT_ELEVATOR',
          visibility: 'PUBLIC'
        })
      expect(res.status).toBe(201)
      expect(res.body.data.title).toBe('Lift not working')
      expect(res.body.data.status).toBe('OPEN')
      expect(res.body.data.visibility).toBe('PUBLIC')
      complaintId = res.body.data.id
    })

    it('defaults to PRIVATE visibility', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Noise from neighbour',
          description: 'Loud music every night after 11pm',
          category: 'NOISE'
        })
      expect(res.status).toBe(201)
      expect(res.body.data.visibility).toBe('PRIVATE')
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/complaints
  // ─────────────────────────────────────────────
  describe('GET /complaints', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints`)
      expect(res.status).toBe(401)
    })

    it('builder sees all complaints', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.complaints.length).toBeGreaterThan(0)
      expect(res.body.data.total).toBeDefined()
      expect(res.body.data.pages).toBeDefined()
    })

    it('builder sees raisedBy name', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      const complaint = res.body.data.complaints[0]
      expect(complaint.raisedBy).toBe('Arjun Mehta')
    })

    it('resident sees own complaints', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      const own = res.body.data.complaints.filter((c: any) => c.raisedByMe)
      expect(own.length).toBeGreaterThan(0)
    })

    it('resident sees public complaints from others', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      const publicOthers = res.body.data.complaints.filter(
        (c: any) => !c.raisedByMe && c.visibility === 'PUBLIC'
      )
      expect(publicOthers.every((c: any) => c.raisedBy === null)).toBe(true)
    })

    it('filters by status correctly', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints?status=OPEN`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.complaints.every(
        (c: any) => c.status === 'OPEN'
      )).toBe(true)
    })

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints?status=WRONG`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_status')
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/complaints/:complaintId
  // ─────────────────────────────────────────────
  describe('GET /complaints/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints/${complaintId}`)
      expect(res.status).toBe(401)
    })

    it('builder sees full details', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.description).toBeDefined()
      expect(res.body.data.raisedBy.name).toBe('Arjun Mehta')
      expect(res.body.data.raisedBy.phone).toBe('+919222222222')
    })

    it('resident sees own complaint full details', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.title).toBe('Lift not working')
    })

    it('returns 404 for non existent complaint', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/complaints/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('complaint_not_found')
    })

    it('resident cannot see private complaint from others', async () => {
  const list = await request(app)
    .get(`/api/societies/${societyId}/complaints`)
    .set('Authorization', `Bearer ${builderToken}`)
  const privateComplaint = list.body.data.complaints.find(
    (c: any) => c.visibility === 'PRIVATE'
  )

  const res = await request(app)
    .get(`/api/societies/${societyId}/complaints/${privateComplaint.id}`)
    .set('Authorization', `Bearer ${gatekeeperToken}`)
  expect(res.status).toBe(404)
})
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/complaints/:complaintId
  // ─────────────────────────────────────────────
  describe('PATCH /complaints/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
      expect(res.status).toBe(401)
    })

    it('returns 400 with missing status', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid status', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ status: 'IN_PROGRESS' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_status')
    })

    it('returns 400 reject without reason', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ status: 'REJECTED' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('rejection_reason_required')
    })

    it('returns 403 resident trying to reject', async () => {
      // create fresh complaint
      const created = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Fresh complaint',
          description: 'Description here',
          category: 'NOISE'
        })
      const freshId = created.body.data.id

      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${freshId}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ status: 'REJECTED', rejectionReason: 'test' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('builder resolves complaint', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ status: 'RESOLVED' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('RESOLVED')
      expect(res.body.data.resolvedAt).toBeDefined()
      expect(res.body.data.resolvedBy).toBe('Vikram Builder')
    })

    it('returns 400 when already resolved', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${complaintId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ status: 'RESOLVED' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('already_resolved')
    })

    it('builder rejects complaint with reason', async () => {
      const created = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Another complaint',
          description: 'Description',
          category: 'PARKING'
        })
      const id = created.body.data.id

      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${id}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          status: 'REJECTED',
          rejectionReason: 'Duplicate complaint'
        })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('REJECTED')
    })

    it('resident resolves own complaint', async () => {
      const created = await request(app)
        .post(`/api/societies/${societyId}/complaints`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          title: 'Water issue',
          description: 'No water in morning',
          category: 'WATER_SUPPLY'
        })
      const id = created.body.data.id

      const res = await request(app)
        .patch(`/api/societies/${societyId}/complaints/${id}`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ status: 'RESOLVED' })
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('RESOLVED')
    })
  })
})