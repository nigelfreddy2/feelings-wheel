// CheckTheFacts/CheckTheFacts.tsx — DBT Handout 8 "Check the Facts" step
// PURPOSE
//   After the user selects an emotion, this component asks whether the emotion
//   fits the facts of their situation. Records the response and, on 'no/unsure',
//   prompts for an action urge and optional reframe.
import { useState } from 'react'
import type { Emotion, SessionReflection } from '../../types'

interface Props {
  emotion: Emotion
  mode: 'general' | 'incident'
  onComplete: (reflection: SessionReflection) => void
  onSkip: () => void
}

type FitsFacts = 'yes' | 'no' | 'unsure'

export default function CheckTheFacts({ emotion, mode, onComplete, onSkip }: Props) {
  const [fitsFacts, setFitsFacts] = useState<FitsFacts | null>(null)
  const [actionUrge, setActionUrge] = useState('')
  const [step, setStep] = useState<'fits' | 'urge' | 'reframe'>('fits')
  const [reframeText, setReframeText] = useState('')
  const [commitmentText, setCommitmentText] = useState('')

  function handleFitsChoice(choice: FitsFacts) {
    setFitsFacts(choice)
    if (choice === 'yes') {
      // Emotion fits the facts — record and finish
      onComplete({ emotionFitsFacts: choice })
    } else {
      setStep('urge')
    }
  }

  function handleUrgeNext() {
    setStep('reframe')
  }

  function handleComplete() {
    onComplete({
      emotionFitsFacts: fitsFacts ?? undefined,
      actionUrge: actionUrge || undefined,
      reframeText: reframeText || undefined,
      commitmentText: commitmentText || undefined,
    })
  }

  const oppositeActions = emotion.dimensions
    .filter((d) => d.dimension === 'opposite_action')
    .map((d) => d.content)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 32px' }}>
      <div
        style={{
          background: '#f7f8fa',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 20,
          borderLeft: `4px solid ${emotion.sectorColour}`,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#57606a' }}>You selected</p>
        <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 20 }}>{emotion.label}</p>
      </div>

      {step === 'fits' && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
            Does this emotion fit the facts?
          </h2>
          {mode === 'incident' && (
            <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 20px' }}>
              Think about what actually happened — not the story around it. Does feeling <strong>{emotion.label.toLowerCase()}</strong> make sense given the actual facts of the situation?
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { v: 'yes'   as FitsFacts, label: 'Yes, it fits',         desc: 'This emotion makes sense given what happened.' },
              { v: 'unsure'as FitsFacts, label: 'Not sure',             desc: 'I\'m not certain if it fits.' },
              { v: 'no'    as FitsFacts, label: 'Actually, maybe not',  desc: 'The emotion might be bigger than the situation warrants.' },
            ]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => handleFitsChoice(opt.v)}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  background: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#57606a', marginTop: 2 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
          <button
            onClick={onSkip}
            style={{ marginTop: 16, background: 'none', border: 'none', color: '#57606a', cursor: 'pointer', fontSize: 13 }}
          >
            Skip this step
          </button>
        </>
      )}

      {step === 'urge' && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
            What is your action urge?
          </h2>
          <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 16px' }}>
            What do you feel like doing or saying right now? (You don't have to act on it.)
          </p>
          <textarea
            value={actionUrge}
            onChange={(e) => setActionUrge(e.target.value)}
            placeholder="e.g. I want to withdraw, I want to shout, I want to give up…"
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />

          {oppositeActions.length > 0 && (
            <div style={{ marginTop: 16, background: '#f7f8fa', borderRadius: 8, padding: '12px 16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#57606a' }}>
                Opposite action suggestions:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                {oppositeActions.map((a, i) => <li key={i} style={{ marginBottom: 4 }}>{a}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={handleUrgeNext}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '12px',
              background: '#1f2328',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </>
      )}

      {step === 'reframe' && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
            Is there another way to see this?
          </h2>
          <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 16px' }}>
            Optional — write your own reframe. What is another interpretation of what happened?
          </p>
          <textarea
            value={reframeText}
            onChange={(e) => setReframeText(e.target.value)}
            placeholder="e.g. Maybe they were having a bad day too…"
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              marginBottom: 16,
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 8px', fontWeight: 600 }}>
            One thing I will do:
          </p>
          <textarea
            value={commitmentText}
            onChange={(e) => setCommitmentText(e.target.value)}
            placeholder="e.g. Take 3 deep breaths before I reply…"
            rows={2}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              fontSize: 14,
              resize: 'vertical',
              marginBottom: 20,
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleComplete}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1f2328',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save and continue →
          </button>
        </>
      )}
    </div>
  )
}
