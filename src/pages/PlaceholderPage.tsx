import type { LucideIcon } from 'lucide-react'

export function PlaceholderPage({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-graphite text-steel">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-medium text-porcelain">{title}</h2>
      <p className="mt-1.5 max-w-sm text-xs text-steel">{description}</p>
    </div>
  )
}
