import { useTranslations } from 'next-intl'

/** Feed landing placeholder — Step 18 replaces this with the live SSE feed. */
export default function FeedPage() {
  const t = useTranslations('common')
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-[21px] font-extrabold tracking-tight text-ec-ink">{t('feed.title')}</h1>
      <p className="text-[14px] font-medium text-ec-ink60">{t('feed.comingSoon')}</p>
    </section>
  )
}
