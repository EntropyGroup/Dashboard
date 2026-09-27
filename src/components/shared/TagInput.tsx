import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

export function TagInput({
  tags,
  onChange,
  placeholder = 'Adicionar e pressionar Enter…',
  id,
}: {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  id?: string
}) {
  const [text, setText] = useState('')

  function commit() {
    const value = text.trim()
    if (value && !tags.includes(value)) onChange([...tags, value])
    setText('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Backspace' && !text && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="input flex flex-wrap items-center gap-1.5 py-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="glass-pill flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-[11px] text-mist"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            aria-label={`Remover ${tag}`}
            className="rounded-full p-0.5 text-steel hover:text-danger"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={tags.length ? '' : placeholder}
        className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-porcelain outline-none placeholder:text-steel"
      />
    </div>
  )
}
