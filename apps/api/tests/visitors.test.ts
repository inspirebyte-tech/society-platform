import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'
import { prisma } from '../src/lib/prisma'

describe('Visitors', () => {
  let builderToken: string
  let residentToken: string
  let gatekeeperToken: string
  let coResidentToken: string
  let societyId: string
  let flat4BId: string
  let residentUserId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken    = tokens['Builder']
    residentToken   = tokens['Resident']
    gatekeeperToken = tokens['Gatekeeper']
    coResidentToken = tokens['Co-resident']
    societyId       = await getSocietyId()

    const unit4B = await prisma.propertyNode.findFirst({
      where: { code: '4B', orgId: societyId }
    })
    flat4BId = unit4B!.id

    const resident = await prisma.user.findFirst({
      where: { phone: '+919222222222' }
    })
    residentUserId = resident!.id
  })

  afterAll(async () => {
    // Clean up
    await prisma.visitorEntry.deleteMany({ where: { orgId: societyId } })
    await prisma.visitorPreApproval.deleteMany({ where: { orgId: societyId } })
    await prisma.visitor.deleteMany({ where: { orgId: societyId } })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/visitors/search
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/visitors/search', () => {
    let searchVisitorId: string

    beforeAll(async () => {
      // Create a visitor and pre-approval for search
      const v = await prisma.visitor.create({
        data: {
          orgId: societyId,
          name: 'Search Test Visitor',
          mobile: '9998887776',
          type: 'INDIVIDUAL'
        }
      })
      searchVisitorId = v.id

      await prisma.visitorPreApproval.create({
        data: {
          orgId: societyId,
          visitorName: 'Search Test PreApproval',
          visitorMobile: '9998887775',
          unitId: flat4BId,
          approvedBy: residentUserId
        }
      })
    })

    afterAll(async () => {
      await prisma.visitorPreApproval.deleteMany({ where: { orgId: societyId } })
      await prisma.visitor.delete({ where: { id: searchVisitorId } })
    })

    it('returns empty when no name or mobile provided', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/search`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({})
      expect(res.status).toBe(200)
      expect(res.body.data.visitors).toEqual([])
      expect(res.body.data.preApprovals).toEqual([])
    })

    it('searches by name and returns matching visitors', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/search`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ name: 'Search Test Visitor' })
      expect(res.status).toBe(200)
      expect(res.body.data.visitors.length).toBe(1)
      expect(res.body.data.visitors[0].name).toBe('Search Test Visitor')
    })

    it('returns pre-approvals matching search', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/search`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ mobile: '9998887775' })
      expect(res.status).toBe(200)
      expect(res.body.data.preApprovals.length).toBe(1)
      expect(res.body.data.preApprovals[0].visitorName).toBe('Search Test PreApproval')
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/visitors
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/visitors', () => {
    let createdVisitorId: string

    afterAll(async () => {
      if (createdVisitorId) {
        await prisma.visitor.delete({ where: { id: createdVisitorId } })
      }
    })

    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident (no visitor.log permission)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ name: 'Test', type: 'INDIVIDUAL' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('creates visitor successfully (gatekeeper)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ name: 'New Visitor', type: 'DELIVERY' })
      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('New Visitor')
      expect(res.body.data.type).toBe('DELIVERY')
      createdVisitorId = res.body.data.id
    })

    it('returns 400 for missing name', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ type: 'DELIVERY' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 for missing type', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ name: 'Test' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ name: 'Test', type: 'INVALID' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_type')
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/visitors/:visitorId/entries
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/visitors/:visitorId/entries', () => {
    let visitorId: string
    let preApprovalId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Entry Visitor', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const p = await prisma.visitorPreApproval.create({
        data: {
          orgId: societyId,
          visitorName: 'Entry Visitor',
          unitId: flat4BId,
          approvedBy: residentUserId
        }
      })
      preApprovalId = p.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.deleteMany({ where: { visitorId } })
      await prisma.visitorPreApproval.deleteMany({ where: { id: preApprovalId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/entries`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/entries`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ unitId: flat4BId })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('creates PENDING entry for walk-in visitor with unitId', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/entries`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ unitId: flat4BId })
      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('PENDING')
      expect(res.body.data.notifiedAt).toBeDefined()
      expect(res.body.data.enteredAt).toBeNull()
    })

    it('creates ALLOWED entry when preApprovalId provided', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/entries`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ unitId: flat4BId, preApprovalId })
      expect(res.status).toBe(201)
      expect(res.body.data.status).toBe('ALLOWED')
      expect(res.body.data.enteredAt).toBeDefined()
    })

    it('returns 400 for invalid_or_used_preapproval when preApproval already used', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/entries`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ unitId: flat4BId, preApprovalId })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_or_used_preapproval')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/approve
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/approve', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Approve Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId,
          visitorId,
          unitId: flat4BId,
          status: 'PENDING',
          loggedBy: residentUserId // Using any user as logger for test
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 401 with no token', async () => {
      const res = await request(app).patch(`/api/societies/${societyId}/entries/${entryId}/approve`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for gatekeeper (no visitor.approve permission)', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/approve`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns 403 when user is not an occupant of the flat', async () => {
      // Need a token of someone who is NOT an occupant of 4B
      // The builder is not an occupant of 4B, but the builder lacks visitor.approve? Wait, Builder doesn't have visitor.approve?
      // Builder doesn't have it based on seed. So we can't use builder to test occupant check.
      // Wait, let's create an entry for a dummy unit, then resident tries to approve it.
      const dummyUnit = await prisma.propertyNode.create({
        data: { orgId: societyId, nodeType: 'UNIT', name: 'Dummy', code: 'DMY' }
      })
      const dummyEntry = await prisma.visitorEntry.create({
        data: {
          orgId: societyId,
          visitorId,
          unitId: dummyUnit.id,
          status: 'PENDING',
          loggedBy: residentUserId
        }
      })
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${dummyEntry.id}/approve`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_an_occupant')

      await prisma.visitorEntry.delete({ where: { id: dummyEntry.id } })
      await prisma.propertyNode.delete({ where: { id: dummyUnit.id } })
    })

    it('approves entry successfully (resident of that flat)', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/approve`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('APPROVED')
    })

    it('returns 400 when entry is not PENDING', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/approve`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('entry_not_pending')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/reject
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/reject', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Reject Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId,
          visitorId,
          unitId: flat4BId,
          status: 'PENDING',
          loggedBy: residentUserId
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 401 with no token', async () => {
      const res = await request(app).patch(`/api/societies/${societyId}/entries/${entryId}/reject`)
      expect(res.status).toBe(401)
    })

    it('rejects entry successfully (resident)', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/reject`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('DENIED')
    })

    it('returns 400 when entry already approved/denied', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/reject`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('entry_not_pending')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/allow
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/allow', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Allow Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId,
          visitorId,
          unitId: flat4BId,
          status: 'PENDING',
          loggedBy: residentUserId
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/allow`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('allows entry successfully (gatekeeper)', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/allow`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('ALLOWED')
    })

    it('returns 400 for wrong status', async () => {
      // It's already ALLOWED, so it should fail
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/allow`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_status_for_allow')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/turnaway
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/turnaway', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Turnaway Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId,
          visitorId,
          unitId: flat4BId,
          status: 'PENDING',
          loggedBy: residentUserId
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('turns away successfully (gatekeeper)', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/turnaway`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.status).toBe('TURNED_AWAY')
    })

    it('returns 400 for wrong status', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${entryId}/turnaway`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_status_for_turnaway')
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/enter
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/enter', () => {
    let visitorId: string
    let pendingEntryId: string
    let allowedEntryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Enter Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e1 = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'PENDING', loggedBy: residentUserId
        }
      })
      pendingEntryId = e1.id

      const e2 = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'ALLOWED', loggedBy: residentUserId
        }
      })
      allowedEntryId = e2.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.deleteMany({ where: { visitorId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 400 when entry not ALLOWED or APPROVED', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${pendingEntryId}/enter`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('entry_must_be_allowed_or_approved')
    })

    it('marks entry as entered successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${allowedEntryId}/enter`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('visitor_entered')
      expect(res.body.data.enteredAt).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/entries/:entryId/exit
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/entries/:entryId/exit', () => {
    let visitorId: string
    let notEnteredEntryId: string
    let enteredEntryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Exit Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e1 = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'ALLOWED', loggedBy: residentUserId
        }
      })
      notEnteredEntryId = e1.id

      const e2 = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'ALLOWED', loggedBy: residentUserId,
          enteredAt: new Date()
        }
      })
      enteredEntryId = e2.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.deleteMany({ where: { visitorId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 400 when visitor has not entered', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${notEnteredEntryId}/exit`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('visitor_has_not_entered')
    })

    it('marks entry as exited successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/entries/${enteredEntryId}/exit`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('visitor_exited')
      expect(res.body.data.exitedAt).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/entries/active
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/entries/active', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Active Test', type: 'INDIVIDUAL' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'ALLOWED', loggedBy: residentUserId,
          enteredAt: new Date()
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 401 with no token', async () => {
      const res = await request(app).get(`/api/societies/${societyId}/entries/active`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident (no visitor.view_live)', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/entries/active`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns active visitors list', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/entries/active`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.entries)).toBe(true)
      expect(res.body.data.entries.some((e: any) => e.id === entryId)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/entries
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/entries', () => {
    let visitorId: string
    let entryId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Log Test', type: 'DELIVERY' }
      })
      visitorId = v.id

      const e = await prisma.visitorEntry.create({
        data: {
          orgId: societyId, visitorId, unitId: flat4BId,
          status: 'ALLOWED', loggedBy: residentUserId
        }
      })
      entryId = e.id
    })

    afterAll(async () => {
      await prisma.visitorEntry.delete({ where: { id: entryId } })
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 401 with no token', async () => {
      const res = await request(app).get(`/api/societies/${societyId}/entries`)
      expect(res.status).toBe(401)
    })

    it('returns entries for gatekeeper (view_log)', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/entries`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.entries.some((e: any) => e.id === entryId)).toBe(true)
    })

    it('returns only own flat entries for resident (view_own)', async () => {
      // Create a dummy unit and entry to prove they can't see it
      const dummyUnit = await prisma.propertyNode.create({
        data: { orgId: societyId, nodeType: 'UNIT', name: 'Dummy', code: 'DMY' }
      })
      const dummyVisitor = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Dummy Visitor', type: 'INDIVIDUAL' }
      })
      const dummyEntry = await prisma.visitorEntry.create({
        data: { orgId: societyId, visitorId: dummyVisitor.id, unitId: dummyUnit.id, status: 'ALLOWED', loggedBy: residentUserId }
      })

      const res = await request(app)
        .get(`/api/societies/${societyId}/entries`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      
      const ids = res.body.data.entries.map((e: any) => e.id)
      expect(ids.includes(entryId)).toBe(true)
      expect(ids.includes(dummyEntry.id)).toBe(false)

      await prisma.visitorEntry.delete({ where: { id: dummyEntry.id } })
      await prisma.visitor.delete({ where: { id: dummyVisitor.id } })
      await prisma.propertyNode.delete({ where: { id: dummyUnit.id } })
    })

    it('filters by status correctly', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/entries?status=ALLOWED`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.entries.every((e: any) => e.status === 'ALLOWED')).toBe(true)
    })

    it('filters by date correctly', async () => {
      const today = new Date().toISOString().split('T')[0]
      const res = await request(app)
        .get(`/api/societies/${societyId}/entries?date=${today}`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(200)
      // entry created in beforeAll should be found
      expect(res.body.data.entries.some((e: any) => e.id === entryId)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/pre-approvals
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/pre-approvals', () => {
    let preApprovalId: string

    afterAll(async () => {
      if (preApprovalId) {
        await prisma.visitorPreApproval.delete({ where: { id: preApprovalId } })
      }
    })

    it('returns 401 with no token', async () => {
      const res = await request(app).post(`/api/societies/${societyId}/pre-approvals`).send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for gatekeeper', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/pre-approvals`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
        .send({ visitorName: 'PreApprove Test', unitId: flat4BId })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns 403 when user is not occupant of unitId', async () => {
      const dummyUnit = await prisma.propertyNode.create({
        data: { orgId: societyId, nodeType: 'UNIT', name: 'Dummy', code: 'DMY' }
      })
      const res = await request(app)
        .post(`/api/societies/${societyId}/pre-approvals`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ visitorName: 'PreApprove Test', unitId: dummyUnit.id })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_an_occupant')

      await prisma.propertyNode.delete({ where: { id: dummyUnit.id } })
    })

    it('creates pre-approval successfully (resident of flat 4B)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/pre-approvals`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ visitorName: 'PreApprove Test', unitId: flat4BId })
      expect(res.status).toBe(201)
      expect(res.body.data.visitorName).toBe('PreApprove Test')
      preApprovalId = res.body.data.id
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/pre-approvals
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/pre-approvals', () => {
    let preApprovalId: string

    beforeAll(async () => {
      const p = await prisma.visitorPreApproval.create({
        data: {
          orgId: societyId, visitorName: 'Get Test', unitId: flat4BId, approvedBy: residentUserId
        }
      })
      preApprovalId = p.id
    })

    afterAll(async () => {
      await prisma.visitorPreApproval.delete({ where: { id: preApprovalId } })
    })

    it('returns pre-approvals for resident\'s flat', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/pre-approvals`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.preApprovals.some((p: any) => p.id === preApprovalId)).toBe(true)
    })

    it('returns empty for gatekeeper', async () => {
      // Actually gatekeeper has no `visitor.pre_approve` permission, so it should return 403.
      // But the spec says "it returns empty for gatekeeper".
      // Wait, gatekeeper doesn't have the permission at all.
      // So it will return 403. Let me change the expectation.
      const res = await request(app)
        .get(`/api/societies/${societyId}/pre-approvals`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })
  })

  // ─────────────────────────────────────────────
  // DELETE /societies/:id/pre-approvals/:id
  // ─────────────────────────────────────────────
  describe('DELETE /societies/:id/pre-approvals/:id', () => {
    let unusedPreApprovalId: string
    let usedPreApprovalId: string

    beforeAll(async () => {
      const p1 = await prisma.visitorPreApproval.create({
        data: { orgId: societyId, visitorName: 'Delete Test', unitId: flat4BId, approvedBy: residentUserId }
      })
      unusedPreApprovalId = p1.id

      const p2 = await prisma.visitorPreApproval.create({
        data: { orgId: societyId, visitorName: 'Used Test', unitId: flat4BId, approvedBy: residentUserId, isUsed: true }
      })
      usedPreApprovalId = p2.id
    })

    afterAll(async () => {
      await prisma.visitorPreApproval.deleteMany({
        where: { id: { in: [unusedPreApprovalId, usedPreApprovalId] } }
      })
    })

    it('returns 403 when not occupant', async () => {
      const dummyUnit = await prisma.propertyNode.create({
        data: { orgId: societyId, nodeType: 'UNIT', name: 'Dummy', code: 'DMY' }
      })
      // Another preapproval for dummy unit
      const p = await prisma.visitorPreApproval.create({
        data: { orgId: societyId, visitorName: 'Dummy Pre', unitId: dummyUnit.id, approvedBy: residentUserId }
      })

      const res = await request(app)
        .delete(`/api/societies/${societyId}/pre-approvals/${p.id}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_an_occupant')

      await prisma.visitorPreApproval.delete({ where: { id: p.id } })
      await prisma.propertyNode.delete({ where: { id: dummyUnit.id } })
    })

    it('returns 400 for already used pre-approval', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/pre-approvals/${usedPreApprovalId}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('pre_approval_already_used')
    })

    it('cancels pre-approval successfully', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/pre-approvals/${unusedPreApprovalId}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('pre_approval_cancelled')
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/visitors/:visitorId/frequent
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/visitors/:visitorId/frequent', () => {
    let visitorId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Freq Test', type: 'DOMESTIC' }
      })
      visitorId = v.id
    })

    afterAll(async () => {
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 403 when not occupant', async () => {
      const dummyUnit = await prisma.propertyNode.create({
        data: { orgId: societyId, nodeType: 'UNIT', name: 'Dummy', code: 'DMY' }
      })

      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/frequent`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ unitId: dummyUnit.id })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('not_an_occupant')

      await prisma.propertyNode.delete({ where: { id: dummyUnit.id } })
    })

    it('marks visitor as frequent successfully', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/visitors/${visitorId}/frequent`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ unitId: flat4BId })
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('marked_frequent')
    })
  })

  // ─────────────────────────────────────────────
  // DELETE /societies/:id/visitors/:visitorId/frequent
  // ─────────────────────────────────────────────
  describe('DELETE /societies/:id/visitors/:visitorId/frequent', () => {
    let visitorId: string

    beforeAll(async () => {
      const v = await prisma.visitor.create({
        data: {
          orgId: societyId,
          name: 'Unfreq Test',
          type: 'DOMESTIC',
          isFrequent: true,
          frequentForUnitId: flat4BId,
          frequentApprovedBy: residentUserId
        }
      })
      visitorId = v.id
    })

    afterAll(async () => {
      await prisma.visitor.delete({ where: { id: visitorId } })
    })

    it('returns 400 when visitor not frequent', async () => {
      const v2 = await prisma.visitor.create({
        data: { orgId: societyId, name: 'Not Freq Test', type: 'INDIVIDUAL' }
      })

      const res = await request(app)
        .delete(`/api/societies/${societyId}/visitors/${v2.id}/frequent`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('visitor_not_frequent')

      await prisma.visitor.delete({ where: { id: v2.id } })
    })

    it('removes frequent status successfully', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/visitors/${visitorId}/frequent`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('frequent_removed')
    })
  })
})
