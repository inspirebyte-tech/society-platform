import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'

describe('Invitations', () => {
  let builderToken: string
  let residentToken: string
  let societyId: string
  let invitationId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    societyId = await getSocietyId()
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/invitations
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/invitations', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ phone: '9876543299', roleId: 'role-resident' })
      expect(res.status).toBe(403)
    })

    it('returns 400 with missing fields', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '9876543299' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid phone', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '1234', roleId: 'role-resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_phone_format')
    })

    it('returns 400 with invalid role', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '9876543299', roleId: 'fake-role' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_role')
    })

    it('returns 400 for already member', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '+919222222222', roleId: 'role-resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('already_member')
    })

    it('creates invitation successfully', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '9876543299', roleId: 'role-resident' })
      expect(res.status).toBe(201)
      expect(res.body.data.phone).toBe('+919876543299')
      expect(res.body.data.role).toBe('Resident')
      expect(res.body.data.expiresAt).toBeDefined()
      invitationId = res.body.data.id
    })

    it('returns 400 for duplicate invitation', async () => {
  // send same invitation again — same phone different session
  const res = await request(app)
    .post(`/api/societies/${societyId}/invitations`)
    .set('Authorization', `Bearer ${builderToken}`)
    .send({ phone: '9876543299', roleId: 'role-resident' })
  expect(res.status).toBe(400)
  // either already_member or invitation_exists is valid here
  expect(['already_member', 'invitation_exists']).toContain(res.body.error)
})
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/invitations
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/invitations', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/invitations`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
    })

    it('returns pending invitations list', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
      expect(res.body.data[0].phone).toBeDefined()
      expect(res.body.data[0].role).toBeDefined()
      expect(res.body.data[0].invitedBy).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // DELETE /societies/:id/invitations/:invitationId
  // ─────────────────────────────────────────────
  describe('DELETE /societies/:id/invitations/:invitationId', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/invitations/fake-id`)
      expect(res.status).toBe(401)
    })

    it('returns 404 for wrong invitation', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/invitations/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('invitation_not_found')
    })

    it('cancels invitation successfully', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('invitation_cancelled')
    })

    it('returns 404 after cancellation', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/invitations/${invitationId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
    })

    it('list is empty after cancellation', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/invitations`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.length).toBe(0)
    })
  })
})