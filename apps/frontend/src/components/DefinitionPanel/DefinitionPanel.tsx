// DefinitionPanel/DefinitionPanel.tsx — emotion definition panel
// PURPOSE
//   Shows a definition, DBT dimensions, and a "select this feeling" action
//   when the user hovers or clicks an emotion.
//   Three tabs on advanced: "What it is" / "In your body" / "What to do".
//   Children see simplified language only.
import { useState } from 'react'
import type { Emotion, Level } from '../../types'

interface Props {
  emotion: Emotion
  level: Level
  onSelect: () => void
  onClose: () => void
}

type Tab = 'what' | 'body' | 'todo'

export default function DefinitionPanel({ emotion, level, onSelect, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('what')

  const promptingEvents = emotion.dimensions
    .filter((d) => d.dimension === 'prompting_event')
    .map((d) => d.content)

  const bioChanges = emotion.dimensions
    .filter((d) => d.dimension === 'biological_change')
    .map((d) => d.content)

  const oppositeActions = emotion.dimensions
    .filter((d) => d.dimension === 'opposite_action')
    .map((d) => d.content)

  const showTabs = level !== 'child' && (bioChanges.length > 0 || oppositeActions.length > 0)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '20px 24px',
        maxWidth: 380,
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div
            style={{
              display: 'inline-block',
              width: 12, height: 12,
              borderRadius: '50%',
              background: emotion.sectorColour,
              marginRight: 8,
              verticalAlign: 'middle',
            }}
          />
          <strong style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {emotion.label}
          </strong>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#57606a', lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Tabs — adult and advanced only */}
      {showTabs && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
          {(['what', 'body', 'todo'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#1f2328' : 'transparent',
                color: tab === t ? '#fff' : '#57606a',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'what' ? 'What it is' : t === 'body' ? 'In your body' : 'What to do'}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      <div style={{ fontSize: 14, color: '#1f2328', lineHeight: 1.6 }}>
        {(tab === 'what' || !showTabs) && (
          <>
            <p style={{ margin: '0 0 12px' }}>{emotion.definition}</p>
            {promptingEvents.length > 0 && level !== 'child' && (
              <>
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#57606a', fontSize: 12 }}>
                  This often happens when…
                </p>
                <ul style={{ margin: '0 0 12px', paddingLeft: 18 }}>
                  {promptingEvents.slice(0, 4).map((e, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{e}</li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}

        {tab === 'body' && bioChanges.length > 0 && (
          <>
            <p style={{ margin: '0 0 8px', color: '#57606a', fontSize: 12, fontWeight: 600 }}>
              Notice in your body…
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {bioChanges.map((b, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{b}</li>
              ))}
            </ul>
          </>
        )}

        {tab === 'todo' && oppositeActions.length > 0 && (
          <>
            <p style={{ margin: '0 0 8px', color: '#57606a', fontSize: 12, fontWeight: 600 }}>
              Try the opposite action…
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {oppositeActions.map((a, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{a}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button
          onClick={onSelect}
          style={{
            flex: 1,
            background: '#1f2328',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Select this feeling
        </button>
      </div>
    </div>
  )
}
