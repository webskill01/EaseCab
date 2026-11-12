'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Crown } from '@/components/ui/icons'
import { useMembership } from '@/features/subscription/hooks/useMembership'
import { membershipView, MEMBERSHIP_STATE } from '@/features/subscription/lib/membership'
import { useFilings, useBorderTaxActions } from '../hooks/useBorderTax'
import { emptyForm, formFrom, toCreateBody, createErrorKey, resumable } from '../lib/borderTax'
import { BorderTaxForm } from './BorderTaxForm'
import { FilingHistory } from './FilingHistory'
import { FilingSheet } from './FilingSheet'

/** Members-only soft gate: everyone sees the form, the gate fires on submit (§1 soft gate). */
function GateSheet({ onClose, onSubscribe }) {
  const t = useTranslations('seva')
  const tc = useTranslations('common')
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('bt.gate.title')}>
      <SheetTitle icon={<Crown size={22} />} tone="blue" title={t('bt.gate.title')} sub={t('bt.gate.sub')} />
      <div className="flex flex-col gap-3 pb-2">
        <Button type="button" size="lg" className="w-full" onClick={onSubscribe}>{t('bt.gate.subscribe')}</Button>
        <Button type="button" variant="ghost" className="w-full bg-ec-bg font-bold text-ec-ink60" onClick={onClose}>{t('bt.gate.notNow')}</Button>
      </div>
    </BottomSheet>
  )
}

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
  const [error, setError] = useState(null)
  const [busyUntil, setBusyUntil] = useState(null) // govt portal busy: when to try again
  const prefilled = useRef(false)
  const scroller = useRef(null)

  // On arrival a running / just-finished filing reopens by itself (driver came back from the payment
  // tab or pressed back) until the driver opens or closes something.
  const openId = picked === undefined ? (resumable(filings.data)?.id ?? null) : picked

  // Prefill RC + seats from the latest filing — most drivers file for the same cab.
  useEffect(() => {
    const last = filings.data?.[0]
    if (!last || prefilled.current) return
    prefilled.current = true
    setForm((f) => (f.vehicleNo ? f : { ...f, vehicleNo: last.vehicleNo, seats: last.seats || f.seats }))
  }, [filings.data])

  const retry = (f) => { setOpenId(null); setError(null); setForm(formFrom(f)); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }) }
  const notMember = membership.data && membershipView(membership.data).state !== MEMBERSHIP_STATE.ACTIVE
  const submit = () => {
    if (notMember) return setGate(true)
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
      <h1 className="px-4 pb-1 pt-3 text-[19px] font-extrabold tracking-tight text-ec-ink">{t('bt.title')}</h1>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-1">
        <BorderTaxForm form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} onSubmit={submit} submitting={create.isPending} error={error} busyUntil={busyUntil} />
        <FilingHistory filings={filings.data ?? []} isLoading={filings.isLoading} onOpen={setOpenId}
          hasMore={filings.hasNextPage} loadingMore={filings.isFetchingNextPage} onMore={() => filings.fetchNextPage()} />
      </div>
      {openId && <FilingSheet id={openId} seed={seed} onClose={() => setOpenId(null)} onRetry={retry} />}
      {gate && <GateSheet onClose={() => setGate(false)} onSubscribe={() => router.push('/membership')} />}
    </div>
  )
}
