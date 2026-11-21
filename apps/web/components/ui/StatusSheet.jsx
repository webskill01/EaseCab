'use client'

import { useTranslations } from 'next-intl'
import { BottomSheet } from './BottomSheet'

const TONES = {
  success: 'bg-ec-successBg text-ec-waDeep',
  warning: 'bg-ec-warnBg text-ec-amberTx',
  danger: 'bg-ec-dangerBg text-ec-danger',
  info: 'bg-ec-sky text-ec-blue',
  brand: 'bg-ec-blue text-white',
}

/**
 * The app's one popup for results, warnings, errors and confirms: a centered card with a
 * round icon, a title, one short line, then the buttons (children). Success icons pop in.
 *
 * @param {object} props
 * @param {'success'|'warning'|'danger'|'info'|'brand'} [props.tone]
 * @param {React.ReactNode} props.icon
 * @param {string} props.title
 * @param {React.ReactNode} [props.body]
 * @param {() => void} props.onClose
 * @param {React.ReactNode} [props.children] - buttons / extra content under the text
 */
export function StatusSheet({ tone = 'info', icon, title, body, onClose, children }) {
  const tc = useTranslations('common')
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={title}>
      <div className="flex flex-col items-center pt-1 text-center">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${TONES[tone]} ${tone === 'success' ? 'animate-ec-pop' : ''}`}>{icon}</span>
        <h2 className="mt-2.5 px-6 text-[18px] font-extrabold leading-tight tracking-tight text-ec-ink">{title}</h2>
        {body ? <div className="mt-1.5 text-[13.5px] font-semibold leading-snug text-ec-ink60">{body}</div> : null}
        {children ? <div className="mt-4 w-full">{children}</div> : null}
      </div>
    </BottomSheet>
  )
}

