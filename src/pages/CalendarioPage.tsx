import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, formatDate } from '@/lib/utils'
import type { Evento, EventoTipo } from '@/lib/store/types'

const TIPO_TONE: Record<EventoTipo, 'accent' | 'success' | 'warning' | 'info' | 'neutral'> = {
  reuniao: 'info',
  entrega: 'accent',
  financeiro: 'warning',
  pessoal: 'success',
  outro: 'neutral',
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // week starts Monday
  const start = new Date(year, month, 1 - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function CalendarioPage() {
  const { eventos, log } = useStore()
  const [cursor, setCursor] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'reuniao' as EventoTipo, data: new Date().toISOString().slice(0, 10) })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

  const proximos = [...eventos.items]
    .filter((e) => new Date(e.data) >= new Date(new Date().toDateString()))
    .sort((a, b) => +new Date(a.data) - +new Date(b.data))
    .slice(0, 6)

  function eventsOn(d: Date) {
    return eventos.items.filter((e) => {
      const ed = new Date(e.data)
      return ed.toDateString() === d.toDateString()
    })
  }

  async function handleCreate() {
    if (!form.titulo) return
    await eventos.add({
      titulo: form.titulo,
      tipo: form.tipo,
      data: new Date(form.data).toISOString(),
      criadoEm: new Date().toISOString(),
    })
    log(`Evento <b>${form.titulo}</b> agendado`)
    setModalOpen(false)
    setForm({ titulo: '', tipo: 'reuniao', data: new Date().toISOString().slice(0, 10) })
  }

  function moveEvent(evento: Evento, day: Date) {
    eventos.update(evento.id, { data: day.toISOString() })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <Card className="lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="rounded p-1.5 text-steel hover:text-porcelain">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="w-32 text-center text-sm font-medium text-porcelain capitalize">
              {cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="rounded p-1.5 text-steel hover:text-porcelain">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo evento
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-steel uppercase">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
            <div key={d} className="pb-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d) => {
            const inMonth = d.getMonth() === month
            const isToday = d.toDateString() === new Date().toDateString()
            const dayEvents = eventsOn(d)
            return (
              <div
                key={d.toISOString()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const eventoId = e.dataTransfer.getData('text/plain')
                  const evento = eventos.items.find((ev) => ev.id === eventoId)
                  if (evento) moveEvent(evento, d)
                }}
                className={cn(
                  'min-h-20 rounded-md border border-graphite/60 p-1.5 text-left align-top',
                  !inMonth && 'opacity-40',
                  isToday && 'border-signal',
                )}
              >
                <p className="mb-1 text-[11px] text-steel">{d.getDate()}</p>
                <div className="space-y-1">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', ev.id)}
                      className="cursor-grab truncate rounded bg-graphite px-1.5 py-0.5 text-[10px] text-mist"
                      title={ev.titulo}
                    >
                      {ev.titulo}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-medium text-porcelain">Próximos eventos</h3>
        <ul className="space-y-3">
          {proximos.map((ev) => (
            <li key={ev.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-porcelain">{ev.titulo}</p>
                <Badge tone={TIPO_TONE[ev.tipo]}>{ev.tipo}</Badge>
              </div>
              <p className="text-[11px] text-steel">{formatDate(ev.data)}</p>
            </li>
          ))}
          {!proximos.length && <p className="text-xs text-steel">Nenhum evento agendado.</p>}
        </ul>
      </Card>

      <Modal open={modalOpen} onOpenChange={setModalOpen} title="Novo evento">
        <div className="space-y-3.5">
          <label className="block text-xs font-medium text-mist">
            Título
            <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} className="input mt-1.5" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-mist">
              Tipo
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as EventoTipo }))} className="input mt-1.5">
                <option value="reuniao">Reunião</option>
                <option value="entrega">Entrega</option>
                <option value="financeiro">Financeiro</option>
                <option value="pessoal">Pessoal</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-mist">
              Data
              <input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} className="input mt-1.5" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreate}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
