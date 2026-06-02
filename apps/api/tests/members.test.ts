import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId, getMembershipId } from './setup'
import { prisma } from '../src/lib/prisma'
import { generateToken } from '../src/utils/jwt'

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

  afterAll(async () => {
    // Restore resident occupancy so subsequent test suites (visitors.test.ts)
    // find an active occupant for flat 4B
    const person = await prisma.person.findFirst({
      where: { user: { phone: '+919222222222' } }
    })
    if (person) {
      await prisma.unitOccupancy.updateMany({
        where: {
          personId: person.id,
          occupiedUntil: { not: null }
        },
        data: { occupiedUntil: null }
      })
    }
  })
})

  // ─────────────────────────────────────────────
  // POST /societies/:id/members/direct-add
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/members/direct-add', () => {
    let adminToken: string
    let adminUserId: string
    let unitId: string
    const phoneA = '+919800000001'
    const phoneB = '+919800000002'
    const phoneC = '+919800000003'
    let membershipIdA: string

    beforeAll(async () => {
      // Create an admin user with membership for role restriction tests
      const adminUser = await prisma.user.create({
        data: {
          phone: '+919800000099',
          phoneVerified: true,
          tokenVersion: 0,
          person: { create: { fullName: 'Test Admin User', phone: '+919800000099' } }
        }
      })
      adminUserId = adminUser.id
      await prisma.membership.create({
        data: { userId: adminUser.id, orgId: societyId, roleId: 'role-admin', isActive: true }
      })
      adminToken = generateToken({ userId: adminUser.id, orgId: societyId, tokenVersion: 0 })

      // Get a valid unit ID for unit assignment tests
      const unit = await prisma.propertyNode.findFirst({
        where: { orgId: societyId, nodeType: 'UNIT' }
      })
      unitId = unit!.id
    })

    afterAll(async () => {
      // Remove direct_add audit logs, then users created by these tests
      await prisma.auditLog.deleteMany({ where: { orgId: societyId, action: 'direct_add' } })
      for (const phone of [phoneA, phoneB, phoneC, '+919800000099']) {
        const user = await prisma.user.findUnique({ where: { phone } })
        if (!user) continue
        await prisma.auditLog.deleteMany({ where: { orgId: societyId, actorId: user.id } })
        await prisma.unitOccupancy.deleteMany({ where: { person: { userId: user.id } } })
        await prisma.membership.deleteMany({ where: { userId: user.id } })
        const person = await prisma.person.findFirst({ where: { userId: user.id } })
        if (person) await prisma.person.delete({ where: { id: person.id } })
        await prisma.user.delete({ where: { id: user.id } })
      }
    })

    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .send({ name: 'Test', phone: '9800000001', role: 'Resident' })
      expect(res.status).toBe(401)
    })

    it('returns 403 if caller lacks member.remove permission', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ name: 'Test', phone: '9800000001', role: 'Resident' })
      expect(res.status).toBe(403)
    })

    it('returns 400 if name missing', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ phone: '9800000001', role: 'Resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_name')
    })

    it('returns 400 if name too short', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'A', phone: '9800000001', role: 'Resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_name')
    })

    it('returns 400 if phone missing', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Test User', role: 'Resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_phone')
    })

    it('returns 400 if invalid phone format', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Test User', phone: '1234', role: 'Resident' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_phone')
    })

    it('returns 400 if role missing', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Test User', phone: '9800000001' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_role')
    })

    it('returns 403 if Admin tries to add Admin role', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test User', phone: '9800000001', role: 'Admin' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('role_not_allowed')
    })

    it('returns 403 if Admin tries to add Builder role', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test User', phone: '9800000001', role: 'Builder' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('role_not_allowed')
    })

    it('successfully adds a new member (Builder caller)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Direct Add Test', phone: '9800000001', role: 'Gatekeeper' })
      expect(res.status).toBe(201)
      expect(res.body.data.memberId).toBeDefined()
      expect(res.body.data.message).toBe('Member added successfully')
      membershipIdA = res.body.data.memberId

      // Verify member appears in list
      const list = await request(app)
        .get(`/api/societies/${societyId}/members`)
        .set('Authorization', `Bearer ${builderToken}`)
      const found = list.body.data.active.some((m: any) => m.membershipId === membershipIdA)
      expect(found).toBe(true)
    })

    it('successfully adds a new member (Admin caller, Resident role)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Added Resident', phone: '9800000002', role: 'Resident' })
      expect(res.status).toBe(201)
      expect(res.body.data.memberId).toBeDefined()
    })

    it('returns 409 already_member for active member', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Direct Add Test', phone: '9800000001', role: 'Gatekeeper' })
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('already_member')
    })

    it('returns 409 inactive_member with memberId for deactivated member', async () => {
      // Deactivate the member added in the Builder test
      await request(app)
        .patch(`/api/societies/${societyId}/members/${membershipIdA}/deactivate`)
        .set('Authorization', `Bearer ${builderToken}`)

      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Direct Add Test', phone: '9800000001', role: 'Gatekeeper' })
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('inactive_member')
      expect(res.body.details.memberId).toBe(membershipIdA)
    })

    it('returns 400 if unitId provided without occupancyType', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Unit Test', phone: '9800000003', role: 'Resident', unitId })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('successfully adds member with unit assignment', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/members/direct-add`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Unit Test Resident', phone: '9800000003', role: 'Resident', unitId, occupancyType: 'TENANT' })
      expect(res.status).toBe(201)
      expect(res.body.data.memberId).toBeDefined()

      // Verify occupancy was created
      const user = await prisma.user.findUnique({ where: { phone: phoneC } })
      const person = await prisma.person.findFirst({ where: { userId: user!.id } })
      const occupancy = await prisma.unitOccupancy.findFirst({
        where: { personId: person!.id, occupiedUntil: null }
      })
      expect(occupancy).not.toBeNull()
      expect(occupancy!.occupancyType).toBe('TENANT')
      expect(occupancy!.unitId).toBe(unitId)
    })
  })
})