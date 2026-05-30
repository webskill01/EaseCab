import './globals.css'

export const metadata = {
  title: 'EaseCab — Taxi Ride Leads',
  description:
    'Real-time taxi ride leads for drivers and vendors across Punjab, Haryana, and Delhi NCR.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}
