'use client'

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/button'
import { cropToBlob } from '../lib/cropImage'

/**
 * Square-avatar crop step for the profile photo. Mount only when `src` is set; on
 * confirm it hands a cropped JPEG Blob to `onConfirm`. Cancel/backdrop → `onClose`.
 * @param {{ src: string, onConfirm: (b: Blob) => void, onClose: () => void }} props
 */
export function CropModal({ src, onConfirm, onClose }) {
  const t = useTranslations('profile')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_a, pixels) => setArea(pixels), [])

  async function confirm() {
    if (!area || busy) return
    setBusy(true)
    try {
      onConfirm(await cropToBlob(src, area))
    } catch {
      setBusy(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} label={t('dp.cropTitle')}>
      <h2 className="mb-3 text-center text-[15px] font-extrabold text-ec-ink">{t('dp.cropTitle')}</h2>
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-ec-ink">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <label className="mt-4 block">
        <span className="mb-1 block text-[12px] font-bold text-ec-ink60">{t('dp.zoom')}</span>
        <input
          type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label={t('dp.zoom')}
          className="w-full accent-ec-blue"
        />
      </label>
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onClose}>{t('dp.cropCancel')}</Button>
        <Button type="button" size="lg" className="flex-1" onClick={confirm} disabled={busy || !area}>{t('dp.cropConfirm')}</Button>
      </div>
    </BottomSheet>
  )
}
