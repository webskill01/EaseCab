/** Served at /sitemap.xml — public pages only. */
export default function sitemap() {
  return [
    { url: 'https://easecab.com', changeFrequency: 'monthly', priority: 1 },
    { url: 'https://easecab.com/privacy-policy', changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://easecab.com/terms', changeFrequency: 'yearly', priority: 0.3 },
  ]
}
