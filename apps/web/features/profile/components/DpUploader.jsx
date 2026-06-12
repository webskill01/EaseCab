'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { User, Check } from '@/components/ui/icons'
import { useDpUpload } from '../hooks/useDpUpload'

/**
 * Profile-photo picker (SCREENS §6, DP mandatory for L1). Picks a file, uploads it
 * to R2 via useDpUpload, and reports {key, previewUrl} up. Shows the current/last
 * preview as a round avatar.
 * @param {{ preview: ?string, onUploaded: (r: {key: string, previewUrl: ?string}) => void }} props
 */
export function DpUploader({ preview, onUploaded }) {
  const t = useTranslations('profile')
  const inputRef = useRef(null)
  const { upload, uploading, errorKey } = useDpUpload()

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const r = await upload(file)
    if (r) onUploaded(r)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => inputRef.current?.click()} className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-ec-sky bg-ec-sky text-ec-blue shadow-ec-card">
        {preview
          ? <img src={preview} alt="" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center"><User size={40} /></span>}
        {preview && <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-ec-success text-white"><Check size={14} /></span>}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} aria-label={t('fields.photo')} className="hidden" />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-[13px] font-bold text-ec-blue disabled:text-ec-ink40">
        {uploading ? t('dp.uploading') : preview ? t('dp.change') : t('dp.add')}
      </button>
      {errorKey && <p className="text-[12.5px] font-semibold text-ec-danger">{t(errorKey)}</p>}
    </div>
  )
}
