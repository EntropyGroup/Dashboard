import {
  Bot,
  LayoutDashboard,
  Wallet,
  Users,
  Briefcase,
  FolderKanban,
  Inbox,
  CalendarDays,
  StickyNote,
  Activity,
  Users2,
  BarChart3,
  Settings,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const navGroups: NavGroup[] = [
  {
    label: 'Visão geral',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/trevor', label: 'Trevor', icon: Bot },
      { path: '/analytics', label: 'Analytics', icon: BarChart3 },
      { path: '/atividades', label: 'Atividades', icon: Activity },
    ],
  },
  {
    label: 'Negócio',
    items: [
      { path: '/financeiro', label: 'Financeiro', icon: Wallet },
      { path: '/clientes', label: 'Clientes', icon: Users },
      { path: '/leads', label: 'Leads', icon: Inbox },
    ],
  },
  {
    label: 'Trabalho',
    items: [
      { path: '/projetos', label: 'Projetos', icon: Briefcase },
      { path: '/projetos-pessoais', label: 'Projetos pessoais', icon: FolderKanban },
      { path: '/calendario', label: 'Calendário', icon: CalendarDays },
      { path: '/notas', label: 'Notas', icon: StickyNote },
    ],
  },
  {
    label: 'Estúdio',
    items: [
      { path: '/equipe', label: 'Equipe', icon: Users2 },
      { path: '/infraestrutura', label: 'Infraestrutura', icon: Server },
      { path: '/seguranca', label: 'Segurança', icon: ShieldCheck },
      { path: '/config', label: 'Configurações', icon: Settings },
    ],
  },
]

export const allNavItems = navGroups.flatMap((g) => g.items)

/** The items that live directly on the bottom bar — everything else sits behind "Mais". */
export const primaryNavPaths = ['/', '/projetos', '/financeiro', '/clientes']

export const primaryNavItems = primaryNavPaths
  .map((path) => allNavItems.find((item) => item.path === path)!)
  .filter(Boolean)

export const moreNavGroups: NavGroup[] = navGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => !primaryNavPaths.includes(item.path)),
  }))
  .filter((group) => group.items.length > 0)
