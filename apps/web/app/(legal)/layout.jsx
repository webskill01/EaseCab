import Link from 'next/link'

export default function LegalLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900">
            EaseCab
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            &larr; Back
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      <footer className="border-t border-gray-200 bg-white mt-10">
        <div className="mx-auto max-w-3xl px-6 py-6 flex gap-6 text-sm text-gray-400">
          <Link href="/privacy-policy" className="hover:text-gray-600">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-600">
            Terms &amp; Conditions
          </Link>
          <span>support@easecab.com</span>
        </div>
      </footer>
    </div>
  )
}
