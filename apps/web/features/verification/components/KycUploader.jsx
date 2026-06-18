'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Check } from '@/components/ui/icons'
import { useKycUpload } from '../hooks/useKycUpload'

/**
 * Optional DL/RC document-image upload (#21). PRIVATE tier — no preview; shows an
 * "attached" confirmation once the key is stored. Accepts JPG/PNG/WebP/PDF ≤ 10 MB.
 * @param {{ purpose: 'rc_image'|'licence_image', label: string }} props
 */
export function KycUploader({ purpose, label }) {
  const t = useTranslations('verification')
  const inputRef = useRef(null)
  const { upload, uploading, done, errorKey } = useKycUpload(purpose)

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await upload(file)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex h-11 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-[13.5px] font-bold disabled:opacity-60 ${done ? 'border-ec-success bg-ec-successBg text-ec-successTx' : 'border-ec-line bg-ec-bg text-ec-ink60'}`}
      >
        {done ? <Check size={16} /> : <Plus size={16} />}
        {uploading ? t('driver.docUploading') : done ? t('driver.docAttached') : label}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onPick} aria-label={label} className="hidden" />
      {errorKey && <p className="text-[12px] font-semibold text-ec-danger">{t(errorKey)}</p>}
    </div>
  )
}
