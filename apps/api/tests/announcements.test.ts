import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'
import { prisma } from '../src/lib/prisma'

describe('Announcements', () => {
  let builderToken: string
  let residentToken: string
  let societyId: string
  let announcementId: string

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken  = tokens['Builder']
    residentToken = tokens['Resident']
    societyId     = await getSocietyId()

    // Clean up any announcements from previous runs
    await prisma.announcement.deleteMany({ where: { orgId: societyId } })
  })

  // ─────────────────────────────────────────────
  // POST /societies/:id/announcements
  // ─────────────────────────────────────────────
  describe('POST /announcements', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .send({})
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ title: 'Test', body: 'Test body' })
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('creates announcement successfully (builder)', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Water Supply Shutdown', body: 'Water will be cut on Sunday 9am–1pm' })
      expect(res.status).toBe(201)
      expect(res.body.data.title).toBe('Water Supply Shutdown')
      expect(res.body.data.category).toBe('GENERAL')
      expect(res.body.data.isPinned).toBe(false)
      expect(res.body.data.createdBy.name).toBeDefined()
      announcementId = res.body.data.id
    })

    it('creates with category MAINTENANCE', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Lift Maintenance', body: 'Lift A will be serviced on Monday', category: 'MAINTENANCE' })
      expect(res.status).toBe(201)
      expect(res.body.data.category).toBe('MAINTENANCE')
    })

    it('returns 400 for missing title', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ body: 'Some body text' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 for missing body', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Some title' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('missing_field')
    })

    it('returns 400 for invalid category', async () => {
      const res = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Test', body: 'Test body', category: 'INVALID' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('invalid_category')
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/announcements
  // ─────────────────────────────────────────────
  describe('GET /announcements', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements`)
      expect(res.status).toBe(401)
    })

    it('returns 200 with announcements list', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data.announcements)).toBe(true)
    })

    it('returns announcements newest first within non-pinned', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      const unpinned = res.body.data.announcements.filter((a: any) => !a.isPinned)
      for (let i = 1; i < unpinned.length; i++) {
        expect(new Date(unpinned[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(unpinned[i].createdAt).getTime()
        )
      }
    })

    it('returns pinned announcements first', async () => {
      // Pin the first announcement
      await request(app)
        .patch(`/api/societies/${societyId}/announcements/${announcementId}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)

      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.announcements[0].isPinned).toBe(true)
    })

    it('filters by category correctly', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements?category=MAINTENANCE`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.announcements.every((a: any) => a.category === 'MAINTENANCE')).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // GET /societies/:id/announcements/:id
  // ─────────────────────────────────────────────
  describe('GET /announcements/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements/${announcementId}`)
      expect(res.status).toBe(401)
    })

    it('returns 404 for non-existent', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('announcement_not_found')
    })

    it('returns full announcement details', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.id).toBe(announcementId)
      expect(res.body.data.title).toBe('Water Supply Shutdown')
      expect(res.body.data.body).toBeDefined()
      expect(res.body.data.category).toBeDefined()
      expect(res.body.data.createdBy.name).toBeDefined()
      expect(res.body.data.createdBy.phone).toBeDefined()
      expect(Array.isArray(res.body.data.images)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /societies/:id/announcements/:id/pin
  // ─────────────────────────────────────────────
  describe('PATCH /announcements/:id/pin', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/announcements/${announcementId}/pin`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/announcements/${announcementId}/pin`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('unpins an announcement successfully', async () => {
      // announcementId is currently pinned from the GET test above
      const res = await request(app)
        .patch(`/api/societies/${societyId}/announcements/${announcementId}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('pin_updated')
      expect(res.body.data.isPinned).toBe(false)
    })

    it('pins an announcement successfully', async () => {
      const res = await request(app)
        .patch(`/api/societies/${societyId}/announcements/${announcementId}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.isPinned).toBe(true)
    })

    it('returns 400 when trying to pin 4th announcement', async () => {
      // Create 2 more announcements and pin them (announcementId is already pinned = 1 pinned)
      const second = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Pin Test 2', body: 'Body 2' })
      await request(app)
        .patch(`/api/societies/${societyId}/announcements/${second.body.data.id}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)

      const third = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Pin Test 3', body: 'Body 3' })
      await request(app)
        .patch(`/api/societies/${societyId}/announcements/${third.body.data.id}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)

      // Now 3 are pinned — try to pin a 4th
      const fourth = await request(app)
        .post(`/api/societies/${societyId}/announcements`)
        .set('Authorization', `Bearer ${builderToken}`)
        .send({ title: 'Pin Test 4', body: 'Body 4' })

      const res = await request(app)
        .patch(`/api/societies/${societyId}/announcements/${fourth.body.data.id}/pin`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('max_pinned_reached')
    })
  })

  // ─────────────────────────────────────────────
  // DELETE /societies/:id/announcements/:id
  // ─────────────────────────────────────────────
  describe('DELETE /announcements/:id', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/announcements/${announcementId}`)
      expect(res.status).toBe(401)
    })

    it('returns 403 for resident', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(403)
      expect(res.body.error).toBe('insufficient_permissions')
    })

    it('deletes announcement successfully', async () => {
      const res = await request(app)
        .delete(`/api/societies/${societyId}/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.message).toBe('announcement_deleted')
    })

    it('returns 404 after deletion', async () => {
      const res = await request(app)
        .get(`/api/societies/${societyId}/announcements/${announcementId}`)
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('announcement_not_found')
    })
  })
})
