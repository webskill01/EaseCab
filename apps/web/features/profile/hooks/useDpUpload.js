import { useState, useCallback } from 'react'
import { presignUpload, uploadToR2, dpPrecheck } from '../services/uploadsApi'

/**
 * DP upload: client precheck → presign → direct R2 POST → return the verified key
 * + a preview URL. Never throws to the caller; failures surface via `errorKey`
 * (a `profile` i18n sub-key) and resolve to null.
 */
export function useDpUpload() {
  const [uploading, setUploading] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  const upload = useCallback(async (file) => {
    setErrorKey(null)
    const bad = dpPrecheck(file)
    if (bad) { setErrorKey(bad); return null }
    setUploading(true)
    try {
      const { url, fields, key, publicUrl } = await presignUpload({ purpose: 'dp', contentType: file.type })
      await uploadToR2({ url, fields, file })
      return { key, previewUrl: publicUrl }
    } catch {
      setErrorKey('dp.failed')
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, errorKey }
}
