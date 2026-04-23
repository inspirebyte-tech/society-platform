import express from 'express'
import testRouter from './routes/test'
import authRouter from './routes/auth'
import societiesRouter from './routes/societies'
import nodesRouter from './routes/nodes'
import invitationsRouter from './routes/invitations'
import membersRouter from './routes/members'
import deviceTokensRouter from './routes/deviceTokens'
import complaintsRouter from './routes/complaints'
import announcementsRouter from './routes/announcements'
import unitsRouter from './routes/units'
import { enforceTenantContext } from './middleware/tenantContext'
import { errorHandler } from './middleware/error'
import { apiRateLimit } from './middleware/rateLimit'
import { initNotificationDispatcher } from './notifications/dispatcher'

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(apiRateLimit)

app.use('/api', testRouter)
app.use('/api/auth', authRouter)
app.use('/api/societies', societiesRouter)
app.use('/api/societies', nodesRouter)
app.use('/api/societies', invitationsRouter)
app.use('/api/societies', membersRouter)
app.use('/api/auth', deviceTokensRouter)
app.use('/api/societies', complaintsRouter)
app.use('/api/societies', announcementsRouter)
app.use('/api/societies', unitsRouter)

// Initialize notification dispatcher
initNotificationDispatcher()

app.use(errorHandler)

export default app