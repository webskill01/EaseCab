'use client'

import { useState } from 'react'
import { QrCode, Smartphone, Loader2, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { usePairing } from '../hooks/useWaSessions'
import { button, input } from '@/lib/ui'
import { cn } from '@/lib/utils'

const STEPS_QR = 'On the phone: WhatsApp → Settings → Linked devices → Link a device, then scan this.'
const STEPS_CODE = 'On the phone: WhatsApp → Settings → Linked devices → Link a device → "Link with phone number instead", then type this code.'

/** QR / code / result for the current pairing run. */
function PairView({ state, onRetry }) {
  const status = state?.status
  if (status === 'starting' || (status === 'qr' && !state.qrSvg)) {
    return <p className="flex items-center gap-2 text-sm text-ec-ink60"><Loader2 size={16} className="animate-spin" /> Getting a fresh QR / code… (~10s)</p>
  }
  if (status === 'qr') {
    return (
      <div className="flex flex-col items-center gap-2">
        {/* Our own server-rendered QR SVG (no scripts possible inside an <img>). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(state.qrSvg)}`} alt="WhatsApp pairing QR" className="h-64 w-64 rounded-lg border border-ec-line bg-white" />
        <p className="max-w-xs text-center text-xs text-ec-ink60">{STEPS_QR} It refreshes by itself.</p>
      </div>
    )
  }
  if (status === 'code') {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="rounded-lg bg-ec-sky px-4 py-2 font-mono text-2xl font-bold tracking-[0.2em] text-ec-ink">{state.code}</p>
        <p className="max-w-xs text-center text-xs text-ec-ink60">{STEPS_CODE}</p>
      </div>
    )
  }
  if (status === 'paired') {
    return <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> Linked! The bot starts reading this number&apos;s groups now.</p>
  }
  if (status === 'expired' || status === 'failed') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-700">
          <XCircle size={18} /> {status === 'expired' ? 'Nobody scanned in time.' : 'WhatsApp refused the link.'}
        </p>
        <button type="button" onClick={onRetry} className={button({ size: 'sm' })}><RotateCcw size={14} /> Try again</button>
      </div>
    )
  }
  return null
}

/**
 * Link a WhatsApp number to a session: QR scan, or a pairing code for a phone that
 * isn't in front of you. Used in the admin panel (`id`) and on the public share page (`token`).
 * @param {{ id?: string, token?: string }} props
 */
export function PairPanel({ id, token }) {
  const { state, start } = usePairing({ id, token })
  const [mode, setMode] = useState('qr')
  const [phone, setPhone] = useState('')
  const running = ['starting', 'qr', 'code'].includes(state?.status)
  const go = () => start.mutate(mode === 'code' ? phone : undefined)

  return (
    <div className="space-y-3">
      {!running && state?.status !== 'paired' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {[['qr', QrCode, 'Scan QR'], ['code', Smartphone, 'Use phone number']].map(([m, Icon, label]) => (
              <button key={m} type="button" onClick={() => setMode(m)} className={cn(button({ size: 'sm', variant: mode === m ? 'primary' : 'outline' }))}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          {mode === 'code' && (
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="WhatsApp number, e.g. 98765 43210" className={input} />
          )}
          <button type="button" disabled={start.isPending || (mode === 'code' && phone.replace(/\D/g, '').length < 10)} onClick={go} className={button({ variant: 'success' })}>
            {start.isPending ? <Loader2 size={15} className="animate-spin" /> : null} Start linking
          </button>
          {start.isError && <p className="text-xs font-medium text-red-600">{start.error?.message || 'Could not start.'}</p>}
        </div>
      )}
      <PairView state={state} onRetry={go} />
    </div>
  )
}
