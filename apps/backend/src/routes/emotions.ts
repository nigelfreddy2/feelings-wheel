// emotions.ts — /api/emotions routes
// PURPOSE
//   Returns the full emotion catalogue, optionally filtered by level.
//   The frontend uses this to render the wheel and populate the definition panel.
import { Router } from 'express'
import { prisma } from '../db'
import type { Level } from '@prisma/client'

const router = Router()

// GET /api/emotions?level=child|adult|advanced
// Returns all emotions visible at the requested level (level_min <= requested level)
router.get('/', async (req, res) => {
  const levelParam = (req.query.level as string) ?? 'advanced'

  // Level hierarchy: child < adult < advanced
  // Determine which level_min values to include
  const levelOrder: Record<Level, number> = { child: 0, adult: 1, advanced: 2 }
  const requestedRank = levelOrder[levelParam as Level] ?? 2

  const emotions = await prisma.emotion.findMany({
    where: {
      levelMin: {
        in: (Object.keys(levelOrder) as Level[]).filter(
          (l) => levelOrder[l] <= requestedRank
        ),
      },
    },
    include: {
      // Include DBT dimensions filtered to the same level
      dimensions: {
        where: {
          levelMin: {
            in: (Object.keys(levelOrder) as Level[]).filter(
              (l) => levelOrder[l] <= requestedRank
            ),
          },
        },
        orderBy: { displayOrder: 'asc' },
      },
      // Include coping suggestions for this level
      copingSuggestions: {
        where: {
          levelMin: {
            in: (Object.keys(levelOrder) as Level[]).filter(
              (l) => levelOrder[l] <= requestedRank
            ),
          },
        },
      },
    },
    orderBy: [{ ring: 'asc' }, { key: 'asc' }],
  })

  res.json(emotions)
})

// GET /api/emotions/:key — single emotion with all dimensions
router.get('/:key', async (req, res) => {
  const emotion = await prisma.emotion.findUnique({
    where: { key: req.params.key },
    include: {
      dimensions: { orderBy: { displayOrder: 'asc' } },
      copingSuggestions: true,
      children: true,
    },
  })

  if (!emotion) {
    res.status(404).json({ error: 'Emotion not found' })
    return
  }

  res.json(emotion)
})

export default router
