// CopingPanel/CopingPanel.tsx — post-session coping suggestions
// PURPOSE
//   Shows level-appropriate coping suggestions after the user has selected
//   their emotion and completed the Check the Facts step.
//   Crisis pathway is shown when intensity is 8+.
import { useState } from 'react'
import type { Emotion, Level, CopingSuggestion } from '../../types'

interface Props {
  emotion: Emotion
  level: Level
  intensity: number
  universalCoping: CopingSuggestion[]
  onContinue: () => void
}

export default function CopingPanel({ emotion, level, intensity, universalCoping, onContinue }: Props) {
  const [showCrisis, setShowCrisis] = useState(intensity >= 8)

  // Filter per-emotion coping by level
  const emotionCoping = emotion.copingSuggestions.filter(
    (s) => s.levelMin === level || s.levelMin === 'child' || (level === 'advanced' && s.levelMin === 'adult')
  )

  // Universal coping from the parent (passed down from app state)
  const breathing = universalCoping.filter((s) => s.category === 'breathing')
  const grounding  = universalCoping.filter((s) => s.category === 'grounding')
  const please     = universalCoping.filter((s) => s.category === 'please_skill' && (level !== 'child'))
  const mindful    = universalCoping.filter((s) => s.category === 'mindfulness' && level !== 'child')
  const crisis     = universalCoping.filter((s) => s.category === 'crisis')

  function SuggestionBlock({ title, items }: { title: string; items: CopingSuggestion[] }) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 13, color: '#57606a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((s) => (
            <li key={s.id} style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>{s.suggestion}</li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 40px' }}>
      <div
        style={{
          background: '#f7f8fa',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 24,
          borderLeft: `4px solid ${emotion.sectorColour}`,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, color: '#57606a' }}>You are feeling</p>
        <p style={{ margin: '4px 0 0', fontWeight: 700, fontSize: 20 }}>{emotion.label}</p>
        {intensity >= 8 && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#c0392b', fontWeight: 600 }}>
            Intensity: {intensity}/10 — That sounds really tough right now.
          </p>
        )}
      </div>

      {/* Crisis pathway */}
      {showCrisis && (
        <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: '16px 20px', marginBottom: 24 }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14 }}>
            Things feel very intense right now. You don't have to face this alone.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {crisis.map((s) => (
              <li key={s.id} style={{ fontSize: 13, marginBottom: 6 }}>{s.suggestion}</li>
            ))}
          </ul>
          <button
            onClick={() => setShowCrisis(false)}
            style={{ marginTop: 12, background: 'none', border: 'none', color: '#57606a', cursor: 'pointer', fontSize: 13 }}
          >
            Continue with the exercise
          </button>
        </div>
      )}

      {!showCrisis && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 20px' }}>Things that might help</h2>

          {level === 'child' ? (
            <>
              <SuggestionBlock title="Try this" items={breathing.slice(0, 1)} />
              <SuggestionBlock title="Or this" items={grounding.slice(0, 1)} />
            </>
          ) : level === 'adult' ? (
            <>
              <SuggestionBlock title="Breathing" items={breathing} />
              <SuggestionBlock title="Grounding" items={grounding} />
              <SuggestionBlock title="Take care of your body (PLEASE)" items={please} />
            </>
          ) : (
            <>
              <SuggestionBlock title="Breathing" items={breathing} />
              <SuggestionBlock title="Mindfulness" items={mindful} />
              <SuggestionBlock title="Opposite action" items={emotionCoping.filter((s) => s.category === 'opposite_action')} />
              <SuggestionBlock title="Take care of your body (PLEASE)" items={please} />
            </>
          )}
        </>
      )}

      <button
        onClick={onContinue}
        style={{
          marginTop: 8,
          width: '100%',
          padding: '14px',
          background: '#1f2328',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Done →
      </button>
    </div>
  )
}
