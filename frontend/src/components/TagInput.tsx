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
        color: '#8A9BA8',
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
          onBlur={() => { add(); setFocused(false) }}
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
