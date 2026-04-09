import express from 'express'
import testRouter from './routes/test'
import authRouter from './routes/auth'
import societiesRouter from './routes/societies'
import nodesRouter from './routes/nodes'
import invitationsRouter from './routes/invitations'
import membersRouter from './routes/members'
import deviceTokensRouter from './routes/deviceTokens'
import { enforceTenantContext } from './middleware/tenantContext'
import { errorHandler } from './middleware/error'
import { apiRateLimit } from './middleware/rateLimit'

const app = express()

app.use(express.json())
app.use(apiRateLimit)

app.use('/api', testRouter)
app.use('/api/auth', authRouter)
app.use('/api/societies', societiesRouter)
app.use('/api/societies', nodesRouter)
app.use('/api/societies', invitationsRouter)
app.use('/api/societies', membersRouter)
app.use('/api/auth', deviceTokensRouter)

app.use(errorHandler)

export default app