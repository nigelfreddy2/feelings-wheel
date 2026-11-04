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

export default function App() {
  const [step,            setStep]            = useState<Step>('setup')
  const [level,           setLevel]           = useState<Level>('adult')
  const [mode,            setMode]            = useState<SessionMode>('general')
  const [emotions,        setEmotions]        = useState<Emotion[]>([])
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState<string | null>(null)
  const [sessionId,       setSessionId]       = useState<string | null>(null)
  const [hoveredEmotion,  setHoveredEmotion]  = useState<Emotion | null>(null)
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

  async function handleEmotionSelect(emotion: Emotion, intensityValue: number) {
    setSelectedEmotion(emotion); setIntensity(intensityValue); setHoveredEmotion(null)
    if (sessionId) {
      const dwellMs = Date.now() - wheelEnteredAt
      await recordEmotionSelection(sessionId, emotion.ring, emotion.key, dwellMs, intensityValue).catch(() => {})
      await updateSession(sessionId, { overridingEmotion: emotion.key }).catch(() => {})
    }
    setStep(level === 'child' ? 'coping' : 'facts')
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
    setSessionId(null); setEmotions([]); setIntensity(5)
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
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
              {/* Instruction hint — Open Sans caps supertitle style */}
              <p className="supertitle" style={{ textAlign: 'center', margin: '4px 0 0' }}>
                {level === 'child'
                  ? 'Tap the feeling that fits best'
                  : level === 'adult'
                  ? 'Tap a feeling · tap again to go deeper'
                  : 'Tap core · mid · specific to explore'}
              </p>

              {/* Wheel — fills all available space; inner div caps at 700px so it stays circular */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px 140px' }}>
                <div style={{ width: '100%', maxWidth: 700 }}>
                  <FeelingsWheel
                    emotions={emotions}
                    level={level}
                    onEmotionSelect={handleEmotionSelect}
                    onEmotionHover={setHoveredEmotion}
                  />
                </div>
              </div>
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
