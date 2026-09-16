import {
  IconSteeringWheel, IconChevronRight, IconChevronLeft, IconLogout, IconX, IconCheck, IconChecks,
  IconSend, IconTrash, IconRepeat, IconPencil, IconMapPin, IconBellRinging, IconUser, IconBattery2,
  IconLock, IconBan, IconShieldCheckFilled, IconArrowsLeftRight, IconBrandWhatsapp, IconPhone,
  IconFlag, IconMessage, IconWorld, IconHeadset, IconCrownFilled, IconBoltFilled, IconInfoCircle,
  IconSearch, IconPlus, IconDotsVertical, IconPhoto, IconListDetails, IconCar, IconCarSuv, IconBus,
  IconAlertTriangle,
} from '@tabler/icons-react'

/**
 * EaseCab icon set — Tabler Icons (MIT, tree-shaken per import), 24×24, currentColor.
 * Keeps the original export names + default sizes so call sites never change; only the
 * glyph source moved off the hand-drawn handoff set. Tint via the parent's text color.
 */
const STROKE = 1.75

function ic(Glyph, defaultSize) {
  function EcIcon({ size = defaultSize, className }) {
    return <Glyph size={size} stroke={STROKE} className={className} aria-hidden="true" />
  }
  EcIcon.displayName = Glyph.displayName
  return EcIcon
}

export const Steer = ic(IconSteeringWheel, 22)
export const ChevR = ic(IconChevronRight, 18)
export const ChevL = ic(IconChevronLeft, 22)
export const LogOut = ic(IconLogout, 18)
export const X = ic(IconX, 16)
export const Check = ic(IconCheck, 14)
export const CheckCheck = ic(IconChecks, 16)
export const ChevronLeft = ic(IconChevronLeft, 22)
export const Send = ic(IconSend, 18)
export const Trash = ic(IconTrash, 16)
export const Repeat = ic(IconRepeat, 16)
export const Pencil = ic(IconPencil, 16)
export const Pin = ic(IconMapPin, 18)
export const BellEdit = ic(IconBellRinging, 18)
export const User = ic(IconUser, 22)
export const Battery = ic(IconBattery2, 18)
export const Lock = ic(IconLock, 18)
export const Ban = ic(IconBan, 18)
export const Shield = ic(IconShieldCheckFilled, 14)
export const Swap = ic(IconArrowsLeftRight, 22)
export const Whatsapp = ic(IconBrandWhatsapp, 17)
export const Phone = ic(IconPhone, 16)
export const Flag = ic(IconFlag, 17)
export const Chat = ic(IconMessage, 21)
export const Globe = ic(IconWorld, 16)
export const Headset = ic(IconHeadset, 18)
export const Crown = ic(IconCrownFilled, 18)
export const Bolt = ic(IconBoltFilled, 16)
export const Info = ic(IconInfoCircle, 18)
export const Warning = ic(IconAlertTriangle, 18)
export const Search = ic(IconSearch, 18)
export const Plus = ic(IconPlus, 24)
export const Dots = ic(IconDotsVertical, 20)
export const Image = ic(IconPhoto, 22)
export const List = ic(IconListDetails, 22)
export const Car = ic(IconCar, 16)
export const Van = ic(IconBus, 16) // ponytail: Tabler has no minibus glyph; tempo traveller shares the bus
export const Bus = ic(IconBus, 16)
export const Suv = ic(IconCarSuv, 16)

/**
 * Vehicle glyph by icon key (the `rideView.vehIconKey` output). Falls back to a
 * generic car. Tint via the parent's text color.
 */
const VEHICLE_GLYPH = { tt: Van, sedan: Car, suv: Suv, bus: Bus, car: Car }
export function VehicleIcon({ vehicleKey, size = 16, className }) {
  const Glyph = VEHICLE_GLYPH[vehicleKey] || Car
  return <Glyph size={size} className={className} />
}
