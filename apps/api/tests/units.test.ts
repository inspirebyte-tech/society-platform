import request from 'supertest'
import app from '../src/app'
import { prisma } from '../src/lib/prisma'
import { getTokens, getSocietyId, getMembershipId } from './setup'

let builderToken: string
let residentToken: string
let coResidentToken: string
let gatekeeperToken: string

let orgId: string
let flat4BId: string
let builderUserId: string
let arjunUserId: string
let gatekeeperUserId: string
let meeraUserId: string

let arjunMembershipId: string
let meeraMembershipId: string

let createdOwnershipId: string
let createdOccupancyId: string

// ─────────────────────────────────────────────
// Reset unit to clean seeded state
// ─────────────────────────────────────────────
const resetUnit = async () => {
  if (!flat4BId || !orgId) return

  // End all current occupancies
  await prisma.unitOccupancy.updateMany({
    where: { unitId: flat4BId, occupiedUntil: null },
    data: { occupiedUntil: new Date() }
  })

  // End all current ownerships except Arjun's original
  await prisma.unitOwnership.updateMany({
    where: {
      unitId: flat4BId,
      ownedUntil: null,
      person: { user: { phone: { not: '+919222222222' } } }
    },
    data: { ownedUntil: new Date() }
  })

  // Re-add Arjun's occupancy
  const arjunPerson = await prisma.person.findFirst({
    where: { user: { phone: '+919222222222' } }
  })
  const meeraPerson = await prisma.person.findFirst({
    where: { user: { phone: '+919444444444' } }
  })

  if (arjunPerson) {
    await prisma.unitOccupancy.create({
      data: {
        unitId: flat4BId,
        personId: arjunPerson.id,
        occupancyType: 'OWNER_RESIDENT',
        isPrimary: true,
        occupiedFrom: new Date()
      }
    })
  }

  if (meeraPerson) {
    await prisma.unitOccupancy.create({
      data: {
        unitId: flat4BId,
        personId: meeraPerson.id,
        occupancyType: 'FAMILY',
        isPrimary: false,
        occupiedFrom: new Date()
      }
    })
  }
}

beforeAll(async () => {
  const tokens = await getTokens()
  builderToken    = tokens['Builder']
  residentToken   = tokens['Resident']
  coResidentToken = tokens['Co-resident']
  gatekeeperToken = tokens['Gatekeeper']

  orgId = await getSocietyId()

  const builder = await prisma.user.findFirst({
    where: { phone: '+919111111111' }
  })
  const arjun = await prisma.user.findFirst({
    where: { phone: '+919222222222' }
  })
  const ramesh = await prisma.user.findFirst({
    where: { phone: '+919333333333' }
  })
  const meera = await prisma.user.findFirst({
    where: { phone: '+919444444444' }
  })

  builderUserId    = builder!.id
  arjunUserId      = arjun!.id
  gatekeeperUserId = ramesh!.id
  meeraUserId      = meera!.id

  const unit = await prisma.propertyNode.findFirst({
    where: { orgId, nodeType: 'UNIT', code: '4B' }
  })
  flat4BId = unit!.id

  arjunMembershipId = await getMembershipId(orgId, 'Resident')
  meeraMembershipId = await getMembershipId(orgId, 'Co-resident')
})
beforeAll(async () => {
  await resetUnit()
})

// ─────────────────────────────────────────────
// GET /societies/:id/units
// List all units
// ─────────────────────────────────────────────
describe('GET /societies/:id/units', () => {
  it('builder can list all units', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.units).toBeInstanceOf(Array)
    expect(res.body.data.units.length).toBeGreaterThan(0)
    expect(res.body.data.total).toBeDefined()
    expect(res.body.data.occupied).toBeDefined()
    expect(res.body.data.vacant).toBeDefined()
  })

  it('returns correct vacancy status', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    const flat4B = res.body.data.units.find((u: any) => u.id === flat4BId)
    expect(flat4B).toBeDefined()
    expect(flat4B.isVacant).toBe(false)
    expect(flat4B.primaryOwner).toBe('Arjun Mehta')
    expect(flat4B.primaryOccupant).toBe('Arjun Mehta')
    expect(flat4B.occupancyType).toBe('OWNER_RESIDENT')
  })

  it('filters by status=vacant', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units?status=vacant`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(200)
    res.body.data.units.forEach((u: any) => {
      expect(u.isVacant).toBe(true)
    })
  })

  it('filters by status=occupied', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units?status=occupied`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(200)
    res.body.data.units.forEach((u: any) => {
      expect(u.isVacant).toBe(false)
    })
  })

  it('resident cannot list all units — 403', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units`)
      .set('Authorization', `Bearer ${residentToken}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('insufficient_permissions')
  })

  it('gatekeeper cannot list all units — 403', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units`)
      .set('Authorization', `Bearer ${gatekeeperToken}`)

    expect(res.status).toBe(403)
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units`)

    expect(res.status).toBe(401)
    expect(res.body.error).toBe('no_token')
  })

  it('wrong orgId — 403', async () => {
    const res = await request(app)
      .get('/api/societies/00000000-0000-0000-0000-000000000000/units')
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(403)
  })
})

