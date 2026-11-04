// coping.ts — /api/coping routes
// PURPOSE
//   Returns universal coping suggestions (not tied to a specific emotion)
//   filtered by the requested level. Used by the frontend CopingPanel.
import { Router } from 'express'
import { prisma } from '../db'
import type { Level } from '@prisma/client'

const router = Router()

// GET /api/coping?level=child|adult|advanced
router.get('/', async (req, res) => {
  const levelParam = (req.query.level as string) ?? 'adult'
  const levelOrder: Record<Level, number> = { child: 0, adult: 1, advanced: 2 }
  const requestedRank = levelOrder[levelParam as Level] ?? 1

  const suggestions = await prisma.copingSuggestion.findMany({
    where: {
      emotionKey: null,  // universal suggestions only
      levelMin: {
        in: (Object.keys(levelOrder) as Level[]).filter(
          (l) => levelOrder[l] <= requestedRank
        ),
      },
    },
    orderBy: [{ category: 'asc' }],
  })

  res.json(suggestions)
})

export default router
