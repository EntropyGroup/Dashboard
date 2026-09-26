import { useState } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import { cn, uid } from '@/lib/utils'
import type { TodoItem } from '@/lib/store/types'

export function TodoList({
  todos,
  onChange,
}: {
  todos: TodoItem[]
  onChange: (todos: TodoItem[]) => void
}) {
  const [text, setText] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)

  const sorted = [...todos].sort((a, b) => a.ordem - b.ordem)

  function add() {
    if (!text.trim()) return
    onChange([...todos, { id: uid(), texto: text.trim(), feito: false, ordem: todos.length }])
    setText('')
  }

  function toggle(id: string) {
    onChange(todos.map((t) => (t.id === id ? { ...t, feito: !t.feito } : t)))
  }

  function remove(id: string) {
    onChange(todos.filter((t) => t.id !== id))
  }

  function reorder(overId: string) {
    if (!dragId || dragId === overId) return
    const list = [...sorted]
    const from = list.findIndex((t) => t.id === dragId)
    const to = list.findIndex((t) => t.id === overId)
    if (from === -1 || to === -1) return
    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    onChange(list.map((t, i) => ({ ...t, ordem: i })))
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((t) => (
        <div
          key={t.id}
          draggable
          onDragStart={() => setDragId(t.id)}
          onDragOver={(e) => {
            e.preventDefault()
            reorder(t.id)
          }}
          onDragEnd={() => setDragId(null)}
          className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-graphite"
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-steel opacity-0 group-hover:opacity-100" />
          <input
            type="checkbox"
            checked={t.feito}
            onChange={() => toggle(t.id)}
            className="h-3.5 w-3.5 shrink-0 accent-[var(--color-signal)]"
          />
          <span className={cn('flex-1 text-sm', t.feito ? 'text-steel line-through' : 'text-porcelain')}>
            {t.texto}
          </span>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 rounded p-0.5 text-steel opacity-0 hover:text-danger group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 px-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Adicionar item…"
          className="flex-1 bg-transparent text-sm text-porcelain outline-none placeholder:text-steel"
        />
        <button onClick={add} className="rounded p-1 text-steel hover:text-porcelain">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