// ─────────────────────────────────────────────
// GET /societies/:id/units/:nodeId
// Unit detail
// ─────────────────────────────────────────────
describe('GET /societies/:id/units/:nodeId', () => {
  it('builder can view unit detail', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(flat4BId)
    expect(res.body.data.name).toBe('Flat 4B')
    expect(res.body.data.isVacant).toBe(false)
    expect(res.body.data.owners).toBeInstanceOf(Array)
    expect(res.body.data.currentOccupants).toBeInstanceOf(Array)
    expect(res.body.data.occupancyHistory).toBeInstanceOf(Array)
  })

  it('returns owners correctly', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const primaryOwner = res.body.data.owners.find(
      (o: any) => o.isPrimary === true
    )
    expect(primaryOwner).toBeDefined()
    expect(primaryOwner.name).toBe('Arjun Mehta')
    expect(primaryOwner.ownershipType).toBe('PRIMARY_OWNER')
  })

  it('returns current occupants correctly', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const arjun = res.body.data.currentOccupants.find(
      (o: any) => o.name === 'Arjun Mehta'
    )
    const meera = res.body.data.currentOccupants.find(
      (o: any) => o.name === 'Meera Mehta'
    )
    expect(arjun).toBeDefined()
    expect(arjun.occupancyType).toBe('OWNER_RESIDENT')
    expect(arjun.isPrimary).toBe(true)
    expect(meera).toBeDefined()
    expect(meera.occupancyType).toBe('FAMILY')
    expect(meera.isPrimary).toBe(false)
  })

  it('resident can view own unit detail', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${residentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(flat4BId)
  })

  it('non-existent unit — 404', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('unit_not_found')
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────
// POST /societies/:id/units/:nodeId/ownership
// Assign ownership
// ─────────────────────────────────────────────
  describe('POST /societies/:id/units/:nodeId/ownership', () => {
    beforeEach(async () => {
      await resetUnit()
    })
  it('builder can assign CO_OWNER ownership', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: gatekeeperUserId,
        ownershipType: 'CO_OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(201)
    expect(res.body.data.ownershipType).toBe('CO_OWNER')
    expect(res.body.data.isPrimary).toBe(false)
    expect(res.body.data.member.name).toBe('Ramesh Gate')

    createdOwnershipId = res.body.data.id
  })

  it('cannot add second primary owner — 400 already_has_primary', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: gatekeeperUserId,
        ownershipType: 'PRIMARY_OWNER',
        isPrimary: true
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_has_primary')
  })

  it('missing userId — 400 missing_field', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ ownershipType: 'CO_OWNER' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('missing_field')
    expect(res.body.details.field).toBe('userId')
  })

  it('missing ownershipType — 400 missing_field', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ userId: builderUserId })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('missing_field')
    expect(res.body.details.field).toBe('ownershipType')
  })

  it('invalid ownershipType — 400', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: builderUserId,
        ownershipType: 'SOLE',
        isPrimary: false
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_ownership_type')
  })

  it('non-existent member — 404', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: '00000000-0000-0000-0000-000000000000',
        ownershipType: 'CO_OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('member_not_found')
  })

  it('resident cannot assign ownership — 403', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        userId: arjunUserId,
        ownershipType: 'CO_OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(403)
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .send({
        userId: builderUserId,
        ownershipType: 'CO_OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(401)
  })

  it('cannot assign same member twice — 400 already_owner', async () => {
      const res = await request(app)
        .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          userId: arjunUserId,
          ownershipType: 'CO_OWNER',
          isPrimary: false
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toBe('already_owner')
    })

  it('cannot self-assign to flat with existing different owner — 400', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: builderUserId,
        ownershipType: 'CO_OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('cannot_self_assign_occupied')
  })
})

