import express from 'express'
import testRouter from './routes/test'

const app = express()
app.use(express.json())
app.use('/api', testRouter)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})