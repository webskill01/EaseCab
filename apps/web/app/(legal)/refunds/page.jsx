import { COMPANY } from '@/config/company'

export const metadata = {
  title: 'Refund & Cancellation Policy — EaseCab',
}

// Public refund/cancellation policy. Payment aggregators require this as a
// standalone, linkable page during merchant website review — a clause buried
// inside Terms does not satisfy the check. Must stay consistent with Terms 5.5.
export default function Refunds() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Refund &amp; Cancellation Policy</h1>
      <p className="text-sm text-gray-500">Last Updated: November 1, 2026</p>

      <p>
        EaseCab sells a single digital service: a prepaid subscription that unlocks contact
        details on ride leads, offered as 1 month (30 days) for <strong>&#8377;149</strong>, 3
        months (90 days) for <strong>&#8377;399</strong>, 6 months (180 days) for{' '}
        <strong>&#8377;749</strong>, or 12 months (365 days) for <strong>&#8377;1,199</strong>. Browsing the feed
        and posting rides are free and require no payment. This policy explains when that
        subscription fee is and is not refunded.
      </p>

      <h2>Cancellation</h2>
      <p>
        There is nothing to cancel. EaseCab does not set up any auto-debit, mandate, or standing
        instruction on your card, bank account, or UPI. Each payment is a one-time
        charge that adds the days of the plan you chose. When those days run out, access simply stops unless you
        choose to pay again.
      </p>
      <p>
        To stop using EaseCab, do nothing. To also remove your data, see our{' '}
        <a href="/delete-account">account deletion page</a>.
      </p>

      <h2>Refunds on the subscription fee</h2>
      <p>
        Subscription fees are <strong>non-refundable</strong>, except where a refund is required
        under applicable Indian law. Because access is granted in full the moment payment succeeds,
        we do not refund or pro-rate unused days if you stop using the service, delete your
        account, or are suspended for breaching our <a href="/terms">Terms &amp; Conditions</a>,
        part-way through a paid period.
      </p>
      <p>
        If you pay again before your current period ends, the new plan days are added to your
        remaining days. No time is lost and nothing is reset.
      </p>

      <h2>When we do refund</h2>
      <p>We refund in full, without requiring a reason, in these cases:</p>
      <ul>
        <li>
          <strong>Duplicate payment</strong> — you were charged more than once for the same plan
          period.
        </li>
        <li>
          <strong>Failed transaction</strong> — money left your account but the subscription was
          not activated.
        </li>
        <li>
          <strong>Incorrect amount</strong> — you were charged anything other than the price of
          the plan shown at checkout.
        </li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <strong>support@easecab.com</strong> with the subject{' '}
        <strong>&quot;Refund request&quot;</strong>, and include the mobile number your account is
        registered with, the date and amount of the payment, and the payment reference from your
        bank or UPI statement. We verify ownership of that number before processing anything.
      </p>

      <h2>Timelines</h2>
      <ul>
        <li>We acknowledge every refund request within <strong>2 working days</strong>.</li>
        <li>
          Approved refunds are initiated within <strong>5 working days</strong> of approval, to the
          original payment method only. We never refund to a different account.
        </li>
        <li>
          Once initiated, your bank or card issuer typically credits the amount within{' '}
          <strong>5&ndash;7 working days</strong>. That final leg is controlled by your bank, not
          by EaseCab.
        </li>
      </ul>
      <p>
        A failed or duplicate payment that was never captured is usually reversed automatically by
        your bank within 5&ndash;7 working days without any action from us.
      </p>

      <h2>Contact</h2>
      <p>
        {COMPANY.legalName}
        <br />
        Email: <strong>{COMPANY.email}</strong>
        <br />
        Phone: <strong>{COMPANY.phoneDisplay}</strong>
      </p>
    </article>
  )
}
