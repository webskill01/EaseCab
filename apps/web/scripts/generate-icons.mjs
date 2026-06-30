// One-off PWA icon generator (Step 25). Reads the brand master, CROPS the white
// border so the mark fills the tile (was: tiny logo lost in whitespace), and writes
// the full PNG icon set to public/icons/. Run: npm run icons
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MASTER = path.join(ROOT, 'public', 'logo.jpeg')
const OUT = path.join(ROOT, 'public', 'icons')
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

await mkdir(OUT, { recursive: true })

// Crop the surrounding white once so every downstream tile shows the actual mark,
// not a postage-stamp logo. threshold absorbs JPEG edge noise around pure white.
const cropped = await sharp(MASTER).trim({ background: '#ffffff', threshold: 12 }).toBuffer()

// "any" icons — flatten the cropped mark on white, contained, near edge-to-edge.
for (const size of SIZES) {
  await sharp(cropped)
    .resize(size, size, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(path.join(OUT, `icon-${size}.png`))
}

// apple-touch 180 — iOS rounds the corners itself; white bg, small breathing room.
await sharp(cropped)
  .resize(164, 164, { fit: 'contain', background: WHITE })
  .extend({ top: 8, bottom: 8, left: 8, right: 8, background: WHITE })
  .flatten({ background: WHITE })
  .png()
  .toFile(path.join(OUT, 'apple-touch-icon.png'))

// maskable 512 — Android crops to a circle/squircle, so keep the mark inside the
// ~80% safe zone (410 + 51*2 = 512) on a seamless white field.
await sharp(cropped)
  .resize(410, 410, { fit: 'contain', background: WHITE })
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: WHITE })
  .flatten({ background: WHITE })
  .png()
  .toFile(path.join(OUT, 'icon-512-maskable.png'))

console.log(`Wrote ${SIZES.length + 2} icons (cropped) to ${OUT}`)
