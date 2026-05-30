export const metadata = {
  title: 'Privacy Policy — EaseCab',
}

export default function PrivacyPolicy() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500">
        Effective Date: May 30, 2026 &nbsp;·&nbsp; Last Updated: May 30, 2026
      </p>

      <h2>1. Introduction</h2>
      <p>
        EaseCab (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the EaseCab platform
        available at easecab.com — a taxi ride leads service for drivers and vendors in India. This
        Privacy Policy explains what information we collect, why we collect it, how we use it, and
        the choices you have.
      </p>
      <p>
        By using EaseCab, you agree to the collection and use of information as described in this
        policy. If you do not agree, please do not use the platform.
      </p>

      <h2>2. Information We Collect</h2>
      <h3>2.1 Account Information</h3>
      <p>
        We collect your Indian mobile phone number when you register. Your number is used solely for
        authentication via one-time password (OTP) through Firebase Authentication. We do not store
        OTPs.
      </p>

      <h3>2.2 Profile Information</h3>
      <p>
        You may optionally provide your name, preferred vehicle type, and service area (city). This
        information is used to personalise your experience.
      </p>

      <h3>2.3 Location Information</h3>
      <p>
        We request approximate city-level location permission only to suggest your city for
        targeted push notifications about new ride leads. We do not track precise GPS location or
        your movement. Location permission is optional — you may decline without losing access to
        the ride feed.
      </p>

      <h3>2.4 KYC Documents</h3>
      <p>
        To unlock contact features, we collect and verify your identity through our KYC partner
        Surepass:
      </p>
      <ul>
        <li>Aadhaar number and OTP (Aadhaar-linked mobile for verification)</li>
        <li>Driving Licence number</li>
        <li>Vehicle Registration Certificate (RC) number</li>
      </ul>
      <p>
        KYC documents are processed by Surepass and are not stored on EaseCab servers beyond what
        is required for verification status.
      </p>

      <h3>2.5 Payment Information</h3>
      <p>
        Subscription payments are processed by Razorpay. We do not receive, store, or have access
        to your card number, bank account details, or UPI credentials. We store only subscription
        status, plan period, and anonymised Razorpay transaction identifiers.
      </p>

      <h3>2.6 Chat Messages</h3>
      <p>
        In-app chat messages between verified users are stored in Firebase Firestore. Messages are
        associated with a specific ride contact and are automatically made read-only when the
        related ride expires.
      </p>

      <h3>2.7 Usage Data</h3>
      <p>
        We collect standard server logs including IP address, device type, operating system,
        browser/app version, pages visited, ride cards viewed, and actions taken. Logs are used
        for security, debugging, and aggregated analytics. Logs never contain phone numbers, OTPs,
        Aadhaar details, JWT tokens, or payment credentials.
      </p>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>Authenticate you via phone OTP and maintain your session</li>
        <li>Deliver and personalise the real-time ride leads feed</li>
        <li>Verify your identity through KYC to enable contact features</li>
        <li>Process your subscription payment and manage access</li>
        <li>Send city-targeted push notifications for new ride leads (with your permission)</li>
        <li>Enable in-app 1:1 chat with other verified users on a confirmed ride</li>
        <li>Detect and prevent fraud, abuse, spam, and duplicate ride leads</li>
        <li>Improve the platform through aggregated, anonymised analytics</li>
        <li>Respond to your support requests</li>
      </ul>

      <h2>4. Third-Party Services</h2>
      <p>
        We use the following third-party services, each governed by their own privacy policies:
      </p>
      <ul>
        <li>
          <strong>Firebase (Google)</strong> — Phone OTP authentication, in-app chat (Firestore),
          and push notifications (FCM). Google&apos;s Privacy Policy applies to data processed by
          Firebase.
        </li>
        <li>
          <strong>Razorpay</strong> — Subscription payment processing. Razorpay&apos;s Privacy
          Policy applies to all payment data.
        </li>
        <li>
          <strong>Surepass</strong> — KYC verification (Aadhaar, Driving Licence, RC). Surepass
          processes identity documents under its own data handling policy.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — Secure cloud storage for profile pictures, KYC-related
          uploads, and chat image attachments. Files are served via time-limited presigned URLs only
          — the storage bucket is never publicly accessible.
        </li>
        <li>
          <strong>PostHog</strong> — Aggregated, anonymised product analytics. No personally
          identifiable information is transmitted to PostHog.
        </li>
        <li>
          <strong>Sentry</strong> — Application error monitoring. Error reports do not contain PII.
        </li>
      </ul>

      <h2>5. Data Retention</h2>
      <ul>
        <li>
          <strong>Account data:</strong> retained while your account is active, and for 30 days
          following an account deletion request, after which it is permanently deleted.
        </li>
        <li>
          <strong>KYC document data:</strong> retained for 90 days after verification is confirmed,
          then permanently deleted.
        </li>
        <li>
          <strong>Chat messages:</strong> retained while the associated ride contact is active;
          automatically purged when the ride expires.
        </li>
        <li>
          <strong>Ride lead data:</strong> ride leads are automatically hard-deleted 12 hours after
          posting.
        </li>
        <li>
          <strong>Payment records:</strong> retained for 7 years as required under Indian financial
          regulations.
        </li>
        <li>
          <strong>Server logs:</strong> retained for 30 days, then automatically deleted.
        </li>
      </ul>

      <h2>6. Data Security</h2>
      <p>We implement the following security measures:</p>
      <ul>
        <li>Authentication tokens stored in httpOnly, Secure cookies — never in localStorage</li>
        <li>All data transmitted over HTTPS (TLS)</li>
        <li>Uploaded files accessible only via time-limited presigned URLs</li>
        <li>Role-based access control separating user and admin systems</li>
        <li>No PII (phone numbers, OTPs, Aadhaar, payment credentials) recorded in server logs</li>
        <li>Rate limiting on OTP requests to prevent abuse</li>
      </ul>
      <p>
        Despite these measures, no transmission over the internet is 100% secure. We encourage you
        to keep your account credentials confidential.
      </p>

      <h2>7. Your Rights</h2>
      <ul>
        <li>
          <strong>Access:</strong> You may request a summary of the personal data we hold about you
          by contacting support@easecab.com.
        </li>
        <li>
          <strong>Correction:</strong> You can update your profile name, vehicle type, and
          preferences directly in the app.
        </li>
        <li>
          <strong>Deletion:</strong> You can request account deletion from Profile → Settings →
          Delete Account, or by emailing support@easecab.com. Deletion takes effect within 30 days
          and is irreversible.
        </li>
        <li>
          <strong>Push notification opt-out:</strong> You can withdraw push notification consent at
          any time in your device settings or the app notification settings.
        </li>
      </ul>

      <h2>8. Cookies</h2>
      <p>
        We use a single httpOnly session cookie for authentication. We do not use tracking cookies,
        advertising cookies, or any third-party cookies. No cookie consent banner is required
        because we use only strictly necessary session cookies.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        EaseCab is intended for commercial vehicle operators aged 18 and above. We do not knowingly
        collect information from persons under 18. If we become aware that a minor has registered,
        we will delete the account promptly.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        via an in-app notification at least 7 days before the change takes effect. Continued use of
        EaseCab after the effective date constitutes your acceptance of the updated policy. The
        &quot;Last Updated&quot; date at the top of this page reflects the most recent revision.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        For any questions, concerns, or requests related to this Privacy Policy, please contact us
        at:
      </p>
      <p>
        <strong>Email:</strong> support@easecab.com
        <br />
        <strong>Platform:</strong> easecab.com
      </p>

      <h2>12. Governing Law</h2>
      <p>
        This Privacy Policy is governed by the Information Technology Act, 2000, the Information
        Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or
        Information) Rules, 2011, and other applicable laws of India. Any disputes arising out of
        this policy shall be subject to the jurisdiction of courts in Chandigarh, India.
      </p>
    </article>
  )
}
