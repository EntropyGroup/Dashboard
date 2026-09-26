import type { CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import { LogOut } from 'lucide-react'
import { primaryNavItems, moreNavGroups, allNavItems } from '@/lib/navItems'
import { useAuth } from '@/features/auth/AuthProvider'
import { EntropyMark } from '@/components/brand/EntropyMark'
import { cn, initials } from '@/lib/utils'

function useIsActive(path: string, end?: boolean) {
  const location = useLocation()
  return end ? location.pathname === path : location.pathname.startsWith(path)
}

function TabButton({ path, label, icon: Icon, end }: { path: string; label: string; icon: any; end?: boolean }) {
  const isActive = useIsActive(path, end)
  return (
    <Link
      to={path}
      className={cn(
        'relative flex w-16 flex-col items-center justify-center gap-1 rounded-full py-2 transition-all duration-200',
        isActive ? 'text-obsidian' : 'text-mist hover:text-porcelain',
      )}
    >
      {isActive && (
        <span className="absolute inset-0 rounded-full bg-porcelain shadow-[0_1px_0_rgb(255_255_255_/_0.6)_inset,0_6px_16px_-6px_rgb(0_0_0_/_0.5)]" />
      )}
      <Icon className="relative z-10 h-[19px] w-[19px]" strokeWidth={isActive ? 2.3 : 1.9} />
      <span className="relative z-10 text-[10px] leading-none font-medium">{label}</span>
    </Link>
  )
}

/** Plain-string className only — avoids Radix Slot's prop merge inside Popover.Close asChild,
 *  which stringifies a function className instead of calling it. */
function MoreListItem({ path, label, icon: Icon, index }: { path: string; label: string; icon: any; index: number }) {
  const isActive = useIsActive(path)
  return (
    <Popover.Close asChild>
      <Link
        to={path}
        style={{ '--i': index } as CSSProperties}
        className={cn(
          'entropy-sheet-item flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
          isActive ? 'glass-inset text-porcelain' : 'text-mist hover:bg-white/[0.06] hover:text-porcelain',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    </Popover.Close>
  )
}

export function BottomBar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const moreActive = !primaryNavItems.some((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )

  return (
    <div className="fixed inset-x-0 bottom-2 z-30 flex justify-center px-4">
      <nav className="glass-strong relative flex items-center gap-1 rounded-full p-1.5">
        {primaryNavItems.slice(0, 2).map((item) => (
          <TabButton key={item.path} path={item.path} label={item.label} icon={item.icon} end={item.path === '/'} />
        ))}

        {/* center slot — reserves space under the raised orb */}
        <div className="relative w-[4.5rem] self-stretch">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className={cn(
              'glass-heavy absolute -top-7 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full ring-4 ring-void/80 transition-transform duration-200 hover:scale-105 active:scale-95',
              moreActive ? 'text-porcelain' : 'text-mist hover:text-porcelain',
            )}
            aria-label="Mais opções"
          >
            <EntropyMark className="entropy-orb-mark relative z-10 h-7 w-7" />
          </button>
        </Popover.Trigger>
        {moreActive && (
          <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-porcelain" />
        )}
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="center"
            sideOffset={14}
            collisionPadding={16}
            className="glass-strong entropy-sheet z-40 w-72 rounded-2xl p-2"
            style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
          >
            <div className="max-h-full overflow-y-auto p-1.5">
              {moreNavGroups.map((group, gi) => {
                const offset = moreNavGroups.slice(0, gi).reduce((n, g) => n + g.items.length + 1, 0)
                return (
                  <div key={group.label} className="mb-3 last:mb-0">
                    <p
                      style={{ '--i': offset } as CSSProperties}
                      className="entropy-sheet-item mb-1 px-2.5 text-[10px] font-medium tracking-[0.14em] text-steel/70 uppercase"
                    >
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((item, ii) => (
                        <MoreListItem key={item.path} path={item.path} label={item.label} icon={item.icon} index={offset + ii + 1} />
                      ))}
                    </div>
                  </div>
                )
              })}

              <div
                style={{ '--i': allNavItems.length } as CSSProperties}
                className="entropy-sheet-item mt-1 border-t border-white/[0.08] pt-2"
              >
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
                  <div className="glass flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-porcelain">
                    {initials(user?.displayName || user?.email || 'U')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-porcelain">{user?.displayName || 'Usuário'}</p>
                    <p className="truncate text-[10px] text-steel">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="rounded-md p-1.5 text-steel transition-colors hover:bg-white/[0.08] hover:text-porcelain"
                    title="Sair"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
        </div>

        {primaryNavItems.slice(2).map((item) => (
          <TabButton key={item.path} path={item.path} label={item.label} icon={item.icon} />
        ))}
      </nav>
    </div>
  )
}

export function useCurrentNavLabel() {
  const location = useLocation()
  return allNavItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path),
  )?.label
}
