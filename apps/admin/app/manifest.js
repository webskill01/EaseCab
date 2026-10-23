/** Web App Manifest (served at /manifest.webmanifest) so the panel installs like the driver app. */
export default function manifest() {
  return {
    name: 'EaseCab Admin',
    short_name: 'EC Admin',
    start_url: '/',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#2563EB',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
