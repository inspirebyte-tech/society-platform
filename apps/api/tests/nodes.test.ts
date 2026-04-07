import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'
import { prisma } from '../src/lib/prisma'

describe('Nodes', () => {
  let builderToken: string
  let residentToken: string
  let gatekeeperToken: string
  let societyId: string
  let rootNodeId: string
  let towerAId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken = tokens['Builder']
    residentToken = tokens['Resident']
    gatekeeperToken = tokens['Gatekeeper']
    societyId = await getSocietyId()

    // get root node and tower A from seed data
    const rootNode = await prisma.propertyNode.findFirst({
      where: { orgId: societyId, nodeType: 'SOCIETY' }
    })
    rootNodeId = rootNode!.id

    const towerA = await prisma.propertyNode.findFirst({
      where: { orgId: societyId, nodeType: 'TOWER' }
    })
    towerAId = towerA!.id
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/nodes
  // ─────────────────────────────────────────────
  describe('GET /societies/:id/nodes', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/nodes`)
      expect(res.status).toBe(401)
      expect(res.body.error).toBe('no_token')
    })

    it('returns 200 for builder', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.nodeType).toBe('SOCIETY')
      expect(Array.isArray(res.body.data.children)).toBe(true)
    })

    it('returns 403 for resident', async () => {
  const res = await request(app)
    .get(`/api/societies/${societyId}/nodes`)
    .set('Authorization', `Bearer ${residentToken}`)
  expect(res.status).toBe(403)
  expect(res.body.error).toBe('insufficient_permissions')
})

    it('returns 403 for gatekeeper', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${gatekeeperToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('returns nested tree structure', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.children.length).toBeGreaterThan(0)
      expect(res.body.data.children[0].nodeType).toBe('TOWER')
      expect(res.body.data.children[0].children.length).toBeGreaterThan(0)
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/nodes
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/nodes', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({
          parentId: rootNodeId,
          nodeType: 'TOWER',
          name: 'Tower X',
          code: 'TX'
        })
      expect(res.status).toBe(403)
    })

    it('returns 400 with missing fields', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Tower B' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid nodeType', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: rootNodeId,
          nodeType: 'INVALID',
          name: 'Tower B',
          code: 'TB'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_node_type')
    })

    it('returns 400 with invalid parentId', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: '00000000-0000-0000-0000-000000000000',
          nodeType: 'TOWER',
          name: 'Tower B',
          code: 'TB'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_parent')
    })

    it('creates node successfully', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: rootNodeId,
          nodeType: 'TOWER',
          name: 'Tower B',
          code: 'TB'
        })
      expect(res.status).toBe(201)
      expect(res.body.data.name).toBe('Tower B')
      expect(res.body.data.nodeType).toBe('TOWER')
      expect(res.body.data.code).toBe('TB')
    })

    it('returns 400 for duplicate code under same parent', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: rootNodeId,
          nodeType: 'TOWER',
          name: 'Tower B Again',
          code: 'TB'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('duplicate_code')
    })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/nodes/bulk
  // ─────────────────────────────────────────────
  describe('POST /societies/:id/nodes/bulk', () => {
    it('returns 400 with missing fields', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes/bulk`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ parentId: towerAId })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 with invalid count', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes/bulk`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: towerAId,
          nodeType: 'UNIT',
          count: 600,
          startNumber: 201
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_count')
    })

    it('creates bulk nodes successfully', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes/bulk`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: towerAId,
          nodeType: 'UNIT',
          count: 3,
          startNumber: 201,
          prefix: 'Flat'
        })
      expect(res.status).toBe(201)
      expect(res.body.data.created).toBe(3)
      expect(res.body.data.nodes.length).toBe(3)
      expect(res.body.data.nodes[0].name).toBe('Flat 201')
    })

    it('returns 400 for duplicate codes in bulk', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/nodes/bulk`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: towerAId,
          nodeType: 'UNIT',
          count: 3,
          startNumber: 201,
          prefix: 'Flat'
        })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('duplicate_code')
      expect(res.body.details.existing).toBeDefined()
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/nodes/:nodeId
  // ─────────────────────────────────────────────
  describe('PATCH /societies/:id/nodes/:nodeId', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/nodes/${towerAId}`)
      expect(res.status).toBe(401)
    })

    it('returns 400 with no fields', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/nodes/${towerAId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('no_fields_provided')
    })

    it('updates node successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/nodes/${towerAId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ name: 'Tower A Updated' })
      expect(res.status).toBe(200)
      expect(res.body.data.name).toBe('Tower A Updated')
    })

    it('merges metadata correctly', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/nodes/${towerAId}`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ metadata: { floors: 10 } })
      expect(res.status).toBe(200)
      expect(res.body.data.metadata).toMatchObject({ floors: 10 })
    })

    it('returns 400 for duplicate code on PATCH', async () => {
    // rootNode has code 'GV', towerA has code 'TA'
    // both are under same parent (null for root, root for tower)
    // try to create tower C then give it tower A's code
    const towerC = await request(app)
      .post(`/api/societies/${societyId}/nodes`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({
        parentId: rootNodeId,
        nodeType: 'TOWER',
        name: 'Tower C',
        code: 'TC'
      })
    const towerCId = towerC.body.data.id

    const res = await request(app)
      .patch(`/api/societies/${societyId}/nodes/${towerCId}`)
      .set('Authorization', `Bearer ${builderToken}`)
      .send({ code: 'TA' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('duplicate_code')
  })
  })

  // ─────────────────────────────────────────────
  // DELETE /societies/:id/nodes/:nodeId
  // ─────────────────────────────────────────────
  describe('DELETE /societies/:id/nodes/:nodeId', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/nodes/${towerAId}`)
      expect(res.status).toBe(401)
    })

    it('returns 400 when node has children', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/nodes/${towerAId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('has_children')
    })

    it('deletes leaf node successfully', async () => {
      // create a node with no children
      const created = await request(app)
        .post(`/api/societies/${societyId}/nodes`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({
          parentId: rootNodeId,
          nodeType: 'COMMON_AREA',
          name: 'Parking',
          code: 'PKG'
        })
      const nodeId = created.body.data.id

      const res = await request(app)
        .delete(`/api/societies/${societyId}/nodes/${nodeId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('node_deleted')
    })

    it('returns 400 when unit has active ownership', async () => {
      // get Flat 4B which has Arjun as owner
      const flat4B = await prisma.propertyNode.findFirst({
        where: { orgId: societyId, code: '4B' }
      })
      const res = await request(app)
        .delete(`/api/societies/${societyId}/nodes/${flat4B!.id}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('has_active_ownership')
    })
  })
})