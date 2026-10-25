import { MessageCircle } from 'lucide-react'

/** "+919876543210" → "+91 98765 43210"; anything else is shown as stored. */
export function formatPhone(phone) {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone ?? '')
  return m ? `+91 ${m[1]} ${m[2]}` : phone
}

/** Full number as tap-to-call, plus a WhatsApp chat link. Renders nothing without a number. */
export function PhoneLink({ phone, className = 'font-mono text-sm text-ec-ink60' }) {
  if (!phone) return null
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a href={`tel:${phone}`} className="hover:text-ec-blue hover:underline">{formatPhone(phone)}</a>
      <a
        href={`https://wa.me/${phone.replace(/\D/g, '')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`WhatsApp ${formatPhone(phone)}`}
        title="Open in WhatsApp"
        className="text-emerald-600 hover:text-emerald-700"
      >
        <MessageCircle size={14} />
      </a>
    </span>
  )
}
