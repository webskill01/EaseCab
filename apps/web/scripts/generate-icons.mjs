// One-off PWA icon generator (Step 25). Reads the brand master and writes the
// full PNG icon set to public/icons/. Run: npm run icons
// Master: apps/web/brand/logo-master.svg (or .png — update MASTER below).
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MASTER = path.join(ROOT, 'brand', 'logo-master.svg')
const OUT = path.join(ROOT, 'public', 'icons')
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const THEME_BLUE = { r: 0x4d, g: 0x8d, b: 0xf6, alpha: 1 } // #4D8DF6

await mkdir(OUT, { recursive: true })

// "any" icons — transparent background, contained.
for (const size of SIZES) {
  await sharp(MASTER)
    .resize(size, size, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toFile(path.join(OUT, `icon-${size}.png`))
}

// apple-touch 180 — iOS ignores transparency, so flatten on white with padding.
await sharp(MASTER)
  .resize(160, 160, { fit: 'contain', background: TRANSPARENT })
  .extend({ top: 10, bottom: 10, left: 10, right: 10, background: WHITE })
  .png()
  .toFile(path.join(OUT, 'apple-touch-icon.png'))

// maskable 512 — brand-blue background + ~15% safe-zone padding (360 + 76*2 = 512).
await sharp(MASTER)
  .resize(360, 360, { fit: 'contain', background: TRANSPARENT })
  .extend({ top: 76, bottom: 76, left: 76, right: 76, background: THEME_BLUE })
  .png()
  .toFile(path.join(OUT, 'icon-512-maskable.png'))

console.log(`Wrote ${SIZES.length + 2} icons to ${OUT}`)
