import { cn } from '@/lib/utils'

/**
 * Angular radial-blade mark — approximates the Entropy symbol: a compass-like
 * burst of asymmetric vectors emerging from a central point, evoking a core
 * from which movement/direction radiates. See docs/design system §02.
 */
export function EntropyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="currentColor"
      className={cn('text-porcelain', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* vertical spine, top */}
      <polygon points="32,4 33.6,28 30.4,28" opacity="0.9" />
      {/* long blade, upper right — the dominant vector */}
      <polygon points="52,12 33.5,29.5 46,17" opacity="0.95" />
      <polygon points="48,22 33.8,30.6 45,26" opacity="0.55" />
      {/* right blade */}
      <polygon points="58,34 31.5,32.6 55,30" opacity="0.8" />
      {/* lower right, short */}
      <polygon points="46,48 31,33.5 40,44" opacity="0.65" />
      {/* bottom spine */}
      <polygon points="32,58 30.6,34 33.4,34" opacity="0.85" />
      {/* lower left */}
      <polygon points="16,50 30.6,34.2 22,46" opacity="0.7" />
      {/* left blade */}
      <polygon points="6,36 30.5,32 8,39" opacity="0.6" />
      {/* upper left, short accent */}
      <polygon points="19,15 30.2,30 24,19" opacity="0.5" />
      {/* small detached fragment, upper right (as in mark) */}
      <polygon points="41,19 44,15.5 42.4,20" opacity="0.4" />
      {/* small detached fragment, lower left */}
      <polygon points="12,42 15.5,40 13,44" opacity="0.4" />
      {/* core */}
      <circle cx="32" cy="32" r="2.6" />
    </svg>
  )
}

export function EntropyWordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-[0.34em] text-porcelain uppercase', className)}>
      Entropy
    </span>
  )
}
