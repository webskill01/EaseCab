'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Image as ImageIcon, Check } from '@/components/ui/icons'
import { useKycUpload } from '../hooks/useKycUpload'

/**
 * DL/RC document-image upload (#21). PRIVATE tier — no preview; a large dashed drop-zone
 * (the bare "+" was easy to miss) that flips to an "attached" confirmation once the key is
 * stored. Calls `onUploaded` on success so the caller can gate (image is mandatory).
 * Accepts JPG/PNG/WebP/PDF ≤ 10 MB.
 * @param {{ purpose: 'rc_image'|'licence_image', label: string, onUploaded?: () => void }} props
 */
export function KycUploader({ purpose, label, onUploaded }) {
  const t = useTranslations('verification')
  const inputRef = useRef(null)
  const { upload, uploading, done, errorKey } = useKycUpload(purpose)

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && (await upload(file))) onUploaded?.()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex min-h-[116px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed px-4 text-center disabled:opacity-60 ${done ? 'border-ec-success bg-ec-successBg text-ec-successTx' : 'border-ec-blue/45 bg-ec-sky text-ec-blue'}`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-ec-card">
          {done ? <Check size={22} /> : <ImageIcon size={22} />}
        </span>
        <span className="text-[13.5px] font-bold">{uploading ? t('driver.docUploading') : done ? t('driver.docAttached') : label}</span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onPick} aria-label={label} className="hidden" />
      {errorKey && <p className="text-[12px] font-semibold text-ec-danger">{t(errorKey)}</p>}
    </div>
  )
}
