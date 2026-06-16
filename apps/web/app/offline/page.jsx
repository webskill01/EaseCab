import { Steer } from '@/components/ui/icons'

// Offline fallback (Step 25). Precached by the app-shell SW. Intentionally
// English-only — a flagged exception to CLAUDE.md §14 for this degraded edge
// state (the SW precaches a single rendered snapshot).
export const metadata = { title: 'Offline — EaseCab' }

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ec-blue text-white">
        <Steer size={34} />
      </div>
      <h1 className="text-xl font-extrabold text-ec-ink">You&rsquo;re offline</h1>
      <p className="max-w-xs text-sm font-medium text-ec-ink40">
        EaseCab can&rsquo;t reach the network right now. Check your connection &mdash; your ride
        feed will reload automatically once you&rsquo;re back online.
      </p>
    </main>
  )
}
