'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from '@/components/ui/icons'
import { useMembership } from '@/features/subscription/hooks/useMembership'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { useFilings, useBorderTaxActions } from '../hooks/useBorderTax'
import { emptyForm, formFrom, toCreateBody, createErrorKey, resumable } from '../lib/borderTax'
import { BorderTaxForm } from './BorderTaxForm'
import { FilingHistory } from './FilingHistory'
import { FilingSheet } from './FilingSheet'
import { ConfirmValiditySheet } from './ConfirmValiditySheet'
import { SevaGateSheet } from './SevaGateSheet'

/** Border Tax tab: form + history; a filing opens full-screen preparing → Payment Details → result. */
export function BorderTaxScreen() {
  const t = useTranslations('seva')
  const router = useRouter()
  const filings = useFilings()
  const { create } = useBorderTaxActions()
  const membership = useMembership()
  const [form, setForm] = useState(() => emptyForm())
  const [picked, setOpenId] = useState(undefined) // undefined = driver hasn't chosen yet
  const [seed, setSeed] = useState(null)
  const [gate, setGate] = useState(false)
  const [confirm, setConfirm] = useState(false) // validity check before the filing starts
  const [error, setError] = useState(null)
  const [busyUntil, setBusyUntil] = useState(null) // govt portal busy: when to try again
  const prefilled = useRef(false)
  const scroller = useRef(null)

  // On arrival a running / just-finished filing reopens by itself (driver came back from the payment
  // tab or pressed back) until the driver opens or closes something.
  const openId = picked === undefined ? (resumable(filings.data)?.id ?? null) : picked

  // ?open=<id> (late-payment push / feed popup) opens that filing's receipt
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('open')
    if (id) setOpenId(id)
  }, [])

  // Prefill RC + seats from the latest filing — most drivers file for the same cab.
  useEffect(() => {
    const last = filings.data?.[0]
    if (!last || prefilled.current) return
    prefilled.current = true
    setForm((f) => (f.vehicleNo ? f : { ...f, vehicleNo: last.vehicleNo, seats: last.seats || f.seats }))
  }, [filings.data])

  const retry = (f) => { setOpenId(null); setError(null); setForm(formFrom(f)); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const notMember = membership.data && membershipView(membership.data).state !== MEMBERSHIP_STATE.ACTIVE
  const submit = () => (notMember ? setGate(true) : setConfirm(true))
  const start = () => {
    setConfirm(false)
    setError(null)
    return create.mutate(toCreateBody(form), {
      onSuccess: (f) => { setSeed(f); setOpenId(f.id) },
      onError: (e) => {
        if (e.code === 'SUBSCRIPTION_EXPIRED') return setGate(true)
        setBusyUntil(e.meta?.retryAfter ? new Date(Date.now() + e.meta.retryAfter * 1000) : null)
        return setError(createErrorKey(e))
      },
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div className="flex items-center gap-1 px-2 pb-1 pt-2">
        {/* history.length 1 = opened straight from a push/link: go to the Seva tab instead */}
        <button type="button" onClick={() => (window.history.length > 1 ? router.back() : router.push('/seva'))} aria-label={t('back')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ec-ink active:bg-ec-line/60">
          <ChevronLeft size={24} />
        </button>
        <h1 className="min-w-0 truncate text-[19px] font-extrabold tracking-tight text-ec-ink">{t('bt.title')}</h1>
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
        <BorderTaxForm form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} onSubmit={submit} submitting={create.isPending} error={error} busyUntil={busyUntil} />
        <FilingHistory filings={filings.data ?? []} isLoading={filings.isLoading} onOpen={setOpenId}
          hasMore={filings.hasNextPage} loadingMore={filings.isFetchingNextPage} onMore={() => filings.fetchNextPage()} />
      </div>
      {openId && <FilingSheet id={openId} seed={seed} onClose={() => setOpenId(null)} onRetry={retry} />}
      {confirm && <ConfirmValiditySheet form={form} onChange={() => { setConfirm(false); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }) }} onContinue={start} />}
      {gate && <SevaGateSheet onClose={() => setGate(false)} />}
    </div>
  )
}
