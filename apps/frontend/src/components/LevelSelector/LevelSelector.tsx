// LevelSelector/LevelSelector.tsx — choose child / adult / advanced
import type { Level } from '../../types'

interface Props {
  value: Level
  onChange: (level: Level) => void
}

const levels: { value: Level; label: string; desc: string; emoji: string }[] = [
  { value: 'child',    label: 'Simple',   desc: 'Core feelings only — great for children or when starting out', emoji: '🌱' },
  { value: 'adult',    label: 'Moderate', desc: 'Core and more detailed feelings', emoji: '🌿' },
  { value: 'advanced', label: 'Full',     desc: 'All feelings including clinical DBT vocabulary', emoji: '🌳' },
]

export default function LevelSelector({ value, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 15 }}>Choose your level</p>
      {levels.map((l) => (
        <button
          key={l.value}
          onClick={() => onChange(l.value)}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px 16px',
            border: `2px solid ${value === l.value ? '#1f2328' : '#e5e7eb'}`,
            borderRadius: 10,
            background: value === l.value ? '#f7f8fa' : '#fff',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <span style={{ fontSize: 20 }}>{l.emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{l.label}</div>
            <div style={{ fontSize: 12, color: '#57606a' }}>{l.desc}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
