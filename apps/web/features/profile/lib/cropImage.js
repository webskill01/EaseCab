/**
 * Crop helpers for the profile photo. The cropper (react-easy-crop) reports the
 * selected region in source-image pixels; we draw that region onto a fixed square
 * canvas and re-encode to a small JPEG. The result is a Blob the existing presign +
 * PUT upload path takes as-is (Blob carries `.type`/`.size`, so dpPrecheck + presign
 * + uploadToR2 all work unchanged). Re-encoding also normalizes png/webp/large inputs
 * down to one small avatar.
 */

/** @param {string} src @returns {Promise<HTMLImageElement>} */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

/**
 * Draw the cropped region onto a square canvas and return a JPEG Blob.
 * @param {string} src - object URL of the chosen image
 * @param {{x:number,y:number,width:number,height:number}} area - croppedAreaPixels from react-easy-crop
 * @param {number} [size=512] - output square edge in px
 * @returns {Promise<Blob>}
 */
export async function cropToBlob(src, area, size = 512) {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('crop failed'))), 'image/jpeg', 0.9)
  })
}
