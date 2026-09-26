import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { formatDate, relativeTime } from '@/lib/utils'

export function AtividadesPage() {
  const { atividades } = useStore()

  return (
    <Card>
      <ul className="divide-y divide-graphite">
        {atividades.items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-mist" dangerouslySetInnerHTML={{ __html: a.texto }} />
            <div className="shrink-0 text-right">
              <p className="text-xs text-steel">{relativeTime(a.criadoEm)}</p>
              <p className="text-[10px] text-steel/70">{formatDate(a.criadoEm, { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
          </li>
        ))}
        {!atividades.items.length && <p className="py-6 text-center text-xs text-steel">Nenhuma atividade registrada.</p>}
      </ul>
    </Card>
  )
}
