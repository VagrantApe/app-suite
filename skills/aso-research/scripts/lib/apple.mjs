// App Store provider. Suggestions come from the App Store's own search hints
// (what the search box autocompletes, most popular first); results come from
// the public iTunes Search API, whose ranking is close to, but not the same
// as, the App Store app's search.

import { APPLE_STOREFRONTS } from './countries.mjs'
import { fetchText } from './http.mjs'

export const id = 'apple'

export async function suggest(term, country) {
  const url = `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=${encodeURIComponent(term)}`
  const xml = await fetchText(url, { headers: { 'X-Apple-Store-Front': `${APPLE_STOREFRONTS[country]}-1,29` } })
  return [...xml.matchAll(/<key>term<\/key>\s*<string>([^<]*)<\/string>/g)].map((m) => decodeXml(m[1]))
}

export async function search(term, country, limit) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=${limit}`
  const { results } = JSON.parse(await fetchText(url))
  return results.map((r) => ({
    store: 'apple',
    id: String(r.trackId),
    title: r.trackName,
    developer: r.sellerName ?? r.artistName,
    // Apple reports a 0 rating for apps nobody has rated yet.
    rating: r.userRatingCount ? round(r.averageUserRating) : null,
    ratings: r.userRatingCount ?? 0,
    installs: null,
    price: r.price ?? 0,
    genre: r.primaryGenreName,
    released: day(r.releaseDate),
    updated: day(r.currentVersionReleaseDate),
    url: r.trackViewUrl?.split('?')[0]
  }))
}

const round = (n) => (typeof n === 'number' ? Math.round(n * 100) / 100 : null)
const day = (iso) => (iso ? iso.slice(0, 10) : null)

function decodeXml(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
}
