import { useState, KeyboardEvent } from 'react'

interface Props {
  label: string
  placeholder?: string
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ label, placeholder = 'Type and press Enter', tags, onChange }: Props) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)

  const add = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) onChange([...tags, val])
    setInput('')
  }

  const remove = (i: number) => onChange(tags.filter((_, idx) => idx !== i))

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags.length - 1)
  }

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: '#9090B8',
        marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{
        minHeight: 40,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'center',
        borderRadius: 8,
        border: `1px solid ${focused ? '#7C5CFC' : '#252845'}`,
        background: '#080A16',
        padding: '6px 10px',
        boxShadow: focused ? '0 0 0 3px rgba(124,92,252,0.15)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {tags.map((tag, i) => (
          <span key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 999,
            background: 'rgba(124,92,252,0.18)',
            border: '1px solid rgba(124,92,252,0.35)',
            color: '#C4B8FF',
            fontSize: '0.72rem',
            fontWeight: 600,
            padding: '2px 10px 2px 8px',
          }}>
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                color: '#7C5CFC',
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
          onBlur={() => { add(); setFocused(false) }}
          onFocus={() => setFocused(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: 120,
            outline: 'none',
            fontSize: '0.85rem',
            background: 'transparent',
            color: '#EDE8FF',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            border: 'none',
          }}
        />
      </div>
    </div>
  )
}
