import express from 'express'
import testRouter from './routes/test'
import authRouter from './routes/auth'
import societiesRouter from './routes/societies'
import nodesRouter from './routes/nodes'
import invitationsRouter from './routes/invitations'
import { errorHandler } from './middleware/error'
import { apiRateLimit } from './middleware/rateLimit'

const app = express()
app.use(express.json())
app.use(apiRateLimit)          // global rate limit on all routes

app.use('/api', testRouter)
app.use('/api/auth', authRouter)
app.use('/api/societies', societiesRouter)
app.use('/api/societies', nodesRouter)
app.use('/api/societies', invitationsRouter)
// app.use('/api/societies', enforceTenantContext, membersRouter)    up-next

app.use(errorHandler)          // always last — catches everything above

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})