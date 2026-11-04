// api/client.ts — typed API client for the Feelings Wheel backend
// PURPOSE
//   Centralises all fetch calls so routes are never scattered across components.
//   Uses the Vite proxy in dev (/api → localhost:3001) so no CORS config needed.
import type { Emotion, Level, Session, SessionMode, SessionReflection } from '../types'

const BASE = '/api'

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
  return res.json()
}

// ── Emotions ──────────────────────────────────────────────────────────────────

export async function fetchEmotions(level: Level): Promise<Emotion[]> {
  const res = await fetch(`${BASE}/emotions?level=${level}`)
  if (!res.ok) throw new Error('Failed to fetch emotions')
  return res.json()
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(level: Level, mode: SessionMode): Promise<Session> {
  return post('/sessions', { level, mode })
}

export async function updateSession(
  sessionId: string,
  data: { overridingEmotion?: string; completed?: boolean; feedbackRating?: number; feedbackText?: string }
): Promise<Session> {
  return patch(`/sessions/${sessionId}`, data)
}

export async function recordEmotionSelection(
  sessionId: string,
  ring: string,
  emotionKey: string,
  dwellMs?: number,
  intensity?: number
): Promise<void> {
  await post(`/sessions/${sessionId}/emotions`, { ring, emotionKey, dwellMs, intensity })
}

export async function logEvent(
  sessionId: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  await post(`/sessions/${sessionId}/events`, { eventType, eventData })
}

export async function saveReflection(
  sessionId: string,
  emotionKey: string,
  reflection: SessionReflection
): Promise<void> {
  await post(`/sessions/${sessionId}/reflections`, { emotionKey, ...reflection })
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(data: {
  sessionId?: string
  rating?: number
  comment?: string
  pageContext?: string
}): Promise<void> {
  await post('/feedback', data)
}
