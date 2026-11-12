'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Repeat } from '@/components/ui/icons'

/** OCR missed: the driver reads the captcha (portal codes can include # and @). New code while refreshes are left. */
export function CaptchaStep({ image, onSubmit, pending, canRefresh, onRefresh }) {
  const t = useTranslations('seva')
  const [answer, setAnswer] = useState('')
  const ok = /^[!-~]{3,10}$/.test(answer)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-2 rounded-xl border border-ec-line bg-white p-3">
        <Image src={image} alt={t('bt.live.captchaAlt')} width={220} height={70} unoptimized className="h-auto w-[220px]" />
      </div>
      {canRefresh && (
        <button type="button" disabled={pending} onClick={onRefresh} className="flex items-center justify-center gap-1.5 self-center text-[13px] font-bold text-ec-blueInk disabled:opacity-50">
          <Repeat /> {t('bt.live.captchaRefresh')}
        </button>
      )}
      <input
        className="h-12 w-full rounded-xl border border-ec-line px-3 text-center text-[18px] font-extrabold tracking-[0.15em] text-ec-ink outline-none focus:border-ec-blue"
        value={answer} maxLength={10} autoFocus autoComplete="off" autoCapitalize="off" spellCheck={false}
        placeholder={t('bt.live.captchaPh')} onChange={(e) => setAnswer(e.target.value.replace(/\s/g, ''))}
      />
      <Button type="button" size="lg" className="w-full" disabled={!ok || pending} onClick={() => onSubmit(answer)}>
        {t('bt.live.captchaSubmit')}
      </Button>
    </div>
  )
}

