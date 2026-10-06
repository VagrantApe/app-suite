// Apple's App Review Guidelines page, split into numbered sections, each with
// its title and a hash of its text, so a later run can say which sections
// changed since the rules were written.

import { createHash } from 'node:crypto'

export const APPLE_URL = 'https://developer.apple.com/app-store/review/guidelines/'

export async function fetchGuidelines() {
  const res = await fetch(APPLE_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (app-suite store-review)' } })
  if (!res.ok) throw new Error(`${res.status} from developer.apple.com`)
  return parseGuidelines(await res.text())
}

export function parseGuidelines(html) {
  const ids = [...html.matchAll(/id="(\d+(?:\.\d+)*)"/g)].map((m) => ({ id: m[1], at: m.index }))
  const sections = {}
  ids.forEach(({ id, at }, i) => {
    const chunk = html.slice(at, ids[i + 1]?.at ?? html.length)
    const text = decode(chunk.slice(chunk.indexOf('>') + 1).replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) return
    sections[id] = { title: text.slice(0, 90), hash: createHash('sha1').update(text).digest('hex').slice(0, 12) }
  })
  return sections
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
}

/** Sections whose text changed, appeared or disappeared between two snapshots. */
export function diffSections(before, after) {
  const changed = []
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!before[id]) changed.push({ id, change: 'added', title: after[id].title })
    else if (!after[id]) changed.push({ id, change: 'removed', title: before[id].title })
    else if (before[id].hash !== after[id].hash) changed.push({ id, change: 'changed', title: after[id].title })
  }
  return changed.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
}
