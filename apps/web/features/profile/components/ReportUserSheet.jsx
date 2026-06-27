'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Flag, Check } from '@/components/ui/icons'
import { presignUpload, uploadToR2, dpPrecheck } from '@/features/profile/services/uploadsApi'
import { reportErrorKey } from '@/lib/api/reportErrorKey'
import { reportPoster } from '../services/posterApi'

// Mirrors @easecab/shared REPORT_REASON (reused for user reports).
const REASONS = ['fake', 'spam', 'wrong_info', 'inappropriate', 'other']

/**
 * Report-a-user bottom-sheet (P13-12 #5). Reason chip + optional remark → POST
 * /users/:id/report. The server dedups (one per reporter per user) and rate-limits;
 * ≥ threshold distinct reporters auto-hide the driver pending admin review. Shows a
 * confirmation (incl. the already-reported case), then the caller unmounts.
 *
 * @param {{ userId: string, onClose: () => void }} props
 */
export function ReportUserSheet({ userId, onClose }) {
  const t = useTranslations('profile')
  const inputRef = useRef(null)
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [screenshotKey, setScreenshotKey] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState(false)
  const submit = useMutation({
    mutationFn: () =>
      reportPoster(userId, {
        reason,
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
        ...(screenshotKey ? { screenshotKey } : {}),
      }),
  })

  // report_screenshot policy == dp (5MB, images) → reuse dpPrecheck. Private tier, so
  // there's no preview URL; we keep only the verified key to send with the report.
  async function onPickScreenshot(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setAttachError(false)
    if (dpPrecheck(file)) { setAttachError(true); return }
    setUploading(true)
    try {
      const { url, fields, key, stub } = await presignUpload({ purpose: 'report_screenshot', contentType: file.type })
      await uploadToR2({ url, fields, file, stub })
      setScreenshotKey(key)
    } catch {
      setAttachError(true)
    } finally {
      setUploading(false)
    }
  }

  if (submit.isSuccess) {
    const already = submit.data?.alreadyReported
    return (
      <BottomSheet onClose={onClose} label={t('poster.report.submitted')}>
        <SheetTitle
          icon={<Check size={22} />}
          tone="success"
          title={t('poster.report.submitted')}
          sub={already ? t('poster.report.already') : t('poster.report.submittedSub')}
        />
      </BottomSheet>
    )
  }

  return (
    <BottomSheet onClose={onClose} label={t('poster.report.title')}>
      <SheetTitle icon={<Flag size={20} />} tone="danger" title={t('poster.report.title')} sub={t('poster.report.reasonQ')} />
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => {
            const on = reason === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className={`h-9 rounded-ec-chip border px-3 text-[13px] font-bold ${
                  on ? 'border-ec-danger bg-ec-dangerBg text-ec-danger' : 'border-ec-line bg-white text-ec-ink60'
                }`}
              >
                {t(`poster.report.reasons.${r}`)}
              </button>
            )
          })}
        </div>

        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('poster.report.remarkPlaceholder')}
          aria-label={t('poster.report.remarkPlaceholder')}
          className="w-full resize-none rounded-xl border-[1.5px] border-ec-line p-3 text-[14px] font-medium text-ec-ink outline-none"
        />

        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickScreenshot} aria-label={t('poster.report.attach')} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-ec-line text-[13.5px] font-bold text-ec-ink60 disabled:text-ec-ink40"
        >
          {uploading
            ? t('poster.report.attaching')
            : screenshotKey
              ? <><Check size={16} /> {t('poster.report.attached')}</>
              : t('poster.report.attach')}
        </button>
        {attachError && <p className="text-center text-[12.5px] font-semibold text-ec-danger">{t('poster.report.attachError')}</p>}

        {submit.isError && <p className="text-center text-[12.5px] font-semibold text-ec-danger">{t(`poster.report.${reportErrorKey(submit.error)}`)}</p>}

        <Button type="button" variant="danger" size="lg" disabled={!reason || uploading || submit.isPending} onClick={() => submit.mutate()} className="w-full">
          {submit.isPending ? t('poster.report.submitting') : t('poster.report.submit')}
        </Button>
      </div>
    </BottomSheet>
  )
}
