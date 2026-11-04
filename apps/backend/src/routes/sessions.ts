// sessions.ts — /api/sessions routes
// PURPOSE
//   Creates and updates anonymous sessions, records emotion selections and
//   behavioural events. All data is anonymous — no PII is accepted or stored.
import { Router } from 'express'
import { prisma } from '../db'

const router = Router()

// POST /api/sessions — start a new session
router.post('/', async (req, res) => {
  const { level, mode } = req.body

  if (!level || !mode) {
    res.status(400).json({ error: 'level and mode are required' })
    return
  }

  const session = await prisma.session.create({
    data: { level, mode },
  })

  // Log the wheel_start event
  await prisma.sessionEvent.create({
    data: {
      sessionId: session.id,
      eventType: 'wheel_start',
      eventData: { level, mode },
    },
  })

  res.status(201).json(session)
})

// PATCH /api/sessions/:id — update overriding emotion, completion, feedback
router.patch('/:id', async (req, res) => {
  const { overridingEmotion, completed, feedbackRating, feedbackText } = req.body

  const session = await prisma.session.update({
    where: { id: req.params.id },
    data: {
      ...(overridingEmotion !== undefined && { overridingEmotion }),
      ...(completed !== undefined && { completed }),
      ...(feedbackRating !== undefined && { feedbackRating }),
      ...(feedbackText !== undefined && { feedbackText }),
    },
  })

  // Log completion event if flagged
  if (completed) {
    await prisma.sessionEvent.create({
      data: {
        sessionId: session.id,
        eventType: 'session_complete',
        eventData: { overridingEmotion },
      },
    })
  }

  res.json(session)
})

// POST /api/sessions/:id/emotions — record an emotion selection
router.post('/:id/emotions', async (req, res) => {
  const { ring, emotionKey, dwellMs, intensity } = req.body

  if (!ring || !emotionKey) {
    res.status(400).json({ error: 'ring and emotionKey are required' })
    return
  }

  const [sessionEmotion] = await prisma.$transaction([
    prisma.sessionEmotion.create({
      data: {
        sessionId: req.params.id,
        ring,
        emotionKey,
        ...(dwellMs !== undefined && { dwellMs }),
        ...(intensity !== undefined && { intensity }),
      },
    }),
    prisma.sessionEvent.create({
      data: {
        sessionId: req.params.id,
        eventType: 'emotion_selected',
        eventData: { ring, emotionKey, dwellMs, intensity },
      },
    }),
  ])

  res.status(201).json(sessionEmotion)
})

// POST /api/sessions/:id/events — log a UI event (hover, expand, definition view, etc.)
router.post('/:id/events', async (req, res) => {
  const { eventType, eventData } = req.body

  if (!eventType) {
    res.status(400).json({ error: 'eventType is required' })
    return
  }

  const event = await prisma.sessionEvent.create({
    data: {
      sessionId: req.params.id,
      eventType,
      eventData: eventData ?? null,
    },
  })

  res.status(201).json(event)
})

// POST /api/sessions/:id/reflections — save a Check the Facts / coaching reflection
router.post('/:id/reflections', async (req, res) => {
  const {
    emotionKey,
    emotionFitsFacts,
    actionUrge,
    oppositeTaken,
    reframeText,
    commitmentText,
    intensityBefore,
    intensityAfter,
  } = req.body

  if (!emotionKey) {
    res.status(400).json({ error: 'emotionKey is required' })
    return
  }

  const reflection = await prisma.sessionReflection.create({
    data: {
      sessionId: req.params.id,
      emotionKey,
      ...(emotionFitsFacts && { emotionFitsFacts }),
      ...(actionUrge && { actionUrge }),
      ...(oppositeTaken !== undefined && { oppositeTaken }),
      ...(reframeText && { reframeText }),
      ...(commitmentText && { commitmentText }),
      ...(intensityBefore !== undefined && { intensityBefore }),
      ...(intensityAfter !== undefined && { intensityAfter }),
    },
  })

  res.status(201).json(reflection)
})

export default router
