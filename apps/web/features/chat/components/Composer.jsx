'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Send, Image as ImageIcon } from '@/components/ui/icons'
// Generic R2 upload client (shared infra, lives under the profile feature).
import { presignUpload, uploadToR2 } from '@/features/profile/services/uploadsApi'

// chat_image policy mirror: PUBLIC, 10MB, images-only (UPLOAD_PURPOSE.chat_image).
const IMAGE_MAX_BYTES = 10 * 1024 * 1024
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Thread composer. Disabled (read-only) once the ride expires — the placeholder then
 * explains why. Submits text on Enter/send; the image button uploads to R2 then sends
 * an image message via onSendImage({ key, previewUrl }).
 */
export function Composer({ disabled, onSend, onSendImage }) {
  const t = useTranslations('chat')
  const fileRef = useRef(null)
  const [text, setText] = useState('')
  const [uploading, setUploading] = useState(false)
  const [attachError, setAttachError] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    const v = text.trim()
    if (!v || disabled) return
    onSend(v)
    setText('')
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || disabled) return
    setAttachError(false)
    if (file.size > IMAGE_MAX_BYTES || !IMAGE_MIMES.includes(file.type)) { setAttachError(true); return }
    setUploading(true)
    try {
      const { url, key, publicUrl, stub } = await presignUpload({ purpose: 'chat_image', contentType: file.type })
      await uploadToR2({ url, file, stub })
      await onSendImage({ key, previewUrl: publicUrl })
    } catch {
      setAttachError(true)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 border-t border-ec-line bg-white px-3 py-2.5">
      {attachError && <p className="px-1 text-[12px] font-semibold text-ec-danger">{t('thread.attachError')}</p>}
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPickImage} aria-label={t('thread.attachImage')} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          aria-label={t('thread.attachImage')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ec-ink60 disabled:opacity-40"
        >
          <ImageIcon size={20} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? t('thread.readOnly') : uploading ? t('thread.attaching') : t('thread.composerPlaceholder')}
          className="h-11 flex-1 rounded-full border border-ec-line bg-ec-bg px-4 text-[14px] font-medium text-ec-ink placeholder:text-ec-ink40 disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label={t('thread.send')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ec-blue text-white disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  )
}
