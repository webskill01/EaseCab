import { manifestIcons, THEME_COLOR, BACKGROUND_COLOR } from '@/lib/pwaMeta'

/** Next App Router manifest route → served at /manifest.webmanifest. */
export default function manifest() {
  return {
    name: 'EaseCab — Taxi Ride Leads',
    short_name: 'EaseCab',
    description:
      'Real-time taxi ride leads for drivers and vendors across Punjab, Haryana, and Delhi NCR.',
    start_url: '/feed',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    lang: 'en',
    dir: 'ltr',
    icons: manifestIcons(),
  }
}
