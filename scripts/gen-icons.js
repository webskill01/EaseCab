/**
 * Regenerates the PWA / Play icon set from the finalized logo.
 *
 *   node scripts/gen-icons.js [sourceImage]
 *
 * The source logo is a full-bleed blue square whose mark sits in a lot of empty
 * space. Two framings come out of it:
 *   - "any" icons  → trim to the mark, re-pad to ~22% margin, so the mark reads
 *                    at 72px instead of floating in a blue field.
 *   - maskable 512 → the source untouched; its generous padding IS the safe zone.
 */
const sharp = require('sharp')
const path = require('path')

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const APPLE_TOUCH = 180
const MARGIN = 0.22 // share of the framed canvas left as background around the mark

const REPO = path.resolve(__dirname, '..')
const OUT = path.join(REPO, 'apps/web/public/icons')
const SRC = process.argv[2] || path.join(REPO, 'apps/web/public/Easecab Logo.jpeg')

async function main() {
  // Background = the source's own corner pixel, so the re-padding is invisible.
  const { data } = await sharp(SRC).extract({ left: 0, top: 0, width: 8, height: 8 }).raw().toBuffer({ resolveWithObject: true })
  const bg = { r: data[0], g: data[1], b: data[2], alpha: 1 }

  // Trim the uniform background away, then centre the mark on a fresh square.
  const mark = await sharp(SRC).trim({ threshold: 20 }).toBuffer({ resolveWithObject: true })
  const side = Math.round(Math.max(mark.info.width, mark.info.height) / (1 - MARGIN))
  const framed = await sharp({ create: { width: side, height: side, channels: 3, background: bg } })
    .composite([{ input: mark.data, gravity: 'centre' }])
    .png()
    .toBuffer()

  for (const size of ICON_SIZES) {
    await sharp(framed).resize(size, size).png().toFile(path.join(OUT, `icon-${size}.png`))
  }
  await sharp(framed).resize(APPLE_TOUCH, APPLE_TOUCH).png().toFile(path.join(OUT, 'apple-touch-icon.png'))

  // Maskable: source as-is — Android crops up to 20% off each edge.
  await sharp(SRC).resize(512, 512).png().toFile(path.join(OUT, 'icon-512-maskable.png'))

  console.log(`icons written to ${OUT} (mark ${mark.info.width}x${mark.info.height} → framed ${side}px)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
