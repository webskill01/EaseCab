'use client'

import { FileDown, Eye } from 'lucide-react'
import { UserLink } from '@/features/shell/components/UserLink'
import { fetchReceiptUrl } from '../services/borderTaxApi'
import { button, pill } from '@/lib/ui'
import { OUTCOME, issueLabel } from '../lib/tags'

export const STATUS = {
  queued: ['Queued', 'amber'], filling: ['Filling', 'amber'], awaiting_captcha: ['Captcha', 'amber'],
  awaiting_payment: ['QR shown', 'violet'], handed_off: ['Handed off', 'blue'], paid: ['Paid', 'green'],
  failed: ['Failed', 'red'], expired: ['Expired', 'red'], cancelled: ['Cancelled', 'slate'],
}
const UNLOCK = { queued: 'Lock clear queued', waiting: 'Lock clear waiting', cleared: 'Lock cleared', paid: 'Lock: was paid', failed: 'Lock clear failed' }

const when = (iso) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
export const inr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

async function openReceipt(id, view) {
  const tab = window.open('', '_blank') // opened on the tap so pop-up blockers allow it
  try { tab.location = await fetchReceiptUrl(id, view) } catch { tab?.close() }
}

/** One filing: vehicle/state/amount, date (+ driver), result tag, issue, receipt buttons. Stacks on mobile. */
export function FilingRow({ f, showDriver = true }) {
  const [label, tone] = OUTCOME[f.outcome] || STATUS[f.status] || [f.status, 'slate']
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-ec-ink">
          {f.vehicleNo} · {f.stateCd} {f.checkpost || ''} · {f.seats}{f.taxPaise ? ` · ${inr(f.taxPaise)}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-ec-ink60">
          {when(f.createdAt)}
          {showDriver && <> · <UserLink id={f.userId}>{f.userName || 'Driver'}</UserLink>{f.isTest ? ' (test)' : ''}</>}
          {f.receiptNo ? ` · ${f.receiptNo}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={pill({ tone })}>{label}</span>
        {f.failureCode && <span title={f.failureCode} className={pill({ tone: f.outcome === 'failed' ? 'red' : 'slate' })}>{issueLabel(f.failureCode)}</span>}
        {f.unlock && <span className={pill({ tone: f.unlock.status === 'failed' ? 'red' : 'slate' })}>{UNLOCK[f.unlock.status] || f.unlock.status}</span>}
        {f.hasReceipt && (
          <>
            <button type="button" onClick={() => openReceipt(f.id, true)} className={button({ size: 'sm', variant: 'primary' })}><Eye size={14} /> View</button>
            <button type="button" onClick={() => openReceipt(f.id)} className={button({ size: 'sm' })}><FileDown size={14} /> Receipt</button>
          </>
        )}
      </div>
    </li>
  )
}
