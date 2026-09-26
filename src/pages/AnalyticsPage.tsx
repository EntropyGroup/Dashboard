import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'

const visits14d = Array.from({ length: 14 }).map((_, i) => ({
  dia: `${i + 1}`,
  visitas: Math.round(120 + Math.sin(i / 2) * 40 + Math.random() * 30),
}))

const fontes = [
  { fonte: 'Orgânico', valor: 420 },
  { fonte: 'Direto', valor: 260 },
  { fonte: 'Social', valor: 180 },
  { fonte: 'Referência', valor: 90 },
]

export function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-md border border-graphite bg-piano/50 px-4 py-2.5 text-xs text-steel">
        Dados de exemplo — aguardando integração com o site principal.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-steel">Visitas (7 dias)</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">1.284</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Visitantes únicos</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">942</p>
        </Card>
        <Card>
          <p className="text-xs text-steel">Tempo médio</p>
          <p className="mt-2 text-2xl font-medium text-porcelain">2m 14s</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitas — últimos 14 dias</CardTitle>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visits14d}>
              <XAxis dataKey="dia" stroke="#777E88" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#111317', border: '1px solid #1B1E23', borderRadius: 8, fontSize: 12, color: '#F4F4F1' }} />
              <Line type="monotone" dataKey="visitas" stroke="#AEB7C4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fontes de tráfego</CardTitle>
        </CardHeader>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fontes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1B1E23" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis dataKey="fonte" type="category" stroke="#777E88" fontSize={12} tickLine={false} axisLine={false} width={90} />
              <Tooltip contentStyle={{ background: '#111317', border: '1px solid #1B1E23', borderRadius: 8, fontSize: 12, color: '#F4F4F1' }} />
              <Bar dataKey="valor" fill="#AEB7C4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
