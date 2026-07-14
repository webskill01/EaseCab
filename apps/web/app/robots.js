/** Served at /robots.txt. Only the marketing + legal pages are crawlable — the app is behind auth. */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/feed', '/login', '/post', '/mine', '/profile',
          '/membership', '/verify', '/notifications', '/u/', '/offline',
        ],
      },
    ],
    sitemap: 'https://easecab.com/sitemap.xml',
  }
}
