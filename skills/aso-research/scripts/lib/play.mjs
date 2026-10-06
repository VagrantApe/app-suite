// Google Play provider. Suggestions come from the call Play's own website
// makes for its search box; results come from the Play search page (app IDs
// in the order shown) and each app's listing page, which embeds its rating,
// ratings count, installs bucket and last-update date.

import { fetchText, mapLimit } from './http.mjs'

export const id = 'play'

export async function suggest(term, country) {
  const url = `https://play.google.com/_/PlayStoreUi/data/batchexecute?rpcids=IJ4APc&hl=en&gl=${country}&rt=c`
  const req = JSON.stringify([[['IJ4APc', JSON.stringify([[null, [term], [10], [2], 4]])]]])
  const text = await fetchText(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: `f.req=${encodeURIComponent(req)}`
  })
  // The reply is chunked: a length line, then a JSON array per chunk.
  for (const line of text.split('\n')) {
    if (!line.startsWith('[["wrb.fr","IJ4APc"')) continue
    const payload = JSON.parse(JSON.parse(line)[0][2] ?? 'null')
    return (payload?.[0]?.[0] ?? []).map((s) => s[0]).filter((s) => typeof s === 'string')
  }
  return []
}

export async function search(term, country, limit) {
  const html = await fetchText(`https://play.google.com/store/search?q=${encodeURIComponent(term)}&c=apps&hl=en&gl=${country}`)
  const ids = [...new Set([...html.matchAll(/\/store\/apps\/details\?id=([A-Za-z0-9._]+)/g)].map((m) => m[1]))].slice(0, limit)
  const apps = await mapLimit(ids, 3, (appId) => details(appId, country).catch(() => null))
  return apps.filter(Boolean)
}

export async function details(appId, country) {
  const url = `https://play.google.com/store/apps/details?id=${appId}&hl=en&gl=${country}`
  const html = await fetchText(url)
  const ld = /<script type="application\/ld\+json"[^>]*>([^<]*)<\/script>/.exec(html)
  const info = ld ? JSON.parse(ld[1]) : {}
  const installs = />([0-9.,]+[KMB]?\+)</.exec(html)?.[1] ?? null
  const updated = /Updated on<\/div><div[^>]*>([^<]+)</.exec(html)?.[1]
  return {
    store: 'play',
    id: appId,
    title: decodeHtml(info.name ?? appId),
    developer: decodeHtml(info.author?.name ?? ''),
    // Play shows no rating at all for small apps (the stars lower down the page
    // belong to "Similar apps"), so both stay unknown rather than zero.
    rating: info.aggregateRating ? Math.round(Number(info.aggregateRating.ratingValue) * 100) / 100 : null,
    ratings: info.aggregateRating ? Number(info.aggregateRating.ratingCount) : null,
    installs,
    installsMin: installs ? installsToNumber(installs) : null,
    price: Number(info.offers?.[0]?.price ?? 0),
    genre: info.applicationCategory ?? null,
    released: null,
    updated: updated ? new Date(`${updated} UTC`).toISOString().slice(0, 10) : null,
    url: `https://play.google.com/store/apps/details?id=${appId}`
  }
}

function installsToNumber(s) {
  const m = /([0-9.,]+)([KMB]?)/.exec(s)
  const n = Number(m[1].replace(/,/g, ''))
  return n * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]] ?? 1)
}

function decodeHtml(s) {
  return s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
}
