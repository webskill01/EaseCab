import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import en from '../public/locales/en/common.json'
import authEn from '../public/locales/en/auth.json'

/** Render a component inside the next-intl provider with the English messages. */
export function renderWithIntl(ui) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: en, auth: authEn }}>
      {ui}
    </NextIntlClientProvider>,
  )
}
