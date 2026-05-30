export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold text-gray-900">EaseCab</h1>
      <p className="mt-3 text-gray-500">Taxi ride leads for drivers and vendors — coming soon.</p>
      <div className="mt-8 flex gap-4 text-sm text-gray-400">
        <a href="/privacy-policy" className="underline hover:text-gray-600">
          Privacy Policy
        </a>
        <a href="/terms" className="underline hover:text-gray-600">
          Terms &amp; Conditions
        </a>
      </div>
    </main>
  )
}
