import { LandingHeader, LandingHero } from '@/features/landing/components/LandingHero'
import { FeatureGrid, LanguageStrip, IosInstall, LandingFooter } from '@/features/landing/components/LandingSections'

/** Public marketing landing (Step 27b). The app itself lives at /feed — PWA/TWA start_url stays /feed. */
export const metadata = {
  title: 'EaseCab — Live Taxi Ride Leads for Drivers | Punjab, Haryana, Delhi NCR',
  description:
    'Fresh taxi duty leads from hundreds of WhatsApp groups in one real-time feed. Filter by city, call the poster directly — no middleman, no commission. 7-day free trial, then ₹149/month.',
  keywords: [
    'taxi duty', 'taxi ride leads', 'cab duty app', 'taxi driver app India',
    'Punjab taxi', 'Haryana taxi', 'Delhi NCR taxi', 'one way duty', 'return duty',
  ],
  alternates: { canonical: 'https://easecab.com' },
  openGraph: {
    title: 'EaseCab — Live Taxi Ride Leads for Drivers',
    description:
      'Fresh taxi duty leads from hundreds of WhatsApp groups in one real-time feed. Punjab · Haryana · Delhi NCR.',
    url: 'https://easecab.com',
    siteName: 'EaseCab',
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'EaseCab' }],
  },
  twitter: { card: 'summary', title: 'EaseCab — Live Taxi Ride Leads for Drivers' },
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'EaseCab',
  url: 'https://easecab.com',
  operatingSystem: 'Android, Web',
  applicationCategory: 'BusinessApplication',
  description:
    'Real-time taxi ride leads for drivers and vendors across Punjab, Haryana, and Delhi NCR.',
  offers: { '@type': 'Offer', price: '149', priceCurrency: 'INR' },
  inLanguage: ['en', 'pa', 'hi'],
}

export default function Home() {
  return (
    <div className="min-h-screen bg-ec-bg">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <LandingHeader />
      <main>
        <LandingHero />
        <FeatureGrid />
        <LanguageStrip />
        <IosInstall />
      </main>
      <LandingFooter />
    </div>
  )
}
