'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { StatusSheet } from '@/components/ui/StatusSheet'
import { Plus, Trash, Bell, BellOff, PinOutline, PinFilled, Check } from '@/components/ui/icons'
import { CityPicker } from '@/features/rides/components/CityPicker'
import { NotificationsButton } from '@/features/rides/components/NotificationsButton'
import { useSyncPushToken } from '@/features/notifications/hooks/useSyncPushToken'
import { useSyncGeoCity } from '@/features/notifications/hooks/useSyncGeoCity'
import { pickCityName } from '@/features/rides/lib/rideView'
import { useLocalCityName } from '@/features/rides/hooks/useLocalNames'
import { Button } from '@/components/ui/button'
import { useGroupMode, useGroupSummary, useLiveSummary } from '../hooks/useGroupMode'
import { useGroupAlerts } from '../hooks/useGroupAlerts'
import { SevaStrip } from '@/features/seva/components/SevaStrip'
import { GroupModeToggle } from './GroupModeToggle'
import { GROUP_KEY, groupNumber } from '../lib/groupView'
import { groupNav } from '../lib/inChatSound'

const CHIPS = ['all', 'unread', 'duties']
const BADGE_MAX = 99
const AVATAR_TONES = ['bg-ec-sky text-ec-blueInk', 'bg-ec-successBg text-ec-successTx', 'bg-ec-warnBg text-ec-amberTx', 'bg-ec-bookedBg text-ec-bookedTx']

/** Chat-list time: h:mm today, else DD Mon (IST). */
function rowTime(at, locale) {
  if (!at) return ''
  const d = new Date(at)
  const today = new Date().toDateString() === d.toDateString()
  return new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata', ...(today ? { hour: 'numeric', minute: '2-digit', hour12: true } : { day: '2-digit', month: 'short' }),
  }).format(d)
}

/** Group DP: EaseCab logo for the app's own Driver Duties, else the group's number (groupNumber). */
export function GroupAvatar({ groupKey, num, size = 48 }) {
  const box = { width: size, height: size }
  if (groupKey === GROUP_KEY.DUTIES) return <Image src="/icons/icon-192.png" alt="" width={size} height={size} className="shrink-0 rounded-full border border-ec-line object-cover" style={box} />
  const tone = groupKey === GROUP_KEY.ALL ? 'bg-ec-successBg text-ec-successTx' : AVATAR_TONES[(num ?? 0) % AVATAR_TONES.length]
  return <span style={{ ...box, fontSize: size * 0.4 }} className={`flex shrink-0 items-center justify-center rounded-full font-extrabold tabular-nums ${tone}`}>{num}</span>
}

