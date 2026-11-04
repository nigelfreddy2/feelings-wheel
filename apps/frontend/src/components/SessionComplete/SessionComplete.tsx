// SessionComplete/SessionComplete.tsx — end of session screen
import type { Emotion } from '../../types'

interface Selection { emotion: Emotion; intensity: number }

interface Props {
  selections: Selection[]
  onStartAgain: () => void
}

export default function SessionComplete({ selections, onStartAgain }: Props) {
  // Use the first (highest-intensity) emotion's colour for the icon
  const iconColour = selections[0]?.emotion.sectorColour ?? '#c9a84c'

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72, height: 72,
          borderRadius: '50%',
          background: iconColour,
          margin: '0 auto 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          color: '#fff',
        }}
      >
        ✓
      </div>

      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>
        You named it.
      </h2>

      <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 20px' }}>
        {selections.length === 1
          ? 'You named 1 feeling this session.'
          : `You named ${selections.length} feelings this session.`}
      </p>

      {/* All selected emotions — colour-coded chips sorted by descending intensity */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
        {[...selections]
          .sort((a, b) => b.intensity - a.intensity)
          .map((sel) => (
            <span
              key={sel.emotion.key}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px 6px 10px',
                background: sel.emotion.sectorColour + '22',
                border: `1.5px solid ${sel.emotion.sectorColour}`,
                borderRadius: 22,
                fontSize: 14, fontWeight: 600, color: '#1f2328',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: sel.emotion.sectorColour, flexShrink: 0 }} />
              {sel.emotion.label}
            </span>
          ))}
      </div>

      <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 40px', lineHeight: 1.7 }}>
        Naming an emotion is the first step to understanding and working with it.
        The goal is not to get rid of the feeling — it's to know what it is and what it does for you.
      </p>

      <button
        onClick={onStartAgain}
        style={{
          padding: '14px 32px',
          background: '#1f2328',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Start again
      </button>
    </div>
  )
}
