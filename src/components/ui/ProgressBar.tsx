import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/store/types'

export function progressFromTodos(todos: TodoItem[]) {
  if (!todos.length) return 0
  const done = todos.filter((t) => t.feito).length
  return Math.round((done / todos.length) * 100)
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-black/40 ring-1 ring-white/[0.06]', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-signal/70 to-porcelain transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
