import { useEffect, useState } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TodoList } from '@/components/shared/TodoList'
import { markdownToHtml } from '@/lib/markdown'
import { cn, relativeTime } from '@/lib/utils'
import type { Board } from '@/lib/store/types'

const BOARD_ID = 'dashboard'

function BoardPanel({
  title,
  board,
  boardId,
  collection,
}: {
  title: string
  board: Board | undefined
  boardId: string
  collection: ReturnType<typeof useStore>['quadroEquipe']
}) {
  const [markdown, setMarkdown] = useState(board?.markdown ?? '')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')

  useEffect(() => {
    setMarkdown(board?.markdown ?? '')
  }, [board?.markdown])

  function ensureBoard(patch: Partial<Board>) {
    if (board) {
      collection.update(boardId, patch)
    } else {
      collection.add({ markdown: '', todos: [], atualizadoEm: new Date().toISOString(), ...patch }, boardId)
    }
  }

  function saveMarkdown() {
    if (markdown === (board?.markdown ?? '')) return
    ensureBoard({ markdown, atualizadoEm: new Date().toISOString() })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {board?.atualizadoEm && <span className="text-[11px] text-steel">editado {relativeTime(board.atualizadoEm)}</span>}
          <div className="glass-pill flex gap-0.5 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => setMode('edit')}
              aria-pressed={mode === 'edit'}
              title="Editar"
              className={cn(
                'rounded-full p-1.5 transition-colors',
                mode === 'edit' ? 'bg-white/[0.1] text-porcelain' : 'text-steel hover:text-porcelain',
              )}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                saveMarkdown()
                setMode('preview')
              }}
              aria-pressed={mode === 'preview'}
              title="Visualizar"
              className={cn(
                'rounded-full p-1.5 transition-colors',
                mode === 'preview' ? 'bg-white/[0.1] text-porcelain' : 'text-steel hover:text-porcelain',
              )}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>

      {mode === 'edit' ? (
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          onBlur={saveMarkdown}
          rows={7}
          placeholder="Escreva notas em markdown… # título, **negrito**, - lista"
          className="input mb-4 resize-none font-mono text-xs"
        />
      ) : (
        <div
          className={cn(
            'glass-inset prose-notes mb-4 min-h-[9.5rem] rounded-lg p-3 text-sm text-mist',
            !markdown.trim() && 'flex items-center justify-center text-xs text-steel',
          )}
          dangerouslySetInnerHTML={
            markdown.trim() ? { __html: markdownToHtml(markdown) } : { __html: 'Nada escrito ainda.' }
          }
        />
      )}

      <TodoList todos={board?.todos ?? []} onChange={(todos) => ensureBoard({ todos, atualizadoEm: new Date().toISOString() })} />
    </Card>
  )
}

export function NotasPage() {
  const { quadroEquipe, minhasNotas } = useStore()
  const equipeBoard = quadroEquipe.items.find((b) => b.id === BOARD_ID)
  const meuBoard = minhasNotas.items[0]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BoardPanel title="Quadro da equipe" board={equipeBoard} boardId={BOARD_ID} collection={quadroEquipe} />
      <BoardPanel title="Minhas notas" board={meuBoard} boardId={meuBoard?.id ?? 'me'} collection={minhasNotas} />
    </div>
  )
}
