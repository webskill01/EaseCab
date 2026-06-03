import { Inter, Noto_Sans_Gurmukhi, Noto_Sans_Devanagari } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const gurmukhi = Noto_Sans_Gurmukhi({
  subsets: ['gurmukhi'],
  variable: '--font-gurmukhi',
  display: 'swap',
})
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
})

/**
 * Font variable class names for <html>, loading only the script font the active
 * locale needs (Inter is always the Latin base). globals.css maps [lang] → font.
 * @param {string} locale
 * @returns {string}
 */
export function fontClassFor(locale) {
  if (locale === 'pa') return `${inter.variable} ${gurmukhi.variable}`
  if (locale === 'hi') return `${inter.variable} ${devanagari.variable}`
  return inter.variable
}
