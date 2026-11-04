// SessionSetup/SessionSetup.tsx — choose level and mode before starting
import { useState } from 'react'
import type { Level, SessionMode } from '../../types'
import LevelSelector from '../LevelSelector/LevelSelector'

interface Props {
  onStart: (level: Level, mode: SessionMode) => void
}

export default function SessionSetup({ onStart }: Props) {
  const [level, setLevel] = useState<Level>('adult')
  const [mode,  setMode]  = useState<SessionMode>('general')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px' }}>Feelings Wheel</h1>
      <p style={{ color: '#57606a', margin: '0 0 32px', fontSize: 15 }}>
        Name it to tame it. Start in the middle and work outward.
      </p>

      <LevelSelector value={level} onChange={setLevel} />

      <div style={{ marginTop: 24 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 15 }}>What are you doing today?</p>
        <div style={{ display: 'flex', gap: 10 }}>
          {([
            { value: 'general',  label: '🧘 General check-in', desc: 'How am I feeling right now?' },
            { value: 'incident', label: '💬 Processing something', desc: 'I\'d like to work through a specific situation.' },
          ] as { value: SessionMode; label: string; desc: string }[]).map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              style={{
                flex: 1,
                padding: '12px 14px',
                border: `2px solid ${mode === m.value ? '#1f2328' : '#e5e7eb'}`,
                borderRadius: 10,
                background: mode === m.value ? '#f7f8fa' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: '#57606a' }}>{m.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onStart(level, mode)}
        style={{
          marginTop: 32,
          width: '100%',
          padding: '14px',
          background: '#1f2328',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Begin →
      </button>
    </div>
  )
}
