export const metadata = {
  title: 'Delete Your Account — EaseCab',
}

// Public account-deletion page. Google Play requires a URL reachable without
// installing the app for any app that lets users create an account.
export default function DeleteAccount() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Delete Your EaseCab Account</h1>
      <p className="text-sm text-gray-500">Last Updated: September 23, 2026</p>

      <p>
        EaseCab accounts belong to taxi drivers and travel vendors. You can delete your account and
        the personal data attached to it at any time, in either of two ways.
      </p>

      <h2>Option 1 — In the app</h2>
      <ol>
        <li>Open EaseCab and go to the <strong>Profile</strong> tab.</li>
        <li>Tap <strong>Settings</strong>.</li>
        <li>Tap <strong>Delete Account</strong> and confirm.</li>
      </ol>

      <h2>Option 2 — By email</h2>
      <p>
        Send a deletion request from any address to <strong>support@easecab.com</strong> with the
        subject <strong>&quot;Delete my account&quot;</strong>, and include the mobile number your
        account is registered with. We verify ownership of that number before deleting.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your mobile number, name, profile picture, and bio</li>
        <li>Your vehicle details, base city, working city, and language preferences</li>
        <li>Your chat messages and any images you sent or uploaded</li>
        <li>Your posted ride leads and your contacted-rides history</li>
        <li>Your notification cities and all push-notification device tokens</li>
      </ul>

      <h2>What is retained, and for how long</h2>
      <ul>
        <li>
          <strong>Payment records</strong> — subscription and transaction records are retained for
          7 years as required under Indian financial and tax regulations. These contain only the
          amount, date, and payment-gateway reference — never your card, bank, or UPI details.
        </li>
        <li>
          <strong>Server logs</strong> — automatically deleted after 30 days. Logs never contain
          phone numbers, OTPs, or payment credentials.
        </li>
      </ul>

      <h2>How long deletion takes</h2>
      <p>
        Your account is deactivated immediately and you are signed out of every device. All data
        listed above is permanently erased within 30 days. Deletion is irreversible — a deleted
        account cannot be restored, and an active subscription is not refunded for the unused
        period.
      </p>

      <h2>Questions</h2>
      <p>
        Email <strong>support@easecab.com</strong>. See also our{' '}
        <a href="/privacy-policy">Privacy Policy</a>.
      </p>
    </article>
  )
}
