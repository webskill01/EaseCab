/**
 * Legal entity + registered office. Shown on the landing page and legal pages so
 * banks, payment gateways and registrars can verify the business from the website.
 * Single source of truth — never retype the address inline.
 */
const ADDRESS = Object.freeze({
  street: 'Unit-39, Ekta Nagar, DMW Road',
  city: 'Patiala',
  state: 'Punjab',
  postalCode: '147001',
  country: 'India',
})

const ADDRESS_QUERY = encodeURIComponent(
  `${ADDRESS.street}, ${ADDRESS.city}, ${ADDRESS.state} ${ADDRESS.postalCode}, ${ADDRESS.country}`,
)

export const COMPANY = Object.freeze({
  brand: 'EaseCab',
  legalName: 'Easecab Mobility Solutions Private Limited',
  email: 'support@easecab.com',
  /** E.164 for tel: links. */
  phone: '+919914623976',
  /** Grouped for display. */
  phoneDisplay: '+91 99146 23976',
  address: ADDRESS,
  /** Two display lines, in postal order. */
  addressLines: Object.freeze([
    ADDRESS.street,
    `${ADDRESS.city}, ${ADDRESS.state} ${ADDRESS.postalCode}, ${ADDRESS.country}`,
  ]),
  // ponytail: address search, not a pin; swap in a maps.app.goo.gl pin if the
  // geocode lands on the wrong spot.
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${ADDRESS_QUERY}`,
  /** Keyless embed — no Maps API key needed for the ?output=embed form. */
  mapsEmbedUrl: `https://www.google.com/maps?q=${ADDRESS_QUERY}&output=embed`,
})
