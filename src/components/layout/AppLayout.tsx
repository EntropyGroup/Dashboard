import { Bell, Bot } from 'lucide-react'
import { useTrevor } from '@/features/trevor/TrevorProvider'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomBar, useCurrentNavLabel } from './BottomBar'
import { EntropyMark, EntropyWordmark } from '@/components/brand/EntropyMark'
import { formatDate } from '@/lib/utils'

export function AppLayout() {
  const { notices } = useTrevor()
  const location = useLocation()
  const label = useCurrentNavLabel()

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-3 z-20 mx-3 flex h-14 items-center justify-between rounded-xl px-5">
        <div className="flex items-center gap-3">
          <EntropyMark className="h-5 w-5" />
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <h1 className="hidden text-sm font-medium text-porcelain sm:block">{label ?? 'Entropy'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/trevor" aria-label={`Abrir Trevor, ${notices.length} avisos pendentes`} className="glass-pill relative flex items-center gap-2 rounded-full px-3 py-2 text-xs text-mist hover:text-porcelain"><Bot className="h-4 w-4" /><span className="hidden sm:inline">Trevor</span>{notices.length > 0 && <span className="flex items-center gap-1 text-signal"><Bell className="h-3 w-3" />{notices.length > 99 ? '99+' : notices.length}</span>}</Link>
          <p className="hidden text-xs text-steel md:block">
            {formatDate(new Date(), { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <EntropyWordmark className="text-[10px] text-steel sm:hidden" />
        </div>
      </header>

      <main key={location.pathname} className="entropy-rise mx-auto max-w-[1400px] px-3 pt-6 pb-28 lg:px-6 lg:pb-32">
        <Outlet />
      </main>

      <BottomBar />
    </div>
  )
}
