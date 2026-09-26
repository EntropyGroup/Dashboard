import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-md',
  {
    variants: {
      tone: {
        neutral: 'border-white/10 bg-white/[0.04] text-mist',
        success: 'border-success/25 bg-success/10 text-success',
        warning: 'border-warning/25 bg-warning/10 text-warning',
        danger: 'border-danger/25 bg-danger/10 text-danger',
        info: 'border-info/25 bg-info/10 text-info',
        accent: 'border-signal/25 bg-signal/10 text-signal',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

import type { ProjectStatus } from '@/lib/store/types'

const STATUS_MAP: Record<ProjectStatus, { label: string; tone: BadgeProps['tone'] }> = {
  planejamento: { label: 'Planejamento', tone: 'info' },
  em_andamento: { label: 'Em andamento', tone: 'accent' },
  pausado: { label: 'Pausado', tone: 'warning' },
  concluido: { label: 'Concluído', tone: 'success' },
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const meta = STATUS_MAP[status]
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}
