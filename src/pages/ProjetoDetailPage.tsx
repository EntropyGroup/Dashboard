import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2, ExternalLink, Link2 } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { ProgressBar, progressFromTodos } from '@/components/ui/ProgressBar'
import { TodoList } from '@/components/shared/TodoList'
import { TagInput } from '@/components/shared/TagInput'
import { GithubActivity } from '@/components/shared/GithubActivity'
import { founders } from '@/lib/team'
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils'
import type { ProjectStatus } from '@/lib/store/types'

export function ProjetoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { projetos, clientes, lancamentos, log } = useStore()
  const confirm = useConfirm()
  const [descricao, setDescricao] = useState<string | null>(null)
  const [link, setLink] = useState<string | null>(null)

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
  const responsavel = founders.find((f) => f.id === project.responsavelId)
  const relacionados = [...lancamentos.items]
    .filter((l) => l.projetoId === project.id)
    .sort((a, b) => +new Date(b.data) - +new Date(a.data))
  const faturado = relacionados.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const gastos = relacionados.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const progress = progressFromTodos(project.todos)
  const currentDescricao = descricao ?? project.descricao ?? ''
  const currentLink = link ?? project.link ?? ''

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
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Responsável"
            value={project.responsavelId ?? ''}
            onChange={(e) => projetos.update(project.id, { responsavelId: e.target.value || undefined })}
            className="input w-auto"
          >
            <option value="">Sem responsável</option>
            {founders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Status"
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
          <p className="mt-2 text-xl font-medium text-success tabular-nums">{formatCurrency(faturado)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Gastos</p>
          <p className="mt-2 text-xl font-medium text-danger tabular-nums">{formatCurrency(gastos)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Cobrança prevista</p>
          <p className="mt-2 text-xl font-medium text-porcelain tabular-nums">
            {project.valorCobranca ? formatCurrency(project.valorCobranca) : '—'}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
              {responsavel && (
                <div className="flex items-center gap-1.5 text-[11px] text-steel">
                  <div className="glass flex h-5 w-5 items-center justify-center rounded-full text-[9px] text-porcelain">
                    {initials(responsavel.nome)}
                  </div>
                  {responsavel.nome}
                </div>
              )}
            </CardHeader>
            <textarea
              value={currentDescricao}
              onChange={(e) => setDescricao(e.target.value)}
              onBlur={() => descricao !== null && projetos.update(project.id, { descricao })}
              rows={4}
              placeholder="Descreva o escopo do projeto…"
              className="input resize-none"
            />

            <label htmlFor="p-link" className="mt-4 mb-1.5 block text-xs font-medium text-mist">
              Link
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-steel" />
                <input
                  id="p-link"
                  type="url"
                  value={currentLink}
                  onChange={(e) => setLink(e.target.value)}
                  onBlur={() => link !== null && projetos.update(project.id, { link: link || undefined })}
                  placeholder="https://…"
                  className="input pl-9"
                />
              </div>
              {project.link && (
                <a
                  href={project.link}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Abrir link em nova aba"
                  className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-steel hover:text-porcelain"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <label htmlFor="p-stack" className="mt-4 mb-1.5 block text-xs font-medium text-mist">
              Stack
            </label>
            <TagInput
              id="p-stack"
              tags={project.stack}
              onChange={(stack) => projetos.update(project.id, { stack })}
              placeholder="React, Node…"
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financeiro do projeto</CardTitle>
            </CardHeader>
            {relacionados.length ? (
              <ul className="divide-y divide-white/[0.06]">
                {relacionados.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate text-porcelain">{l.descricao}</p>
                      <p className="text-[11px] text-steel">{formatDate(l.data)}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 font-medium tabular-nums',
                        l.tipo === 'entrada' ? 'text-success' : 'text-danger',
                      )}
                    >
                      {l.tipo === 'entrada' ? '+' : '-'}
                      {formatCurrency(l.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-steel">Nenhum lançamento vinculado a este projeto ainda.</p>
            )}
          </Card>

          <GithubActivity link={project.link} />
        </div>

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
