/**
 * SVG marker icons for the fuel map (classic google.maps.Marker, no Map ID).
 * Colours follow the tailwind ec-* tokens; shapes are drawn here so no image files ship.
 */
import { FUEL_TYPES } from '@easecab/shared'

export const MAP_COLORS = Object.freeze({
  [FUEL_TYPES.CNG]: '#16A34A', [FUEL_TYPES.PETROL]: '#F97316', [FUEL_TYPES.DIESEL]: '#0284C7', // green / orange / blue
  ME: '#2C5BD8', ROUTE: '#4D8DF6', CASING: '#FFFFFF', START: '#0F172A', END: '#E11D48',
})

const svgUrl = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`

// Teardrop pin, 40×52 view box, white disc centred at (20,19) for the glyph.
const PIN = 'M20 51C20 51 3 31.5 3 19a17 17 0 0 1 34 0c0 12.5-17 32-17 32z'
// Tabler "gas-station" glyph (24px grid), scaled into the white disc; the fuel is told apart by colour.
const PUMP_PATHS = ['M14 11h1a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0v-7l-3 -3', 'M4 20v-14a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v14', 'M3 20l12 0', 'M18 7v1a1 1 0 0 0 1 1h1', 'M4 11l10 0']
const glyph = (color) => `<g transform="translate(11 10) scale(0.75)" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">`
  + `${PUMP_PATHS.map((d) => `<path d="${d}"/>`).join('')}</g>`

function pin(fill, inner) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">'
    + `<path d="${PIN}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>`
    + `<circle cx="20" cy="19" r="11" fill="#fff"/>${inner}</svg>`
}

/** Pump pin coloured + drawn by the fuel being searched (CNG green, petrol orange, diesel blue); bigger when tapped. */
export function pumpIcon(g, { fuel, selected }) {
  const fill = MAP_COLORS[fuel]
  const w = selected ? 46 : 34
  const h = Math.round((w * 52) / 40)
  return { url: svgUrl(pin(fill, glyph(fill))), scaledSize: new g.Size(w, h), anchor: new g.Point(w / 2, h) }
}

/** Route end pin with a letter: A = pickup (dark), B = drop (red). */
export function endIcon(g, letter) {
  const fill = letter === 'A' ? MAP_COLORS.START : MAP_COLORS.END
  const text = `<text x="20" y="24.5" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="${fill}">${letter}</text>`
  return { url: svgUrl(pin(fill, text)), scaledSize: new g.Size(40, 52), anchor: new g.Point(20, 52) }
}

/** "You are here": blue dot, white ring, soft halo. */
export function meIcon(g) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">'
    + `<circle cx="22" cy="22" r="20" fill="${MAP_COLORS.ME}" fill-opacity="0.18"/>`
    + `<circle cx="22" cy="22" r="10" fill="#fff"/><circle cx="22" cy="22" r="7" fill="${MAP_COLORS.ME}"/></svg>`
  return { url: svgUrl(svg), scaledSize: new g.Size(44, 44), anchor: new g.Point(22, 22) }
}
