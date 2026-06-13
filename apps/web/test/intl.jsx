import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import en from '../public/locales/en/common.json'
import authEn from '../public/locales/en/auth.json'
import ridesEn from '../public/locales/en/rides.json'
import mineEn from '../public/locales/en/mine.json'
import postEn from '../public/locales/en/post.json'
import profileEn from '../public/locales/en/profile.json'
import verificationEn from '../public/locales/en/verification.json'
import membershipEn from '../public/locales/en/membership.json'
import settingsEn from '../public/locales/en/settings.json'
import chatEn from '../public/locales/en/chat.json'
import notificationsEn from '../public/locales/en/notifications.json'

/** Render a component inside the next-intl + TanStack Query providers (English messages). */
export function renderWithIntl(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ common: en, auth: authEn, rides: ridesEn, mine: mineEn, post: postEn, profile: profileEn, verification: verificationEn, membership: membershipEn, settings: settingsEn, chat: chatEn, notifications: notificationsEn }}>
        {ui}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  )
}
