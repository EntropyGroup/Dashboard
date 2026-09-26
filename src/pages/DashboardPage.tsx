import { Link } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '@/lib/store/StoreProvider'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import { ProgressBar, progressFromTodos } from '@/components/ui/ProgressBar'
import { formatCurrency, relativeTime } from '@/lib/utils'

function useMonthlyRevenue(lancamentos: ReturnType<typeof useStore>['lancamentos']['items']) {
  const months: { label: string; entradas: number; saidas: number }[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('pt-BR', { month: 'short' })
    const entradas = lancamentos
      .filter((l) => {
        const ld = new Date(l.data)
        return l.tipo === 'entrada' && ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear()
      })
      .reduce((sum, l) => sum + l.valor, 0)
    const saidas = lancamentos
      .filter((l) => {
        const ld = new Date(l.data)
        return l.tipo === 'saida' && ld.getMonth() === d.getMonth() && ld.getFullYear() === d.getFullYear()
      })
      .reduce((sum, l) => sum + l.valor, 0)
    months.push({ label, entradas, saidas })
  }
  return months
}

export function DashboardPage() {
  const { projetos, lancamentos, atividades } = useStore()

  const now = new Date()
  const monthLancamentos = lancamentos.items.filter((l) => {
    const d = new Date(l.data)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const entradas = monthLancamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = monthLancamentos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const ativos = projetos.items.filter((p) => p.status === 'em_andamento').length

  const revenueData = useMonthlyRevenue(lancamentos.items)
  const emAndamento = [...projetos.items]
    .filter((p) => p.status !== 'concluido')
    .sort((a, b) => progressFromTodos(b.todos) - progressFromTodos(a.todos))
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-steel">Projetos ativos</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">{ativos}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Entradas do mês</p>
          <p className="mt-2 text-2xl font-medium text-success">{formatCurrency(entradas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saídas do mês</p>
          <p className="mt-2 text-2xl font-medium text-danger">{formatCurrency(saidas)}</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Saldo do mês</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">{formatCurrency(entradas - saidas)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita — últimos 6 meses</CardTitle>
          </CardHeader>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis
                  dataKey="label"
                  stroke="#777E88"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#111317',
                    border: '1px solid #1B1E23',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#F4F4F1',
                  }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line type="monotone" dataKey="entradas" stroke="#AEB7C4" strokeWidth={2} dot={false} name="Entradas" />
                <Line type="monotone" dataKey="saidas" stroke="#777E88" strokeWidth={1.5} dot={false} name="Saídas" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <ul className="space-y-3">
            {atividades.items.slice(0, 6).map((a) => (
              <li key={a.id} className="text-xs leading-relaxed text-mist">
                <span dangerouslySetInnerHTML={{ __html: a.texto }} />
                <p className="mt-0.5 text-[10px] text-steel">{relativeTime(a.criadoEm)}</p>
              </li>
            ))}
            {!atividades.items.length && <p className="text-xs text-steel">Nenhuma atividade ainda.</p>}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projetos em andamento</CardTitle>
          <Link to="/projetos" className="text-xs text-signal hover:underline">
            Ver todos
          </Link>
        </CardHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {emAndamento.map((p) => (
            <Link
              key={p.id}
              to={`/projetos/${p.id}`}
              className="rounded-md border border-graphite p-3.5 transition-colors hover:border-steel"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="truncate text-sm text-porcelain">{p.nome}</p>
                <StatusBadge status={p.status} />
              </div>
              <ProgressBar value={progressFromTodos(p.todos)} />
              <p className="mt-1.5 text-[11px] text-steel">{progressFromTodos(p.todos)}% concluído</p>
            </Link>
          ))}
          {!emAndamento.length && <p className="text-xs text-steel">Nenhum projeto em andamento.</p>}
        </div>
      </Card>
    </div>
  )
}
