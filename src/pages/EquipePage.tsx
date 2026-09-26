import { useStore } from '@/lib/store/StoreProvider'
import { Card } from '@/components/ui/Card'
import { initials } from '@/lib/utils'

export function EquipePage() {
  const { equipe } = useStore()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {equipe.items.map((member) => (
        <Card key={member.id} className="glass-sheen px-6 pt-8 pb-6 text-center">
          <div className="relative mx-auto mb-5 h-20 w-20">
            <div className="absolute inset-0 -z-10 scale-125 rounded-full bg-[radial-gradient(circle,rgb(185_195_212_/_0.18),transparent_70%)] blur-xl" />
            <div className="glass-heavy flex h-20 w-20 items-center justify-center rounded-full text-xl font-medium text-porcelain">
              {initials(member.nome)}
            </div>
          </div>
          <p className="text-base font-medium text-porcelain">{member.nome}</p>
          <p className="mt-0.5 mb-5 text-xs text-steel">{member.cargo}</p>
          <div className="glass-inset flex flex-wrap justify-center gap-1.5 rounded-xl p-2.5">
            {member.stack.map((s) => (
              <span key={s} className="glass-pill rounded-full px-2.5 py-1 text-[10px] text-mist">
                {s}
              </span>
            ))}
          </div>
        </Card>
      ))}
      {!equipe.items.length && <p className="text-xs text-steel">Nenhum membro cadastrado.</p>}
    </div>
  )
}
