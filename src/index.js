import dotenv from 'dotenv'
dotenv.config()

console.log("ENV CHECK:");
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_KEY:", process.env.SUPABASE_SERVICE_KEY);

import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import healthRouter from './routes/health.js'

const app = express()
const PORT = process.env.PORT || 3000

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}))
app.use(express.json({ limit: '1mb' }))

// ── Routes ──────────────────────────────────────────────────────
app.use('/health', healthRouter)
app.use('/chat',   chatRouter)

// ── 404 handler ─────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// ── Global error handler ────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ISKAI] Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🤖 ISKAI Backend running on port ${PORT}`)
  console.log(`   ├─ Health: http://localhost:${PORT}/health`)
  console.log(`   └─ Chat:   POST http://localhost:${PORT}/chat\n`)
})
