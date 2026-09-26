import { useRef, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  // Callers often clear their state on close; keep showing the last content
  // so the exit animation doesn't play on an empty dialog.
  const last = useRef({ title, description, children })
  if (open) last.current = { title, description, children }
  const view = last.current

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="entropy-overlay fixed inset-0 z-50 bg-black/70 backdrop-blur-md" />
        <Dialog.Content
          className={cn(
            'entropy-dialog glass-strong fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl p-6 focus:outline-none',
            className,
          )}
        >
          <div className="entropy-dialog-head mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-sm font-medium text-porcelain">{view.title}</Dialog.Title>
              {view.description && (
                <Dialog.Description className="mt-1 text-xs text-steel">{view.description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="rounded-md p-1 text-steel transition-colors hover:bg-white/[0.08] hover:text-porcelain"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="entropy-dialog-body">{view.children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
