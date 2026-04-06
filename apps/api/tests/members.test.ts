import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId, getMembershipId } from './setup'

describe('Members', () => {
  let builderToken: string
  let residentToken: string
  let societyId: string
  let residentMembershipId: string
  let gatekeeperMembershipId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    societyId = await getSocietyId()
    residentMembershipId = await getMembershipId(societyId, 'Resident')
    gatekeeperMembershipId = await getMembershipId(societyId, 'Gatekeeper')
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/members
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/members', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns member list for builder', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.active)).toBe(true)
      expect(Array.isArray(res.body.data.pendingSetup)).toBe(true)
    })

    it('filters by role correctly', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members?role=Resident`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.active.length).toBe(1)
      expect(res.body.data.active[0].role).toBe('Resident')
    })

    it('returns 400 for invalid status', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members?status=wrong`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_status')
    })

    it('returns inactive members when status=inactive', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members?status=inactive`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.active)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/members/:memberId
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/members/:memberId', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members/${residentMembershipId}`)
      expect(res.status).toBe(401)
    })

    it('returns 404 for wrong member', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('member_not_found')
    })

    it('returns full member details', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/members/${residentMembershipId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Arjun Mehta')
      expect(res.body.data.phone).toBe('+919222222222')
      expect(res.body.data.role).toBe('Resident')
      expect(res.body.data.unit).toBe('Flat 4B')
      expect(Array.isArray(res.body.data.occupancyHistory)).toBe(true)
      expect(res.body.data.joinedAt).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /deactivate
  // ─────────────────────────────────────────────
  describe('PATCH /members/:memberId/deactivate', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/members/${residentMembershipId}/deactivate`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/members/${residentMembershipId}/deactivate`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
    })

    it('returns 400 when deactivating self', async () => {
      const builderMembershipId = await getMembershipId(societyId, 'Builder')
      const res = await request(app)
        .patch(`/api/societies/${societyId}/members/${builderMembershipId}/deactivate`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('cannot_deactivate_self')
    })

    it('deactivates member successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/members/${residentMembershipId}/deactivate`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('member_deactivated')
    })

    it('returns 400 when already inactive', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/members/${residentMembershipId}/deactivate`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('already_inactive')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /reactivate
  // ─────────────────────────────────────────────
  describe('PATCH /members/:memberId/reactivate', () => {
  it('returns 403 for resident', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${residentMembershipId}/reactivate`)
      .set('Authorization', `Bearer ${residentToken}`)
    expect(res.status).toBe(403)
  })

  it('reactivates member successfully', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${residentMembershipId}/reactivate`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('member_reactivated')
  })

  it('returns 400 when already active', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${residentMembershipId}/reactivate`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_active')
  })
})

  // ─────────────────────────────────────────────
  // PATCH /moveout
  // ─────────────────────────────────────────────
  describe('PATCH /members/:memberId/moveout', () => {
  it('returns 400 for no active occupancy', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${gatekeeperMembershipId}/moveout`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('no_active_occupancy')
  })

  it('marks member as moved out successfully', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${residentMembershipId}/moveout`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('member_moved_out')
  })

  it('returns 200 with warning after reactivating moved out member', async () => {
    const res = await request(app)
      .patch(`/api/societies/${societyId}/members/${residentMembershipId}/reactivate`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.warning).toBeDefined()
  })
})
})