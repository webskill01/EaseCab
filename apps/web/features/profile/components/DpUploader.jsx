'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { User, Check } from '@/components/ui/icons'
import { useDpUpload } from '../hooks/useDpUpload'
import { CropModal } from './CropModal'

// E2E bypasses the crop step (react-easy-crop can't decode the fake test image, and
// the seam already stubs the upload) — mirrors the otpClient/fcmClient E2E seams.
const E2E = process.env.NEXT_PUBLIC_E2E === 'true'

/**
 * Profile-photo picker (SCREENS §6, DP mandatory for L1). Picks a file, uploads it
 * to R2 via useDpUpload, and reports {key, previewUrl} up. Shows the current/last
 * preview as a round avatar.
 * @param {{ preview: ?string, onUploaded: (r: {key: string, previewUrl: ?string}) => void }} props
 */
export function DpUploader({ preview, onUploaded }) {
  const t = useTranslations('profile')
  const inputRef = useRef(null)
  const [cropSrc, setCropSrc] = useState(null)
  const { upload, uploading, errorKey } = useDpUpload()

  async function runUpload(fileOrBlob) {
    const r = await upload(fileOrBlob)
    if (r) onUploaded(r)
  }

  function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (E2E) { runUpload(file); return } // skip crop in headless e2e
    setCropSrc(URL.createObjectURL(file))
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  async function onCropConfirm(blob) {
    closeCrop()
    await runUpload(blob)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* F6: the status badge sits OUTSIDE the overflow-hidden circle (its own sibling,
          on top via z-10) so the round mask can't clip it. pointer-events-none keeps
          the whole avatar tappable. */}
      <div className="relative h-24 w-24">
        <button type="button" onClick={() => inputRef.current?.click()} className={`h-24 w-24 overflow-hidden rounded-full bg-ec-sky text-ec-blue shadow-ec-card ${preview ? 'border-2 border-ec-sky' : 'border-2 border-dashed border-ec-warning'}`}>
          {preview
            ? <img src={preview} alt="" className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center"><User size={40} /></span>}
        </button>
        {preview
          ? <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-ec-success text-white ring-2 ring-white"><Check size={14} /></span>
          : <span aria-label={t('dp.requiredBadge')} className="pointer-events-none absolute -bottom-0.5 -right-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-ec-warning text-[14px] font-extrabold text-white ring-2 ring-white">!</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} aria-label={t('fields.photo')} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-[13px] font-bold text-ec-blue disabled:text-ec-ink40">
        {uploading ? t('dp.uploading') : preview ? t('dp.change') : t('dp.add')}
      </button>
      {errorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(errorKey)}</p>}
      {cropSrc && <CropModal src={cropSrc} onConfirm={onCropConfirm} onClose={closeCrop} />}
    </div>
  )
}
