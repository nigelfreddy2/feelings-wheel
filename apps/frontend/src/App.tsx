// App.tsx — main application component and session state machine
import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Emotion, Level, SessionMode, SessionReflection, CopingSuggestion } from './types'
import {
  fetchEmotions, createSession, updateSession,
  recordEmotionSelection, saveEmotionDetails, logEvent, saveReflection, submitFeedback,
} from './api/client'
import SessionSetup    from './components/SessionSetup/SessionSetup'
import FeelingsWheel   from './components/FeelingsWheel/FeelingsWheel'
import DefinitionPanel from './components/DefinitionPanel/DefinitionPanel'
import CheckTheFacts   from './components/CheckTheFacts/CheckTheFacts'
import CopingPanel     from './components/CopingPanel/CopingPanel'
import FeedbackForm    from './components/FeedbackForm/FeedbackForm'
import SessionComplete from './components/SessionComplete/SessionComplete'

type Step = 'setup' | 'wheel' | 'summary' | 'facts' | 'coping' | 'feedback' | 'complete'

// Selection entry — one emotion + intensity picked during this session
interface Selection { emotion: Emotion; intensity: number }

export default function App() {
  const [step,            setStep]            = useState<Step>('setup')
  const [level,           setLevel]           = useState<Level>('adult')
  const [mode,            setMode]            = useState<SessionMode>('general')
  const [emotions,        setEmotions]        = useState<Emotion[]>([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [sessionId,       setSessionId]       = useState<string | null>(null)
  const [hoveredEmotion,  setHoveredEmotion]  = useState<Emotion | null>(null)
  // Multi-select: accumulate all emotions the user clicks during the wheel step
  const [selections,      setSelections]      = useState<Selection[]>([])
  // The single emotion that flows into facts/coping — the last one selected
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null)
  const [intensity,       setIntensity]       = useState(5)
  const [universalCoping, setUniversalCoping] = useState<CopingSuggestion[]>([])
  const [wheelEnteredAt]                      = useState(() => Date.now())
  // Zoom: wheel render size — only applied to the SVG width/height, not CSS scale
  const [wheelSize,       setWheelSize]       = useState(2400)
  const ZOOM_STEP = 200
  const ZOOM_MIN  = 800
  const ZOOM_MAX  = 4200

  const loadEmotions = useCallback(async (lvl: Level) => {
    setLoading(true); setError(null)
    try { setEmotions(await fetchEmotions(lvl)) }
    catch { setError('Could not load the feelings wheel. Is the server running?') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetch('/api/coping?level=advanced').then(r => r.json()).then(setUniversalCoping).catch(() => {})
  }, [])

  async function handleStart(lvl: Level, md: SessionMode) {
    setLevel(lvl); setMode(md)
    await loadEmotions(lvl)
    try { const s = await createSession(lvl, md); setSessionId(s.id) }
    catch { console.warn('Could not create session') }
    setStep('wheel')
  }

  // handleEmotionSelect: adds the emotion to the selections list without navigating away.
  // dimensionItemIds: ticked emotion detail bullet ids. freeText: about/cause/other per-section text.
  // For child level, one tap immediately proceeds (no list needed).
  async function handleEmotionSelect(
    emotion: Emotion,
    intensityValue: number,
    dimensionItemIds: string[],
    freeText: Record<string, string>
  ) {
    setHoveredEmotion(null)
    setSelections((prev) => {
      // Toggle off if same emotion tapped again; otherwise append
      const exists = prev.findIndex((s) => s.emotion.key === emotion.key)
      if (exists !== -1) return prev.filter((_, i) => i !== exists)
      return [...prev, { emotion, intensity: intensityValue }]
    })
    if (sessionId) {
      const dwellMs = Date.now() - wheelEnteredAt
      const seRecord = await recordEmotionSelection(sessionId, emotion.ring, emotion.key, dwellMs, intensityValue).catch(() => null)
      // Persist ticked dimension items
      if (seRecord && dimensionItemIds.length > 0) {
        await saveEmotionDetails(sessionId, seRecord.id, dimensionItemIds).catch(() => {})
      }
      // Persist free-text entries as a single event (no schema change needed)
      const hasFreeText = Object.values(freeText).some((v) => v.trim() !== '')
      if (hasFreeText) {
        await logEvent(sessionId, 'emotion_free_text', {
          emotionKey: emotion.key,
          ...freeText,
        }).catch(() => {})
      }
    }
    // Child mode: one tap → go straight to coping (no accumulation needed)
    if (level === 'child') {
      setSelectedEmotion(emotion); setIntensity(intensityValue)
      setStep('coping')
    }
  }

  // handleDone: called when the user presses Done on the wheel.
  // Uses the last selection as the primary emotion for the reflection flow.
  async function handleDone() {
    if (selections.length === 0) return
    const last = selections[selections.length - 1]
    setSelectedEmotion(last.emotion)
    setIntensity(last.intensity)
    if (sessionId) {
      await updateSession(sessionId, { overridingEmotion: last.emotion.key }).catch(() => {})
    }
    // Go to summary screen first so user can review their full emotion list
    setStep('summary')
  }

  async function handleReflectionComplete(reflection: SessionReflection) {
    if (sessionId && selectedEmotion) await saveReflection(sessionId, selectedEmotion.key, reflection).catch(() => {})
    setStep('coping')
  }

  async function handleFeedbackSubmit(rating: number, comment: string) {
    if (sessionId) {
      await submitFeedback({ sessionId, rating, comment, pageContext: 'session_end' }).catch(() => {})
      await updateSession(sessionId, { completed: true }).catch(() => {})
    }
    setStep('complete')
  }

  async function handleFeedbackSkip() {
    if (sessionId) await updateSession(sessionId, { completed: true }).catch(() => {})
    setStep('complete')
  }

  function handleStartAgain() {
    setStep('setup'); setSelectedEmotion(null); setHoveredEmotion(null)
    setSessionId(null); setEmotions([]); setIntensity(5); setSelections([])
  }

  // ── Shared header ────────────────────────────────────────────────────────────
  const Header = ({ back }: { back?: () => void }) => (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px 20px 8px', position: 'relative',
    }}>
      {back && (
        <button onClick={back} style={{
          position: 'absolute', left: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--golden)', fontSize: 22, lineHeight: 1,
        }}>←</button>
      )}
      <img src="/logo.png" alt="Wholeness with Willene" style={{ height: 52 }} />
    </header>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>

      {step === 'setup' && <SessionSetup onStart={handleStart} />}

      {step === 'wheel' && (
        <div style={{ display: 'flex', flexDirection: 'column', overflowX: 'auto' }}>

          {/* ── Sticky header bar — fixed to viewport top, always visible ─────── */}
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
            background: 'var(--paper)',
            borderBottom: '1px solid #ece8e1',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 20px 8px',
          }}>
            <img src="/logo.png" alt="Wholeness with Willene" style={{ height: 52 }} />
            {!loading && !error && (
              <p className="supertitle" style={{ textAlign: 'center', margin: '6px 0 0', fontSize: 13 }}>
                {level === 'child'
                  ? 'TAP THE FEELING THAT FITS BEST'
                  : selections.length === 0
                  ? 'TAP FEELINGS THAT MATCH HOW YOU FEEL RIGHT NOW'
                  : `${selections.length} FEELING${selections.length > 1 ? 'S' : ''} SELECTED · TAP MORE OR PRESS DONE`}
              </p>
            )}
            {mode === 'incident' && (
              <div className="incident-banner" style={{ margin: '4px 0 0', fontSize: 12 }}>
                💬 Take a breath — find the word that fits best for this situation
              </div>
            )}
          </div>

          {/* Spacer so content starts below the fixed header (~110px tall) */}
          <div style={{ height: 110 }} />

          {loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--golden)', fontStyle: 'italic' }}>
              Loading your wheel…
            </div>
          )}
          {error && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--salmon)', padding: 24 }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Wheel — fixed 1750px so all labels render crisply.
                  The page scrolls natively in both axes; JS centres the wheel
                  on mount so the core ring is the first thing the user sees. */}
              <WheelContainer size={wheelSize}>
                <FeelingsWheel
                  emotions={emotions}
                  level={level}
                  size={wheelSize}
                  onEmotionSelect={handleEmotionSelect}
                  onEmotionHover={setHoveredEmotion}
                />
              </WheelContainer>

              {/* ── Selected emotions chip list ───────────────────────────────────── */}
              {level !== 'child' && selections.length > 0 && (
                <div style={{
                  margin: '0 16px 16px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                }}>
                  <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Your feelings
                    </span>
                  </div>

                  {/* Flat list sorted by descending intensity — no intensity shown, no grouping */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 16px 12px' }}>
                    {[...selections]
                      .sort((a, b) => b.intensity - a.intensity)
                      .map((sel) => (
                        <button
                          key={sel.emotion.key}
                          onClick={() => setSelections((prev) => prev.filter((s) => s.emotion.key !== sel.emotion.key))}
                          title="Tap to remove"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px 4px 8px',
                            background: sel.emotion.sectorColour + '22',
                            border: `1.5px solid ${sel.emotion.sectorColour}`,
                            borderRadius: 20, cursor: 'pointer',
                            fontSize: 13, fontWeight: 500, color: '#1f2328',
                            fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: sel.emotion.sectorColour, flexShrink: 0 }} />
                          {sel.emotion.label}
                          <span style={{ fontSize: 10, color: '#aaa', marginLeft: 1 }}>✕</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Definition drawer — slides up from bottom when an emotion is hovered */}
          {hoveredEmotion && step === 'wheel' && (
            <DefinitionPanel
              emotion={hoveredEmotion}
              level={level}
              onSelect={() => {
                // For child/adult clicking "select" from definition panel: go via wheel flow
                handleEmotionSelect(hoveredEmotion, intensity, [], {})
              }}
              onClose={() => setHoveredEmotion(null)}
            />
          )}
        </div>
      )}

      {/* ── Summary step — shows all selected emotions before continuing ─────── */}
      {step === 'summary' && (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 24px' }}>
          <Header back={() => setStep('wheel')} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '24px 0 6px', textAlign: 'center' }}>
            How you're feeling
          </h2>
          <p style={{ fontSize: 14, color: '#57606a', textAlign: 'center', margin: '0 0 28px' }}>
            {selections.length === 1
              ? 'You named 1 feeling this session.'
              : `You named ${selections.length} feelings this session.`}
          </p>
          {/* Emotion chips — sorted by descending intensity, colour-coded */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 36 }}>
            {[...selections]
              .sort((a, b) => b.intensity - a.intensity)
              .map((sel) => (
                <span
                  key={sel.emotion.key}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px 7px 10px',
                    background: sel.emotion.sectorColour + '22',
                    border: `1.5px solid ${sel.emotion.sectorColour}`,
                    borderRadius: 22,
                    fontSize: 15, fontWeight: 600, color: '#1f2328',
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: sel.emotion.sectorColour, flexShrink: 0 }} />
                  {sel.emotion.label}
                </span>
              ))}
          </div>
          <button
            onClick={() => setStep('feedback')}
            style={{
              display: 'block', width: '100%',
              padding: '14px',
              background: '#1f2328', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Continue →
          </button>
          <button
            onClick={() => setStep('wheel')}
            style={{
              display: 'block', width: '100%', marginTop: 10,
              padding: '12px',
              background: 'none', color: '#57606a',
              border: '1px solid #e5e7eb', borderRadius: 10,
              fontSize: 14, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← Back to wheel
          </button>
        </div>
      )}

      {step === 'facts' && selectedEmotion && (
        <>
          <Header back={() => setStep('wheel')} />
          <CheckTheFacts
            emotion={selectedEmotion}
            mode={mode}
            onComplete={handleReflectionComplete}
            onSkip={() => setStep('coping')}
          />
        </>
      )}

      {step === 'coping' && selectedEmotion && (
        <>
          <Header back={() => setStep(level === 'child' ? 'wheel' : 'facts')} />
          <CopingPanel
            emotion={selectedEmotion}
            level={level}
            intensity={intensity}
            universalCoping={universalCoping}
            onContinue={() => setStep('feedback')}
          />
        </>
      )}

      {step === 'feedback' && sessionId && (
        <>
          <Header />
          <FeedbackForm sessionId={sessionId} onSubmit={handleFeedbackSubmit} onSkip={handleFeedbackSkip} />
        </>
      )}

      {step === 'complete' && selections.length > 0 && (
        <SessionComplete selections={selections} onStartAgain={handleStartAgain} />
      )}

      {step === 'wheel' && sessionId && hoveredEmotion && (
        <HoverLogger sessionId={sessionId} emotionKey={hoveredEmotion.key} />
      )}

      {/* ── Fixed controls — only visible on the wheel step ──────────────────── */}
      {step === 'wheel' && (
        <>
          {/* Left side: Back + Done */}
          <div style={{
            position: 'fixed', bottom: 24, left: 24, zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <button
              onClick={handleStartAgain}
              title="Back to start"
              style={{
                height: 44, padding: '0 18px',
                background: '#fff', color: '#1f2328',
                border: '1.5px solid #e5e7eb', borderRadius: 22,
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
                fontFamily: 'inherit', gap: 6,
              }}
            >← Back</button>
            {selections.length > 0 && (
              <button
                onClick={handleDone}
                title="Done — review your feelings"
                style={{
                  height: 44, padding: '0 18px',
                  background: '#1f2328', color: '#fff',
                  border: 'none', borderRadius: 22,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                  fontFamily: 'inherit', gap: 6,
                }}
              >Done →</button>
            )}
          </div>

          {/* Right side: Zoom in / Zoom out */}
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <button
              onClick={() => setWheelSize((s) => Math.min(s + ZOOM_STEP, ZOOM_MAX))}
              title="Zoom in"
              style={{
                width: 44, height: 44,
                background: '#1f2328', color: '#fff',
                border: 'none', borderRadius: 22,
                fontSize: 22, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                lineHeight: 1,
              }}
            >+</button>
            <button
              onClick={() => setWheelSize((s) => Math.max(s - ZOOM_STEP, ZOOM_MIN))}
              title="Zoom out"
              style={{
                width: 44, height: 44,
                background: '#1f2328', color: '#fff',
                border: 'none', borderRadius: 22,
                fontSize: 26, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(0,0,0,0.22)',
                lineHeight: 1,
              }}
            >−</button>
          </div>
        </>
      )}
    </div>
  )
}

function HoverLogger({ sessionId, emotionKey }: { sessionId: string; emotionKey: string }) {
  useEffect(() => { logEvent(sessionId, 'definition_viewed', { emotionKey }).catch(() => {}) }, [sessionId, emotionKey])
  return null
}

// WheelContainer — centres the wheel both horizontally and vertically on mount and
// whenever the size changes (zoom in/out).  The sticky header is ~110px tall, so
// the usable viewport height starts there.  We want the geometric centre of the SVG
// (size/2) to sit at the vertical midpoint of the remaining screen area.
function WheelContainer({ children, size }: { children: React.ReactNode; size: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const HEADER_H = 110           // fixed sticky header height (px)
    const PADDING  = 8             // top padding added by the container div below
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Horizontal: centre the wheel — scroll right so the wheel centre is on screen
    const leftOffset = Math.max(0, (size - vw) / 2)

    // Vertical: the SVG starts at HEADER_H + PADDING from the top of the document.
    // We want the SVG centre (size/2) to land at the vertical midpoint of the
    // area below the header ((vh - HEADER_H) / 2).
    // scrollTop = (svgTop + size/2) - (vh / 2)
    const svgTop    = HEADER_H + PADDING
    const topOffset = Math.max(0, svgTop + size / 2 - vh / 2)

    window.scrollTo({ left: leftOffset, top: topOffset, behavior: 'smooth' })
  }, [size]) // re-centre whenever size changes (also fires on mount)
  return (
    <div ref={ref} style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 8px' }}>
      {children}
    </div>
  )
}
