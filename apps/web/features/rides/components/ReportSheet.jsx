'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Flag, Check } from '@/components/ui/icons'
import { reportRide } from '../services/reportApi'

// Mirrors @easecab/shared REPORT_REASON + sheets.jsx ReportSheet reason chips.
const REASONS = ['fake', 'spam', 'wrong_info', 'inappropriate', 'other']

/**
 * Report bottom-sheet (SCREENS §11, sheets.jsx ReportSheet). Pick a reason chip +
 * optional remark → submit writes a `ride_reports` row that surfaces in the admin
 * moderation queue (24c). Shows a brief confirmation, then closes.
 *
 * @param {object} props
 * @param {{ id: string, kind: string }} props.ride
 * @param {() => void} props.onClose
 */
export function ReportSheet({ ride, onClose }) {
  const t = useTranslations('rides')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const submit = useMutation({
    mutationFn: () => reportRide(ride, { reason, ...(remarks.trim() ? { remarks: remarks.trim() } : {}) }),
  })

  if (submit.isSuccess) {
    return (
      <BottomSheet onClose={onClose} label={t('report.submitted')}>
        <SheetTitle icon={<Check size={22} />} tone="success" title={t('report.submitted')} />
      </BottomSheet>
    )
  }

  return (
    <BottomSheet onClose={onClose} label={t('report.title')}>
      <SheetTitle icon={<Flag size={20} />} tone="danger" title={t('report.title')} sub={t('report.reasonQ')} />
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
                {t(`report.reasons.${r}`)}
              </button>
            )
          })}
        </div>

        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('report.remarkPlaceholder')}
          aria-label={t('report.remarkPlaceholder')}
          className="w-full resize-none rounded-xl border-[1.5px] border-ec-line p-3 text-[14px] font-medium text-ec-ink outline-none"
        />

        {submit.isError && (
          <p className="text-center text-[13px] font-bold text-ec-danger">{t('report.error')}</p>
        )}

        <button
          type="button"
          disabled={!reason || submit.isPending}
          onClick={() => submit.mutate()}
          className="h-[52px] w-full rounded-xl bg-ec-danger text-[15.5px] font-extrabold text-white disabled:bg-ec-disabled disabled:shadow-none"
        >
          {submit.isPending ? '…' : t('report.submit')}
        </button>
      </div>
    </BottomSheet>
  )
}
