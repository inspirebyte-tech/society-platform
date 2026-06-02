import request from 'supertest'
import app from '../src/app'
import { getTokens, getSocietyId } from './setup'
import { prisma } from '../src/lib/prisma'

describe('Notifications', () => {
  let builderToken: string
  let residentToken: string
  let societyId: string
  let residentUserId: string
  let builderUserId: string
  // notifIds ordered oldest → newest: [0] notif1, [1] notif2, [2] notif3
  let notifIds: string[]

  beforeAll(async () => {
    const tokens = await getTokens()
    builderToken  = tokens['Builder']
    residentToken = tokens['Resident']
    societyId     = await getSocietyId()

    const resident = await prisma.user.findFirst({
      where: { phone: '+919222222222' }
    })
    const builder = await prisma.user.findFirst({
      where: { phone: '+919111111111' }
    })
    residentUserId = resident!.id
    builderUserId  = builder!.id

    // Clear any notifications left by other test suites before seeding
    await prisma.userNotification.deleteMany({ where: { userId: residentUserId } })
    await prisma.userNotification.deleteMany({ where: { userId: builderUserId } })

    // Explicit createdAt so ordering is deterministic across all tests
    await prisma.userNotification.createMany({
      data: [
        {
          userId: residentUserId,
          orgId:  societyId,
          title:  'Test Notification 1',
          body:   'Body 1',
          screen: 'Announcements',
          data:   { orgId: societyId },
          isRead: false,
          createdAt: new Date('2026-01-01T10:00:00Z'),
        },
        {
          userId: residentUserId,
          orgId:  societyId,
          title:  'Test Notification 2',
          body:   'Body 2',
          screen: 'ComplaintDetail',
          data:   { orgId: societyId },
          isRead: true,
          createdAt: new Date('2026-01-02T10:00:00Z'),
        },
        {
          userId: residentUserId,
          orgId:  societyId,
          title:  'Test Notification 3',
          body:   'Body 3',
          screen: 'VisitorApproval',
          data:   { orgId: societyId },
          isRead: false,
          createdAt: new Date('2026-01-03T10:00:00Z'),
        },
      ]
    })

    const created = await prisma.userNotification.findMany({
      where:   { userId: residentUserId },
      orderBy: { createdAt: 'asc' }
    })
    notifIds = created.map(n => n.id)
  })

  afterAll(async () => {
    await prisma.userNotification.deleteMany({ where: { userId: residentUserId } })
    await prisma.userNotification.deleteMany({ where: { userId: builderUserId } })
  })

  // ─────────────────────────────────────────────
  // GET /api/notifications/unread-count
  // ─────────────────────────────────────────────
  describe('GET /api/notifications/unread-count', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app).get('/api/notifications/unread-count')
      expect(res.status).toBe(401)
    })

    it('returns unread count for resident (should be 2)', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.count).toBe(2)
    })

    it('returns 0 for builder (no notifications created for them)', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${builderToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.count).toBe(0)
    })
  })

  // ─────────────────────────────────────────────
  // GET /api/notifications
  // ─────────────────────────────────────────────
  describe('GET /api/notifications', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app).get('/api/notifications')
      expect(res.status).toBe(401)
    })

    it('returns notifications for resident newest first', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      const notifs = res.body.data.notifications
      expect(Array.isArray(notifs)).toBe(true)
      expect(notifs.length).toBe(3)
      // Descending order
      for (let i = 1; i < notifs.length; i++) {
        expect(new Date(notifs[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(notifs[i].createdAt).getTime()
        )
      }
      expect(notifs[0].title).toBe('Test Notification 3')
      expect(notifs[2].title).toBe('Test Notification 1')
    })

    it('returns only resident notifications not builder notifications', async () => {
      const builderRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${builderToken}`)
      expect(builderRes.status).toBe(200)
      expect(builderRes.body.data.notifications.length).toBe(0)

      const residentRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(residentRes.status).toBe(200)
      expect(residentRes.body.data.notifications.length).toBe(3)
    })

    it('respects limit query param', async () => {
      const res = await request(app)
        .get('/api/notifications?limit=1')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.notifications.length).toBe(1)
      // Newest first
      expect(res.body.data.notifications[0].title).toBe('Test Notification 3')
    })

    it('returns hasMore true when more exist', async () => {
      const res = await request(app)
        .get('/api/notifications?limit=2')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.notifications.length).toBe(2)
      expect(res.body.data.hasMore).toBe(true)
      expect(res.body.data.nextCursor).not.toBeNull()
    })

    it('returns hasMore false when all returned', async () => {
      const res = await request(app)
        .get('/api/notifications?limit=10')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(res.status).toBe(200)
      expect(res.body.data.notifications.length).toBe(3)
      expect(res.body.data.hasMore).toBe(false)
      expect(res.body.data.nextCursor).toBeNull()
    })

    it('filters by before cursor correctly', async () => {
      // Page 1: limit=2 returns notif3, notif2 — cursor points at notif2
      const page1 = await request(app)
        .get('/api/notifications?limit=2')
        .set('Authorization', `Bearer ${residentToken}`)
      expect(page1.status).toBe(200)
      const cursor = page1.body.data.nextCursor
      expect(cursor).not.toBeNull()

      // Page 2: before=cursor should return only notif1
      const page2 = await request(app)
        .get(`/api/notifications?before=${encodeURIComponent(cursor)}`)
        .set('Authorization', `Bearer ${residentToken}`)
      expect(page2.status).toBe(200)
      expect(page2.body.data.notifications.length).toBe(1)
      expect(page2.body.data.notifications[0].title).toBe('Test Notification 1')
      expect(page2.body.data.hasMore).toBe(false)
      expect(page2.body.data.nextCursor).toBeNull()
    })
  })

  // ─────────────────────────────────────────────
  // PATCH /api/notifications/read
  // Tests run in sequence — each builds on previous state
  // Starting state: notif1 unread, notif2 read, notif3 unread
  // ─────────────────────────────────────────────
  describe('PATCH /api/notifications/read', () => {
    it('returns 401 with no token', async () => {
      const res = await request(app).patch('/api/notifications/read').send({})
      expect(res.status).toBe(401)
    })

    it('marks specific notifications as read when ids provided', async () => {
      // notifIds[0] = notif1 (isRead: false)
      const res = await request(app)
        .patch('/api/notifications/read')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ ids: [notifIds[0]] })
      expect(res.status).toBe(200)
      expect(res.body.data.updated).toBe(1)

      const notif = await prisma.userNotification.findUnique({ where: { id: notifIds[0] } })
      expect(notif?.isRead).toBe(true)
    })

    it('marks all unread as read when no ids provided', async () => {
      // After previous test: notif1 read, notif2 read, notif3 still unread → 1 remaining
      const res = await request(app)
        .patch('/api/notifications/read')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({})
      expect(res.status).toBe(200)
      expect(res.body.data.updated).toBe(1)

      const unreadCount = await prisma.userNotification.count({
        where: { userId: residentUserId, isRead: false }
      })
      expect(unreadCount).toBe(0)
    })

    it('cannot mark another user notifications as read', async () => {
      const builderNotif = await prisma.userNotification.create({
        data: {
          userId: builderUserId,
          orgId:  societyId,
          title:  'Builder Notification',
          body:   'Should not be markable by resident',
          isRead: false,
        }
      })

      // updateMany is scoped to userId — silently updates 0 records
      const res = await request(app)
        .patch('/api/notifications/read')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({ ids: [builderNotif.id] })
      expect(res.status).toBe(200)
      expect(res.body.data.updated).toBe(0)

      const unchanged = await prisma.userNotification.findUnique({ where: { id: builderNotif.id } })
      expect(unchanged?.isRead).toBe(false)
    })

    it('returns updated count', async () => {
      // All resident notifications are already read — marking all unread returns 0
      const res = await request(app)
        .patch('/api/notifications/read')
        .set('Authorization', `Bearer ${residentToken}`)
        .send({})
      expect(res.status).toBe(200)
      expect(typeof res.body.data.updated).toBe('number')
      expect(res.body.data.updated).toBe(0)
    })
  })
})
