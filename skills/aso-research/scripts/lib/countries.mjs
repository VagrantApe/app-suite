// Storefronts the research knows. Apple's suggestion endpoint picks a country
// by storefront ID rather than country code; Google Play takes the code.

export const APPLE_STOREFRONTS = {
  us: 143441,
  gb: 143444,
  ca: 143455,
  au: 143460,
  nz: 143461,
  ie: 143449,
  de: 143443,
  fr: 143442,
  es: 143454,
  it: 143450,
  nl: 143452,
  se: 143456,
  in: 143467,
  jp: 143462,
  kr: 143466,
  br: 143503,
  mx: 143468
}

export function checkCountry(country) {
  const c = String(country).toLowerCase()
  if (!(c in APPLE_STOREFRONTS)) {
    throw new Error(`Unknown country "${country}". Known: ${Object.keys(APPLE_STOREFRONTS).join(', ')}`)
  }
  return c
}
