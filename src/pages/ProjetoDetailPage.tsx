import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, ExternalLink } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ProgressBar, progressFromTodos } from '@/components/ui/ProgressBar'
import { TodoList } from '@/components/shared/TodoList'
import { formatCurrency } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/store/types'

export function ProjetoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projetos, clientes, lancamentos, log } = useStore()
  const confirm = useConfirm()
  const [descricao, setDescricao] = useState<string | null>(null)

  const project = projetos.items.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="text-sm text-steel">
        Projeto não encontrado.{' '}
        <button onClick={() => navigate('/projetos')} className="text-signal hover:underline">
          Voltar
        </button>
      </div>
    )
  }

  const cliente = clientes.items.find((c) => c.id === project.clienteId)
  const relacionados = lancamentos.items.filter((l) => l.projetoId === project.id)
  const faturado = relacionados.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const gastos = relacionados.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const progress = progressFromTodos(project.todos)
  const currentDescricao = descricao ?? project.descricao ?? ''

  async function handleDelete() {
    const ok = await confirm({
      title: 'Excluir projeto',
      description: `Remover "${project!.nome}"? Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      await projetos.remove(project!.id)
      log(`Projeto <b>${project!.nome}</b> excluído`)
      navigate('/projetos')
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/projetos')}
        className="flex items-center gap-1.5 text-xs text-steel hover:text-porcelain"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Projetos
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <h2 className="text-lg font-medium text-porcelain">{project.nome}</h2>
            <StatusBadge status={project.status} />
          </div>
          <p className="text-xs text-steel">
            {project.tipo} {cliente && `· ${cliente.nome}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={project.status}
            onChange={(e) => projetos.update(project.id, { status: e.target.value as ProjectStatus })}
            className="input w-auto"
          >
            <option value="planejamento">Planejamento</option>
            <option value="em_andamento">Em andamento</option>
            <option value="pausado">Pausado</option>
            <option value="concluido">Concluído</option>
          </select>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs text-steel">Faturado</p>
          <p className="mt-2 text-xl font-medium text-success">{formatCurrency(faturado)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Gastos</p>
          <p className="mt-2 text-xl font-medium text-danger">{formatCurrency(gastos)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Cobrança prevista</p>
          <p className="mt-2 text-xl font-medium text-porcelain">
            {project.valorCobranca ? formatCurrency(project.valorCobranca) : '—'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <textarea
            value={currentDescricao}
            onChange={(e) => setDescricao(e.target.value)}
            onBlur={() => descricao !== null && projetos.update(project.id, { descricao })}
            rows={4}
            placeholder="Descreva o escopo do projeto…"
            className="input resize-none"
          />

          {project.link && (
            <a
              href={project.link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-signal hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {project.link}
            </a>
          )}

          {project.stack.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {project.stack.map((s) => (
                <span key={s} className="rounded-full bg-graphite px-2.5 py-1 text-[11px] text-mist">
                  {s}
                </span>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progresso</CardTitle>
          </CardHeader>
          <ProgressBar value={progress} />
          <p className="mt-1.5 mb-4 text-[11px] text-steel">{progress}% concluído</p>
          <TodoList todos={project.todos} onChange={(todos) => projetos.update(project.id, { todos })} />
        </Card>
      </div>
    </div>
  )
}
