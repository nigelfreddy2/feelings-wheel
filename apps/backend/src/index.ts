// index.ts — Express app entry point
// PURPOSE
//   Bootstraps the Express server: registers middleware, mounts all route
//   handlers, and starts listening. express-async-errors is imported first
//   so async route errors are forwarded to the error handler automatically.
import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './middleware/errorHandler'
import emotionsRouter from './routes/emotions'
import sessionsRouter from './routes/sessions'
import feedbackRouter from './routes/feedback'
import copingRouter   from './routes/coping'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

// ── Security and parsing middleware ─────────────────────────────────────────
app.use(helmet())
app.use(cors({
  // In production this should be locked to the frontend origin
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL ?? false
    : true,
}))
app.use(express.json())

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/emotions', emotionsRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/feedback', feedbackRouter)
app.use('/api/coping',   copingRouter)

// ── Error handler — must be last ─────────────────────────────────────────────
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[server] Feelings Wheel API running on http://localhost:${PORT}`)
})

export default app
