import { useCallback, useState } from 'react'
import { presignUpload, uploadToR2, kycPrecheck } from '@/features/profile/services/uploadsApi'
import { attachImage } from '@/features/profile/services/profileApi'

/**
 * DL/RC document upload (#21): client precheck → presign → direct R2 POST → attach
 * the verified key to its User column (rcUrl / licenseUrl). PRIVATE tier, so there's
 * no public preview — success is a boolean `done`. Never throws; failures surface
 * via `errorKey` (a `verification` i18n sub-key).
 * @param {'rc_image'|'licence_image'} purpose
 */
export function useKycUpload(purpose) {
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  const upload = useCallback(async (file) => {
    setErrorKey(null)
    const bad = kycPrecheck(file)
    if (bad) { setErrorKey(bad); return false }
    setUploading(true)
    try {
      const { url, fields, key, stub } = await presignUpload({ purpose, contentType: file.type })
      await uploadToR2({ url, fields, file, stub })
      await attachImage({ purpose, key })
      setDone(true)
      return true
    } catch {
      setErrorKey('driver.docFailed')
      return false
    } finally {
      setUploading(false)
    }
  }, [purpose])

  return { upload, uploading, done, errorKey }
}
