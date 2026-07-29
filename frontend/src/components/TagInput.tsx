import { useState, KeyboardEvent } from 'react'

interface Props {
  label: string
  placeholder?: string
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ label, placeholder = 'Type and press Enter', tags, onChange }: Props) {
  const [input, setInput] = useState('')

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
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="min-h-[38px] flex flex-wrap gap-1.5 items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2
        focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20 transition-colors">
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 text-teal-800 text-xs px-2.5 py-0.5 font-medium">
            {tag}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-teal-500 hover:text-teal-700 leading-none ml-0.5 transition-colors"
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
          onBlur={add}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent placeholder:text-slate-400"
        />
      </div>
    </div>
  )
}