// ─────────────────────────────────────────────
// POST /societies/:id/units/:nodeId/occupancy
// Assign occupancy
// ─────────────────────────────────────────────
  describe('POST /societies/:id/units/:nodeId/occupancy', () => {
    beforeEach(async () => {
      await resetUnit()
    })
  it('builder can assign CARETAKER occupancy', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: gatekeeperUserId,
        occupancyType: 'CARETAKER',
        isPrimary: false
      })

    expect(res.status).toBe(201)
    expect(res.body.data.occupancyType).toBe('CARETAKER')
    expect(res.body.data.isPrimary).toBe(false)
    expect(res.body.data.member.name).toBe('Ramesh Gate')

    createdOccupancyId = res.body.data.id
  })

  it('cannot add member already occupying same unit — 400', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: arjunUserId,
        occupancyType: 'TENANT',
        isPrimary: false
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_occupying')
  })

  it('cannot add second primary occupant — 400 already_has_primary', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: builderUserId,
        occupancyType: 'OWNER_RESIDENT',
        isPrimary: true
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_has_primary')
  })

  it('invalid occupancyType — 400', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: gatekeeperUserId,
        occupancyType: 'OWNER',
        isPrimary: false
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('invalid_occupancy_type')
  })

  it('missing occupancyType — 400 missing_field', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ userId: gatekeeperUserId })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('missing_field')
    expect(res.body.details.field).toBe('occupancyType')
  })

  it('missing userId — 400 missing_field', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ occupancyType: 'CARETAKER' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('missing_field')
    expect(res.body.details.field).toBe('userId')
  })

  it('non-existent member — 404', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        userId: '00000000-0000-0000-0000-000000000000',
        occupancyType: 'TENANT',
        isPrimary: false
      })

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('member_not_found')
  })

  it('resident cannot assign occupancy — 403', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${residentToken}`)
      .send({
        userId: gatekeeperUserId,
        occupancyType: 'CARETAKER',
        isPrimary: false
      })

    expect(res.status).toBe(403)
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .send({
        userId: gatekeeperUserId,
        occupancyType: 'CARETAKER',
        isPrimary: false
      })

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────
// GET /societies/:id/members/:memberId/units
// Member's units — My Home
// ─────────────────────────────────────────────
  describe('GET /societies/:id/members/:memberId/units', () => {
    beforeEach(async () => {
      await resetUnit()
    })
  it('builder can view any member units', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ownerships).toBeInstanceOf(Array)
    expect(res.body.data.occupancies).toBeInstanceOf(Array)
    expect(res.body.data.ownerships.length).toBeGreaterThan(0)
    expect(res.body.data.occupancies.length).toBeGreaterThan(0)
  })

  it('returns correct ownership data for Arjun', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    const ownership = res.body.data.ownerships[0]
    expect(ownership.flatName).toBe('Flat 4B')
    expect(ownership.ownershipType).toBe('PRIMARY_OWNER')
    expect(ownership.isPrimary).toBe(true)
    expect(ownership.coOwners).toBeInstanceOf(Array)
  })

  it('returns correct occupancy data for Arjun', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    const occupancy = res.body.data.occupancies[0]
    expect(occupancy.flatName).toBe('Flat 4B')
    expect(occupancy.occupancyType).toBe('OWNER_RESIDENT')
    expect(occupancy.isPrimary).toBe(true)
    expect(occupancy.coOccupants).toBeInstanceOf(Array)
  })

  it('resident can view own units', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)
      .set('Authorization', `Bearer ${residentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.ownerships.length).toBeGreaterThan(0)
  })

  it('co-resident can view own units', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${meeraMembershipId}/units`)
      .set('Authorization', `Bearer ${coResidentToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.occupancies.length).toBeGreaterThan(0)
    expect(res.body.data.ownerships).toHaveLength(0)
  })

  it('resident cannot view another members units — 403', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${meeraMembershipId}/units`)
      .set('Authorization', `Bearer ${residentToken}`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('insufficient_permissions')
  })

  it('co-resident cannot view another members units — 403', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)
      .set('Authorization', `Bearer ${coResidentToken}`)

    expect(res.status).toBe(403)
  })

  it('non-existent member — 404', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/00000000-0000-0000-0000-000000000000/units`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(res.status).toBe(404)
    expect(res.body.error).toBe('member_not_found')
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .get(`/api/societies/${orgId}/members/${arjunMembershipId}/units`)

    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────
// DELETE /societies/:id/units/:nodeId/ownership/:ownershipId
// End ownership
// ─────────────────────────────────────────────
describe('DELETE /societies/:id/units/:nodeId/ownership/:ownershipId', () => {
  let ownershipToDeleteId: string

  beforeAll(async () => {
    await resetUnit()
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ userId: gatekeeperUserId, ownershipType: 'CO_OWNER', isPrimary: false })
    ownershipToDeleteId = res.body.data.id
  })

  it('builder can end ownership', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/${ownershipToDeleteId}`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('ownership_ended')
    expect(res.body.data.ownedUntil).not.toBeNull()
  })

  it('cannot end already ended ownership — 400', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/${ownershipToDeleteId}`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_ended')
  })

  it('non-existent ownership — 404', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('ownership_not_found')
  })

  it('resident cannot end ownership — 403', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/${ownershipToDeleteId}`)
      .set('Authorization', `Bearer ${residentToken}`)
    expect(res.status).toBe(403)
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/${ownershipToDeleteId}`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────
// DELETE /societies/:id/units/:nodeId/occupancy/:occupancyId
// End occupancy
// ─────────────────────────────────────────────
describe('DELETE /societies/:id/units/:nodeId/occupancy/:occupancyId', () => {
  let occupancyToDeleteId: string

  beforeAll(async () => {
    await resetUnit()
    const res = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/occupancy`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ userId: gatekeeperUserId, occupancyType: 'CARETAKER', isPrimary: false })
    occupancyToDeleteId = res.body.data.id
  })

  it('builder can end occupancy', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${occupancyToDeleteId}`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(200)
    expect(res.body.data.message).toBe('occupancy_ended')
    expect(res.body.data.occupiedUntil).not.toBeNull()
  })

  it('cannot end already ended occupancy — 400', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${occupancyToDeleteId}`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('already_ended')
  })

  it('non-existent occupancy — 404', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${builderToken}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('occupancy_not_found')
  })

  it('resident cannot end occupancy — 403', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${occupancyToDeleteId}`)
      .set('Authorization', `Bearer ${residentToken}`)
    expect(res.status).toBe(403)
  })

  it('no token — 401', async () => {
    const res = await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${occupancyToDeleteId}`)
    expect(res.status).toBe(401)
  })
})

// ─────────────────────────────────────────────
// History and vacancy tracking
// ─────────────────────────────────────────────
describe('History and vacancy tracking', () => {
  beforeEach(async () => {
    await resetUnit()
  })

  it('ended occupancy appears in occupancyHistory', async () => {
    const detail = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const arjunOcc = detail.body.data.currentOccupants.find(
      (o: any) => o.name === 'Arjun Mehta'
    )

    await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${arjunOcc.id}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const history = res.body.data.occupancyHistory
    const arjun = history.find((h: any) => h.name === 'Arjun Mehta')
    expect(arjun).toBeDefined()
    expect(arjun.occupiedUntil).not.toBeNull()
  })

  it('ended occupant not in currentOccupants', async () => {
    const detail = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const arjunOcc = detail.body.data.currentOccupants.find(
      (o: any) => o.name === 'Arjun Mehta'
    )

    await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${arjunOcc.id}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const current = res.body.data.currentOccupants
    const arjun = current.find((o: any) => o.name === 'Arjun Mehta')
    expect(arjun).toBeUndefined()
  })

  it('ended ownership not in active owners', async () => {
    const assign = await request(app)
      .post(`/api/societies/${orgId}/units/${flat4BId}/ownership`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ userId: gatekeeperUserId, ownershipType: 'CO_OWNER', isPrimary: false })

    await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/ownership/${assign.body.data.id}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const res = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const owners = res.body.data.owners
    const builder = owners.find((o: any) => o.name === 'Vikram Builder')
    expect(builder).toBeUndefined()
  })

  it('unit with no occupants shows isVacant true', async () => {
    const detail = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const arjunOcc = detail.body.data.currentOccupants.find(
      (o: any) => o.name === 'Arjun Mehta'
    )
    const meeraOcc = detail.body.data.currentOccupants.find(
      (o: any) => o.name === 'Meera Mehta'
    )

    await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${arjunOcc.id}`)
      .set('Authorization', `Bearer ${builderToken}`)

    await request(app)
      .delete(`/api/societies/${orgId}/units/${flat4BId}/occupancy/${meeraOcc.id}`)
      .set('Authorization', `Bearer ${builderToken}`)

    const vacantRes = await request(app)
      .get(`/api/societies/${orgId}/units/${flat4BId}`)
      .set('Authorization', `Bearer ${builderToken}`)

    expect(vacantRes.body.data.isVacant).toBe(true)
    expect(vacantRes.body.data.currentOccupants).toHaveLength(0)

    const listRes = await request(app)
      .get(`/api/societies/${orgId}/units?status=vacant`)
      .set('Authorization', `Bearer ${builderToken}`)

    const vacantFlat = listRes.body.data.units.find(
      (u: any) => u.id === flat4BId
    )
    expect(vacantFlat).toBeDefined()
    expect(vacantFlat.isVacant).toBe(true)
  })
})

afterAll(async () => {
  // Restore clean state for other test suites
  await resetUnit()
  await prisma.$disconnect()
})