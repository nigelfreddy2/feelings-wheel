// feedback.ts — /api/feedback routes
// PURPOSE
//   Accepts standalone feedback submissions (not tied to a session)
//   as well as session-linked feedback. Session-linked feedback can also
//   be submitted via PATCH /api/sessions/:id but this route handles the
//   standalone case (e.g. a general feedback button anywhere in the app).
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

// POST /api/feedback
router.post('/', async (req, res) => {
  const { sessionId, rating, comment, pageContext } = req.body

  const feedback = await prisma.feedback.create({
    data: {
      ...(sessionId && { sessionId }),
      ...(rating !== undefined && { rating }),
      ...(comment && { comment }),
      ...(pageContext && { pageContext }),
    },
  })

  res.status(201).json(feedback)
})

export default router
