'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Check } from '@/components/ui/icons'
import { PostForm } from './PostForm'
import { PasteForm } from './PasteForm'
import { VerifyGateSheet } from './VerifyGateSheet'
import { usePostRide } from '../hooks/usePostRide'
import { useProfile } from '@/features/profile/hooks/useProfile'
import { emptyForm, draftToForm } from '../lib/postForm'
import { takeRepostDraft } from '../lib/repostDraft'
import { deleteMyPost } from '../services/myRidesApi'

const TAB = { FORM: 'form', PASTE: 'paste' }

/**
 * Post a Ride (SCREENS §5) — two input modes (structured form + WhatsApp paste).
 * Owns the shared form state so the paste tab's "Edit fields" can prefill the form;
 * the soft gate + success are driven by usePostRide.
 */
export function PostScreen() {
  const t = useTranslations('post')
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState(TAB.FORM)
  const [form, setForm] = useState(emptyForm())
  const [repostSourceId, setRepostSourceId] = useState(null)
  const post = usePostRide()
  const { data: profile } = useProfile()

  // Repost hand-off: a draft stashed by My Rides' Repost chip prefills from/to/
  // vehicle/fare once on mount (then it's consumed). Runs before the phone effect
  // fills phone, and only touches the fields the draft carries. The original post's
  // id is kept aside so it can be removed after the repost publishes (below).
  useEffect(() => {
    const draft = takeRepostDraft()
    if (!draft) return
    const { sourceId, ...patch } = draft
    setForm((f) => ({ ...f, ...patch }))
    if (sourceId) setRepostSourceId(sourceId)
  }, [])

  // Once the repost is published, soft-delete the stale original so the verified
  // feed shows one fresh listing, not a confusing duplicate. Best-effort cleanup
  // (matches useChatThread/LogoutButton): a failed delete just leaves the old post.
  useEffect(() => {
    if (!post.posted || !repostSourceId) return
    setRepostSourceId(null)
    deleteMyPost(repostSourceId)
      .catch(() => {})
      .finally(() => qc.invalidateQueries({ queryKey: ['myposts'] }))
  }, [post.posted, repostSourceId, qc])

  // F3: prefill the contact field from the signed-in user's phone, but only while
  // it's still untouched — never clobber a manual edit or a paste-prefilled value.
  useEffect(() => {
    if (!profile?.phone) return
    setForm((f) => (f.phone ? f : { ...f, phone: String(profile.phone).replace(/^\+91/, '') }))
  }, [profile?.phone])

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
      <div className="px-4 pb-0.5 pt-3.5">
        <h1 className="text-[19px] font-extrabold tracking-tight text-ec-ink">{t('heading')}</h1>
        <p className="mt-0.5 text-[12.5px] text-ec-ink60">{t('subheading')}</p>
      </div>
      {/* Segmented-pill mode switch (mockup post.jsx): one bordered white container
          with the active tab as an inset blue chip — not two free-standing buttons. */}
      <div className="px-4 pt-2.5">
        <div role="tablist" className="flex gap-1 rounded-xl border border-ec-line bg-white p-1">
          {[TAB.FORM, TAB.PASTE].map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-[38px] flex-1 rounded-[9px] text-[13.5px] font-bold ${
                tab === key ? 'bg-ec-blue text-white shadow-ec-blue' : 'bg-transparent text-ec-ink60'
              }`}
            >
              {t(key === TAB.FORM ? 'tabs.form' : 'tabs.paste')}
            </button>
          ))}
        </div>
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
            onEdit={(draft) => { if (draft) setForm(draftToForm(draft)); setTab(TAB.FORM) }}
          />
        )}
      </div>

      {post.gated && (
        <VerifyGateSheet onClose={post.closeGate} onVerify={() => router.push('/verify?intent=l1')} />
      )}
    </div>
  )
}
