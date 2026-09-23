import { COMPANY } from '@/config/company'

export const metadata = {
  title: 'Contact Us — EaseCab',
}

// Public Contact Us page. Payment aggregators require this as a standalone,
// linkable page during merchant website review, alongside Terms and Refunds.
export default function Contact() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Contact Us</h1>
      <p className="text-sm text-gray-500">Last Updated: September 14, 2026</p>

      <p>
        EaseCab is operated by {COMPANY.legalName}. Reach us through any of the channels below &mdash;
        we answer in English, Hindi and Punjabi.
      </p>

      <h2>Registered office</h2>
      <p>
        <strong>{COMPANY.legalName}</strong>
        {COMPANY.addressLines.map((line) => (
          <span key={line}>
            <br />
            {line}
          </span>
        ))}
      </p>
      <p>
        <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer">
          View on Google Maps
        </a>
      </p>

      <h2>Email</h2>
      <p>
        <strong>{COMPANY.email}</strong> &mdash; for account, payment, verification and general
        support. We reply within 2 working days.
      </p>

      <h2>Phone</h2>
      <p>
        <strong>{COMPANY.phoneDisplay}</strong> &mdash; Monday to Saturday, 10:00 AM to 7:00 PM IST.
        Closed on Sundays and public holidays.
      </p>

      <h2>What to contact us about</h2>
      <ul>
        <li>
          <strong>Payments and refunds</strong> &mdash; see our{' '}
          <a href="/refunds">Refund &amp; Cancellation Policy</a> first; it covers the common cases.
        </li>
        <li>
          <strong>Account deletion</strong> &mdash; you can do this yourself from the app; see the{' '}
          <a href="/delete-account">account deletion page</a>.
        </li>
        <li>
          <strong>Login or account problems</strong> &mdash; include the mobile number your account
          is registered with. We never ask for your Aadhaar, bank or card details &mdash; never send
          them to us or to anyone claiming to be from EaseCab.
        </li>
        <li>
          <strong>Reporting a user or a fraudulent ride</strong> &mdash; include the ride details and
          the number involved.
        </li>
        <li>
          <strong>Privacy and data requests</strong> &mdash; see our{' '}
          <a href="/privacy-policy">Privacy Policy</a>.
        </li>
      </ul>

      <h2>Grievance officer</h2>
      <p>
        For complaints that email support has not resolved, write to {COMPANY.email} with{' '}
        <strong>&quot;Grievance&quot;</strong> in the subject line. We acknowledge grievances within
        48 hours and aim to resolve them within 30 days.
      </p>
    </article>
  )
}
