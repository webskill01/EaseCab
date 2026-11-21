'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { FUEL_TYPES, FUEL_BRANDS, FUEL } from '@easecab/shared'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SheetTitle } from '@/components/ui/SheetTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GasStation } from '@/components/ui/icons'

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Add a missing station at the driver's current spot; admin reviews before it shows. */
export function AddFuelStationSheet({ pos, defaultFuel, pending, error, onSubmit, onClose }) {
  const t = useTranslations('seva.fuel')
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState(FUEL_BRANDS.OTHER)
  const [fuels, setFuels] = useState([defaultFuel])
  const valid = name.trim().length >= 2 && fuels.length > 0
  const submit = (e) => { e.preventDefault(); if (valid) onSubmit({ name: name.trim(), brand, fuels, lat: pos.lat, lng: pos.lng }) }
  return (
    <BottomSheet closeLabel={tc('actions.close')} onClose={onClose} label={t('add.title')}>
      <SheetTitle icon={<GasStation size={22} />} tone="blue" title={t('add.title')} sub={t('add.sub')} />
      <form onSubmit={submit} className="flex flex-col gap-3 pb-2">
        <label className="text-[13px] font-bold text-ec-ink">
          {t('add.name')}
          <Input className="mt-1" value={name} maxLength={FUEL.NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder={t('add.namePh')} />
        </label>
        <label className="text-[13px] font-bold text-ec-ink">
          {t('add.brand')}
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-ec-line bg-white px-3 text-[14px] font-medium">
            {Object.values(FUEL_BRANDS).map((b) => <option key={b} value={b}>{t(`brands.${b}`)}</option>)}
          </select>
        </label>
        <fieldset className="text-[13px] font-bold text-ec-ink">
          <legend>{t('add.fuels')}</legend>
          <div className="mt-1 flex gap-2">
            {Object.values(FUEL_TYPES).map((f) => (
              <button key={f} type="button" aria-pressed={fuels.includes(f)} onClick={() => setFuels((l) => toggle(l, f))}
                className={`h-10 flex-1 rounded-xl border text-[13.5px] font-bold ${fuels.includes(f) ? 'border-ec-blue bg-ec-sky text-ec-blue' : 'border-ec-line bg-white text-ec-ink60'}`}>
                {t(`types.${f}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="text-[12px] font-medium text-ec-ink60">{t('add.here')}</p>
        {error && <p role="alert" className="text-[12.5px] font-bold text-ec-danger">{t(error)}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={!valid || pending}>{t('add.submit')}</Button>
      </form>
    </BottomSheet>
  )
}
