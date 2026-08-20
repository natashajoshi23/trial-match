import { useState, KeyboardEvent } from 'react'

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        aria-label="More information"
        style={{
          width: 15, height: 15, borderRadius: 999,
          border: '1.5px solid #C8BFB0', background: 'transparent',
          color: '#8A9BA8', fontSize: '0.58rem', fontWeight: 800,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', lineHeight: 1, fontFamily: 'Georgia, serif',
          flexShrink: 0,
        }}
      >i</button>
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1B3A52', color: '#FFFFFF',
          borderRadius: 10, padding: '10px 14px',
          fontSize: '0.71rem', lineHeight: 1.65, width: 240,
          boxShadow: '0 4px 20px rgba(27,58,82,0.25)',
          zIndex: 200, pointerEvents: 'none',
          whiteSpace: 'normal', textAlign: 'left',
          textTransform: 'none', letterSpacing: 'normal', fontWeight: 400,
        }}>
          {text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderTop: '6px solid #1B3A52',
          }} />
        </div>
      )}
    </span>
  )
}

interface Props {
  label: string
  placeholder?: string
  tags: string[]
  onChange: (tags: string[]) => void
  info?: string
}

export default function TagInput({ label, placeholder = 'Type and press Enter or comma to separate', tags, onChange, info }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const addMany = (raw: string) => {
    const newTags = raw.split(',').map(s => s.trim()).filter(s => s && !tags.includes(s))
    if (newTags.length) onChange([...tags, ...newTags])
    setInput('')
  }

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i))

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addMany(input) }
    if (e.key === ',') { e.preventDefault(); addMany(input) }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags.length - 1)
  }

  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center',
        fontSize: '0.72rem', fontWeight: 600,
        color: '#0D1F2D', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
        {info && <InfoTooltip text={info} />}
      </label>
      <div style={{
        minHeight: 40,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        borderRadius: 8,
        border: `1.5px solid ${focused ? '#1B3A52' : '#DDD5C0'}`,
        background: '#FFFFFF',
        padding: '6px 10px',
        boxShadow: focused ? '0 0 0 3px rgba(27,58,82,0.1)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {tags.map((tag, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            background: 'rgba(232,112,26,0.1)',
            border: '1px solid rgba(232,112,26,0.3)',
            color: '#A84800',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '2px 10px 2px 8px',
          }}>
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                color: '#E8701A',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
                padding: 0,
                marginLeft: 2,
              }}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => { addMany(input); setFocused(false) }}
          onFocus={() => setFocused(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: 120,
            outline: 'none',
            fontSize: '0.85rem',
            background: 'transparent',
            color: '#1B3A52',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            border: 'none',
          }}
        />
      </div>
    </div>
  )
}
