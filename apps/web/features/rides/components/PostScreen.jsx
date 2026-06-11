'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check } from '@/components/ui/icons'
import { PostForm } from './PostForm'
import { PasteForm } from './PasteForm'
import { VerifyGateSheet } from './VerifyGateSheet'
import { usePostRide } from '../hooks/usePostRide'
import { emptyForm, draftToForm } from '../lib/postForm'

const TAB = { FORM: 'form', PASTE: 'paste' }

/**
 * Post a Ride (SCREENS §5) — two input modes (structured form + WhatsApp paste).
 * Owns the shared form state so the paste tab's "Edit fields" can prefill the form;
 * the soft gate + success are driven by usePostRide.
 */
export function PostScreen() {
  const t = useTranslations('post')
  const router = useRouter()
  const [tab, setTab] = useState(TAB.FORM)
  const [form, setForm] = useState(emptyForm())
  const post = usePostRide()

  if (post.posted) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-ec-bg px-6 text-center">
        <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-ec-wa text-white"><Check size={44} /></div>
        <h2 className="text-[20px] font-extrabold text-ec-ink">{t('success.title')}</h2>
        <button type="button" onClick={() => router.push('/mine')} className="h-[52px] w-full max-w-[320px] rounded-xl bg-ec-blue text-[15.5px] font-extrabold text-white shadow-ec-blue">
          {t('success.viewMine')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ec-bg">
      <div role="tablist" className="flex gap-2 px-4 pt-3">
        {[TAB.FORM, TAB.PASTE].map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-11 flex-1 rounded-xl text-[14px] font-extrabold ${
              tab === key ? 'bg-ec-blue text-white shadow-ec-blue' : 'border-[1.5px] border-ec-line bg-white text-ec-blueInk'
            }`}
          >
            {t(key === TAB.FORM ? 'tabs.form' : 'tabs.paste')}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 pt-3">
        {post.error && (
          <p className="mb-3 rounded-xl bg-ec-dangerBg px-3 py-2.5 text-center text-[13px] font-bold text-ec-danger">{t('error.generic')}</p>
        )}

        {tab === TAB.FORM ? (
          <PostForm
            form={form}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            onSubmit={() => post.submit(form)}
            submitting={post.submitting}
          />
        ) : (
          <PasteForm
            posting={post.submitting}
            onEdit={(draft) => { if (draft) setForm(draftToForm(draft)); setTab(TAB.FORM) }}
            onConfirm={(draft) => post.submit(draftToForm(draft))}
          />
        )}
      </div>

      {post.gated && (
        <VerifyGateSheet onClose={post.closeGate} onVerify={() => router.push('/profile')} />
      )}
    </div>
  )
}
