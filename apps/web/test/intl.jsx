import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import en from '../public/locales/en/common.json'
import authEn from '../public/locales/en/auth.json'
import ridesEn from '../public/locales/en/rides.json'
import mineEn from '../public/locales/en/mine.json'
import postEn from '../public/locales/en/post.json'
import profileEn from '../public/locales/en/profile.json'
import verificationEn from '../public/locales/en/verification.json'

/** Render a component inside the next-intl provider with the English messages. */
export function renderWithIntl(ui) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: en, auth: authEn, rides: ridesEn, mine: mineEn, post: postEn, profile: profileEn, verification: verificationEn }}>
      {ui}
    </NextIntlClientProvider>,
  )
}
