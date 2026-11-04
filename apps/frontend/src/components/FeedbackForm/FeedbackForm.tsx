// FeedbackForm/FeedbackForm.tsx — session feedback form
import { useState } from 'react'

interface Props {
  sessionId: string
  onSubmit: (rating: number, comment: string) => void
  onSkip: () => void
}

export default function FeedbackForm({ onSubmit, onSkip }: Props) {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 24px 32px' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>How was that?</h2>
      <p style={{ fontSize: 14, color: '#57606a', margin: '0 0 20px' }}>
        Your feedback helps improve this tool. It takes 10 seconds.
      </p>

      {/* Star rating */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            aria-label={`${star} star`}
            style={{
              fontSize: 28,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              opacity: star <= rating ? 1 : 0.3,
              transition: 'opacity 0.15s',
            }}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Any comments? (optional)"
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

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => rating > 0 && onSubmit(rating, comment)}
          disabled={rating === 0}
          style={{
            flex: 1,
            padding: '12px',
            background: rating > 0 ? '#1f2328' : '#e5e7eb',
            color: rating > 0 ? '#fff' : '#57606a',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: rating > 0 ? 'pointer' : 'default',
          }}
        >
          Submit feedback
        </button>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
            color: '#57606a',
            cursor: 'pointer',
          }}
        >
          Skip
        </button>
      </div>
    </div>
  )
}
