/**
 * Legal entity + registered office. Shown on the landing page and legal pages so
 * banks, payment gateways and registrars can verify the business from the website.
 * Single source of truth — never retype the address inline.
 */
const ADDRESS = Object.freeze({
  street: 'Balbir Colony, Near Balson Palace',
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
  legalName: 'Easecab Mobility Solutions Pvt. Ltd.',
  email: 'support@easecab.com',
  address: ADDRESS,
  /** Two display lines, in postal order. */
  addressLines: Object.freeze([
    ADDRESS.street,
    `${ADDRESS.city}, ${ADDRESS.state} ${ADDRESS.postalCode}, ${ADDRESS.country}`,
  ]),
  // ponytail: owner's exact pin for the click-through; goo.gl short links are being
  // retired by Google — if it ever 404s, swap in a maps.app.goo.gl link.
  mapsUrl: 'https://goo.gl/maps/yEucRMGKHW5rNkt99',
  /** Keyless embed — no Maps API key needed for the ?output=embed form. */
  mapsEmbedUrl: `https://www.google.com/maps?q=${ADDRESS_QUERY}&output=embed`,
})
