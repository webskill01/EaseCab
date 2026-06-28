import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cropToBlob } from '../cropImage'

// cropToBlob is a thin DOM wrapper (Image + canvas). Stub both so we can assert the
// money path: the cropped region is drawn at the right coords and a JPEG Blob comes back.
describe('cropToBlob', () => {
  let drawImage, createElement

  beforeEach(() => {
    global.Image = class {
      set src(_v) { Promise.resolve().then(() => this.onload?.()) }
    }
    drawImage = vi.fn()
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (cb) => cb(blob) }
    createElement = vi.spyOn(document, 'createElement').mockReturnValue(canvas)
  })

  afterEach(() => { createElement.mockRestore() })

  it('draws the cropped region onto a square canvas and returns a JPEG blob', async () => {
    const area = { x: 10, y: 20, width: 100, height: 100 }
    const blob = await cropToBlob('blob:fake', area, 512)
    expect(blob.type).toBe('image/jpeg')
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 10, 20, 100, 100, 0, 0, 512, 512)
  })

  it('rejects when the canvas yields no blob', async () => {
    document.createElement.mockReturnValue({ width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (cb) => cb(null) })
    await expect(cropToBlob('blob:fake', { x: 0, y: 0, width: 1, height: 1 })).rejects.toThrow()
  })
})
