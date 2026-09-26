import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TodoList } from '@/components/shared/TodoList'
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        onBlur={() => ensureBoard({ markdown, atualizadoEm: new Date().toISOString() })}
        rows={6}
        placeholder="Escreva notas em markdown…"
        className="input mb-4 resize-none font-mono text-xs"
      />
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