function GroupRow({ row, editing, onRemove, onPin, alerts }) {
  const t = useTranslations('rides.group')
  const locale = useLocale()
  const s = row.summary
  return (
    <li className="flex items-center border-b border-ec-line last:border-0">
      <Link href={`/feed/g/${row.key}`} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 active:bg-ec-bg">
        <GroupAvatar groupKey={row.key} num={row.num} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p className="min-w-0 flex-1 truncate text-[15.5px] font-bold text-ec-ink">{row.title}</p>
            {row.pinned && <span className="inline-flex shrink-0 self-center text-ec-ink40" aria-label={t('pinned')}><PinFilled size={13} /></span>}
            <span className={`shrink-0 text-[11.5px] font-semibold ${s?.unread ? 'text-ec-waDeep' : 'text-ec-ink40'}`}>{rowTime(s?.lastAt, locale)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[13px] text-ec-ink60">
              {s?.lastIsDuty && <span className="font-bold text-ec-successTx">{t('dutyTag')}: </span>}
              {s?.lastText || t('noMessages')}
            </p>
            {s?.unread > 0 && (
              <span className="min-w-[22px] shrink-0 rounded-full bg-ec-wa px-1.5 text-center text-[11px] font-extrabold leading-[22px] text-white">
                {s.unread > BADGE_MAX ? `${BADGE_MAX}+` : s.unread}
              </span>
            )}
          </div>
        </div>
      </Link>
      {!editing && alerts.ready && (
        <button type="button" onClick={() => alerts.toggle(row.key)} aria-pressed={alerts.isOn(row.key)}
          aria-label={alerts.isOn(row.key) ? t('alertsOff') : t('alertsOn')}
          className={`mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors active:scale-90 ${alerts.isOn(row.key) ? 'text-ec-waDeep' : 'text-ec-ink40'}`}>
          {alerts.isOn(row.key) ? <Bell size={19} /> : <BellOff size={19} />}
        </button>
      )}
      {editing && row.key !== GROUP_KEY.DUTIES && (
        <button type="button" onClick={() => onPin(row.key)} aria-pressed={row.pinned} aria-label={row.pinned ? t('unpin') : t('pin')}
          className={`mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-90 ${row.pinned ? 'bg-ec-sky text-ec-blue' : 'text-ec-ink40'}`}>
          {row.pinned ? <PinFilled size={18} /> : <PinOutline size={18} />}
        </button>
      )}
      {editing && row.cityId && (
        <button type="button" onClick={() => onRemove(row)} aria-label={t('remove')} className="mr-3 flex h-9 w-9 items-center justify-center rounded-full bg-ec-dangerBg text-ec-danger">
          <Trash size={17} />
        </button>
      )}
    </li>
  )
}

function AddGroupSheet({ onPick, onClose }) {
  const t = useTranslations('rides.group')
  const tc = useTranslations('common')
  return (
    <BottomSheet centered closeLabel={tc('actions.close')} onClose={onClose} label={t('addTitle')}>
      <h2 className="pr-9 text-[18px] font-extrabold text-ec-ink">{t('addTitle')}</h2>
      <p className="mt-1.5 whitespace-pre-line text-[13px] font-semibold leading-snug text-ec-ink60">{t('addHelp')}</p>
      <div className="mt-3 pb-2"><CityPicker inline label={t('addLabel')} value={null} onPick={onPick} /></div>
    </BottomSheet>
  )
}

/** Confirmation after adding a city: "<City> Only Duty added". */
function AddedSheet({ name, onClose }) {
  const t = useTranslations('rides.group')
  const show = useLocalCityName()
  return (
    <StatusSheet tone="success" icon={<Check size={26} />} title={t('addedTitle', { group: t('cityGroup', { city: show(name) }) })} body={t('addedBody')} onClose={onClose}>
      <Button type="button" size="lg" className="w-full" onClick={onClose}>{t('addedOk')}</Button>
    </StatusSheet>
  )
}

/** "Remove <group>?" confirmation before a city group is deleted. */
function RemoveSheet({ title, onConfirm, onClose }) {
  const t = useTranslations('rides.group')
  return (
    <StatusSheet tone="danger" icon={<Trash size={22} />} title={t('removeTitle', { group: title })} body={t('removeBody')} onClose={onClose}>
      <div className="flex gap-2.5">
        <Button type="button" size="lg" variant="outline" className="flex-1" onClick={onClose}>{t('removeCancel')}</Button>
        <Button type="button" size="lg" variant="danger" className="flex-1" onClick={onConfirm}>{t('removeOk')}</Button>
      </div>
    </StatusSheet>
  )
}

const byRecent = (a, b) => new Date(b.summary?.lastAt || 0) - new Date(a.summary?.lastAt || 0)

/**
 * Row order: Driver Duties always first, then pinned rows (in pin order), then the rest
 * (All Mix Duty too once unpinned) newest-message-first, like WhatsApp.
 */
function useRows(groups, pinned) {
  const t = useTranslations('rides.group')
  const locale = useLocale()
  const summary = useGroupSummary(groups)
  const by = new Map((summary.data ?? []).map((s) => [s.key, s]))
  const rest = [
    { key: GROUP_KEY.ALL, title: t('allGroup'), summary: by.get(GROUP_KEY.ALL), num: 1 },
    ...groups.map((g) => ({
      key: g.cityId, cityId: g.cityId, summary: by.get(g.cityId), num: groupNumber(g.cityId, groups), // by saved slot: numbers don't jump on re-sort
      title: t('cityGroup', { city: pickCityName(g.name, { pa: g.namePa, hi: g.nameHi }, locale) }),
    })),
  ].map((r) => ({ ...r, pinned: pinned.includes(r.key) }))
  const pins = pinned.map((k) => rest.find((r) => r.key === k)).filter(Boolean)
  return [
    { key: GROUP_KEY.DUTIES, title: t('dutiesGroup'), summary: by.get(GROUP_KEY.DUTIES), pinned: true },
    ...pins,
    ...rest.filter((r) => !r.pinned).sort(byRecent),
  ]
}

// Scroll offset kept across visits: Back from a chat lands where the user left the list.
let savedScroll = 0

/** Group Mode home: WhatsApp-style chat list of city groups (Phase 31). */
export function GroupListScreen() {
  const t = useTranslations('rides.group')
  const router = useRouter()
  const gm = useGroupMode()
  useLiveSummary()
  // Same push upkeep as the classic feed: ride alerts keep coming while Group Mode is on.
  useSyncPushToken()
  useSyncGeoCity()
  const [chip, setChip] = useState('all')
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(null) // city name just added → confirmation popup
  const [removing, setRemoving] = useState(null) // row awaiting delete confirmation
  const scrollRef = useRef(null)
  // Back from a chat: the list fades in (cached rows, no refetch flash) instead of snapping in.
  const [fadeIn] = useState(() => { const b = groupNav.back; groupNav.back = false; return b })
  useLayoutEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = savedScroll }, [])
  const rows = useRows(gm.groups, gm.pinned).filter((r) => {
    if (chip === 'unread') return r.summary?.unread > 0
    if (chip === 'duties') return r.key === GROUP_KEY.DUTIES || r.summary?.lastIsDuty
    return true
  })
  const ids = gm.groups.map((g) => g.cityId)
  const alerts = useGroupAlerts(ids)
  const add = (c) => {
    setAdding(false)
    if (!c?.id || ids.includes(c.id)) return
    gm.put({ cityIds: [...ids, c.id] })
    setAdded(c.name)
  }
  const remove = () => { gm.put({ cityIds: ids.filter((x) => x !== removing.cityId) }); setRemoving(null) }
  const pin = (key) => gm.put({ pinned: gm.pinned.includes(key) ? gm.pinned.filter((k) => k !== key) : [...gm.pinned, key] })

  return (
    // One scroll box for the whole screen: top row + Seva strip scroll away with the list, like the classic feed.
    <div ref={scrollRef} onScroll={(e) => { savedScroll = e.currentTarget.scrollTop }} className={`min-h-0 flex-1 overflow-y-auto bg-white ${fadeIn ? 'animate-ec-fade' : ''}`}>
      <div className="flex gap-2 px-4 pt-2">
        <NotificationsButton onClick={() => router.push('/notifications')} />
        <button type="button" onClick={() => setAdding(true)}
          className="flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-ec-line bg-white text-[14px] font-bold text-ec-blueInk shadow-ec-card">
          <span className="inline-flex text-ec-blue"><Plus size={18} /></span><span className="whitespace-nowrap">{t('addShort')}</span>
        </button>
        <GroupModeToggle />
      </div>
      <SevaStrip />
      <div className="flex items-center gap-2 px-4 pb-2 pt-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto" role="tablist">
          {CHIPS.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={chip === c} onClick={() => setChip(c)}
              className={`h-8 shrink-0 rounded-ec-chip px-3.5 text-[13px] font-bold ${chip === c ? 'bg-ec-successBg text-ec-successTx' : 'bg-ec-bg text-ec-ink60'}`}>
              {t(`chips.${c}`)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setEditing((e) => !e)} className="h-8 shrink-0 px-2 text-[13px] font-bold text-ec-blueInk">{editing ? t('done') : t('edit')}</button>
      </div>
      <ul className="pb-4">
        {rows.map((row) => <GroupRow key={row.key} row={row} editing={editing} onRemove={setRemoving} onPin={pin} alerts={alerts} />)}
      </ul>
      {adding && <AddGroupSheet onPick={add} onClose={() => setAdding(false)} />}
      {removing && <RemoveSheet title={removing.title} onConfirm={remove} onClose={() => setRemoving(null)} />}
      {added && <AddedSheet name={added} onClose={() => setAdded(null)} />}
    </div>
  )
}
