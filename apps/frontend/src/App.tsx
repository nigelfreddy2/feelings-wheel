// App.tsx — main application component and session state machine
import { useState, useEffect, useCallback } from 'react'
import type { Emotion, Level, SessionMode, SessionReflection, CopingSuggestion } from './types'
import {
  fetchEmotions, createSession, updateSession,
  recordEmotionSelection, logEvent, saveReflection, submitFeedback,
} from './api/client'
import SessionSetup    from './components/SessionSetup/SessionSetup'
import FeelingsWheel   from './components/FeelingsWheel/FeelingsWheel'
import DefinitionPanel from './components/DefinitionPanel/DefinitionPanel'
import CheckTheFacts   from './components/CheckTheFacts/CheckTheFacts'
import CopingPanel     from './components/CopingPanel/CopingPanel'
import FeedbackForm    from './components/FeedbackForm/FeedbackForm'
import SessionComplete from './components/SessionComplete/SessionComplete'

type Step = 'setup' | 'wheel' | 'facts' | 'coping' | 'feedback' | 'complete'

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
  // For child level, one tap immediately proceeds (no list needed).
  async function handleEmotionSelect(emotion: Emotion, intensityValue: number) {
    setHoveredEmotion(null)
    setSelections((prev) => {
      // Toggle off if same emotion + same intensity tapped again; otherwise append
      const exists = prev.findIndex((s) => s.emotion.key === emotion.key)
      if (exists !== -1) return prev.filter((_, i) => i !== exists)
      return [...prev, { emotion, intensity: intensityValue }]
    })
    if (sessionId) {
      const dwellMs = Date.now() - wheelEnteredAt
      await recordEmotionSelection(sessionId, emotion.ring, emotion.key, dwellMs, intensityValue).catch(() => {})
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
    setStep(level === 'adult' ? 'facts' : 'coping')
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
          <Header />

          {mode === 'incident' && (
            <div className="incident-banner" style={{ margin: '0 16px 4px' }}>
              💬 Take a breath — find the word that fits best for this situation
            </div>
          )}

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
              {/* Instruction hint */}
              <p className="supertitle" style={{ textAlign: 'center', margin: '4px 0 0' }}>
                {level === 'child'
                  ? 'Tap the feeling that fits best'
                  : selections.length === 0
                  ? 'Tap feelings that match how you feel right now'
                  : `${selections.length} feeling${selections.length > 1 ? 's' : ''} selected · tap more or press Done`}
              </p>

              {/* Wheel — fixed 900px so all labels render crisply.
                  The page scrolls natively in both axes; JS centres the wheel
                  on mount so the core ring is the first thing the user sees. */}
              <div
                style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 8px' }}
                ref={(el) => {
                  if (el) {
                    // On first render, scroll the wheel's centre into the middle
                    // of the viewport. The wheel is 900px; centre = 450px from left.
                    // We want that point at viewport centre horizontally.
                    const vw = window.innerWidth
                    const leftOffset = Math.max(0, (900 - vw) / 2)
                    window.scrollTo({ left: leftOffset, top: 0, behavior: 'instant' })
                  }
                }}
              >
                <FeelingsWheel
                  emotions={emotions}
                  level={level}
                  onEmotionSelect={handleEmotionSelect}
                  onEmotionHover={setHoveredEmotion}
                />
              </div>

              {/* ── Selected emotions list + Done button ─────────────────────────── */}
              {level !== 'child' && selections.length > 0 && (
                <div style={{
                  margin: '0 16px 16px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                }}>
                  {/* Header row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px 10px',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Your feelings
                    </span>
                    <button
                      onClick={handleDone}
                      style={{
                        padding: '8px 22px',
                        background: '#1f2328', color: '#fff',
                        border: 'none', borderRadius: 20,
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Done →
                    </button>
                  </div>

                  {/* Scrollable grouped list */}
                  <div style={{ maxHeight: 220, overflowY: 'auto', padding: '8px 0' }}>
                    {(() => {
                      // Group selections by core sector colour + label
                      const groups = new Map<string, { coreLabel: string; colour: string; items: Selection[] }>()
                      selections.forEach((sel) => {
                        // Find the core ancestor: walk up parentKey chain
                        const allEm = emotions
                        let current: Emotion | undefined = sel.emotion
                        let coreEm: Emotion = sel.emotion
                        while (current) {
                          if (current.ring === 'core') { coreEm = current; break }
                          current = allEm.find((e) => e.key === current!.parentKey)
                          if (current) coreEm = current
                        }
                        const key = coreEm.key
                        if (!groups.has(key)) groups.set(key, { coreLabel: coreEm.label, colour: coreEm.sectorColour, items: [] })
                        groups.get(key)!.items.push(sel)
                      })

                      return Array.from(groups.values()).map((group) => (
                        <div key={group.coreLabel} style={{ marginBottom: 4 }}>
                          {/* Core heading */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '4px 16px',
                          }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: group.colour, display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                              {group.coreLabel}
                            </span>
                          </div>
                          {/* Emotion chips */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '2px 16px 6px 32px' }}>
                            {group.items.map((sel) => (
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
                                <span style={{
                                  marginLeft: 2,
                                  fontSize: 11, fontWeight: 700,
                                  color: sel.emotion.sectorColour,
                                  background: '#fff',
                                  borderRadius: 10, padding: '1px 5px',
                                  border: `1px solid ${sel.emotion.sectorColour}44`,
                                }}>
                                  {sel.intensity}
                                </span>
                                <span style={{ fontSize: 10, color: '#aaa', marginLeft: 1 }}>✕</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    })()}
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
                handleEmotionSelect(hoveredEmotion, intensity)
              }}
              onClose={() => setHoveredEmotion(null)}
            />
          )}
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

      {step === 'complete' && selectedEmotion && (
        <SessionComplete emotion={selectedEmotion} onStartAgain={handleStartAgain} />
      )}

      {step === 'wheel' && sessionId && hoveredEmotion && (
        <HoverLogger sessionId={sessionId} emotionKey={hoveredEmotion.key} />
      )}
    </div>
  )
}

function HoverLogger({ sessionId, emotionKey }: { sessionId: string; emotionKey: string }) {
  useEffect(() => { logEvent(sessionId, 'definition_viewed', { emotionKey }).catch(() => {}) }, [sessionId, emotionKey])
  return null
}
