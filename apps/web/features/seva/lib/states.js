/**
 * Mirror of @easecab/shared BORDER_TAX_STATES (name, needsDistance, taxModes, checkposts) — the web
 * app mirrors shared constants; lib/__tests__/borderTax.test.js fails if they drift.
 */
export const BT_STATES = Object.freeze({
  HP: { name: 'Himachal Pradesh', needsDistance: false, taxModes: ['1'], checkposts: [
    'TIPRA', 'KANDWAL', 'TUNUHATTI', 'SWARGAHT', 'PARWANOO', 'BADDI', 'BAROTIWALA', 'KALAAMB',
    'PAONTA SAHIB', 'GAGRET', 'MEHATPUR', 'DAMTAL',
  ] },
  HR: { name: 'Haryana', needsDistance: true, taxModes: ['1', '4', '5', '6', '7'], checkposts: [
    'PANCHKULA', 'AMBALA', 'YAMUNA NAGAR', 'KURUKSHETRA', 'KAITHAL', 'KARNAL', 'PANIPAT',
    'SONIPAT', 'JIND', 'FATEHABAD', 'SIRSA', 'HISAR', 'BHIWANI', 'CHARKHI DADRI', 'ROHTAK',
    'JHAJJAR', 'GURUGRAM', 'FARIDABAD', 'PALWAL', 'NUH', 'REWARI', 'MAHENDRAGARH',
  ] },
  UP: { name: 'Uttar Pradesh', needsDistance: false, calendarDays: true, taxModes: ['1', '4', '5'], checkposts: [
    'SAHARANPUR', 'SHAMLI', 'MUZAFFARNAGAR', 'BAGHPAT', 'GHAZIABAD', 'GAUTAM BUDDHA NAGAR',
    'BIJNOR', 'MATHURA', 'AGRA', 'ALIGARH', 'ETAWAH', 'RAMPUR', 'BAREILLY', 'PILIBHIT',
    'LAKHIMPUR', 'BAHRAICH', 'SHRAVASTI', 'BALRAMPUR', 'SIDDHARTH NAGAR', 'MAHARAJGANJ',
    'KUSHINAGAR', 'DEORIA', 'BALLIA', 'GHAZIPUR', 'CHANDAULI', 'SONBHADRA', 'MIRZAPUR',
    'PRAYAGRAJ', 'CHITRAKOOT', 'BANDA', 'HAMIRPUR', 'MAHOBA', 'JHANSI', 'LALITPUR', 'ORAI',
  ] },
  RJ: { name: 'Rajasthan', needsDistance: false, calendarDays: true, taxModes: ['1'], checkposts: [
    'SAHAJAHAPUR', 'NAREDA KALAN', 'NOVGAON', 'PAKKA BAAG', 'AAKERA MOD', 'BHIWARI MOD',
    'DHARUDHA MOD', 'TAWADU MOD', 'DANPUR', 'MONA DUNGAR', 'BAHAJ', 'DHILAWATI', 'JURHARA',
    'RARAH', 'UNCHA NANGLA', 'NIMBAHERA', 'RAJGARH', 'BARETHA', 'CHAMBAL', 'SIMMALWADA',
    'RATANPUR', 'PATLI', 'SADHUWALI', 'GONERA', 'MAKHUPURA', 'MANDARADI', 'RAIPUR', 'TEENDHAR',
    'NAWATA KI DHANI', 'PILOD', 'PIPLI', 'MAWAL', 'MANDAR', 'KASBA THANA', 'SANGARIA', 'BHADARA',
    'GOMANA', 'PRATAPGARH',
  ] },
  UK: { name: 'Uttarakhand', needsDistance: false, calendarDays: true, taxModes: ['1'], checkposts: [
    'ASHARODI', 'KULHAL', 'TIMLI', 'TUNI', 'BHAGWANPUR', 'MANGLORE', 'CHIDYAPUR', 'KAUDIA',
    'KASHIPUR', 'BAJPUR', 'JASPUR', 'PULBHATTA', 'DAURAHA', 'MANJHOLA', 'NADEHI', 'SITARGANJ',
    'MELAGHAT', 'BANBASA', 'RUDRAPUR',
  ] },
})

/** Mirror of @easecab/shared BORDER_TAX_LIVE_STATES — only these show in the picker (states with UPI QR payment). */
export const BT_LIVE_STATES = Object.freeze(['HR', 'UP', 'HP'])
