// Turns a keyword's top results into gap signals. The thresholds are rules of
// thumb from building small subscription apps; they're here, in one place, so
// every report uses the same ones and reports stay comparable over time.

export const THRESHOLDS = {
  /** An app with fewer ratings than this is beatable on reviews alone. */
  weakRatings: 500,
  /** With no ratings count shown (small Play apps), fewer installs than this is weak. */
  weakInstalls: 10000,
  /** An app rated below this leaves room for a better one. */
  weakRating: 4.0,
  /** Not updated for this many days: likely abandoned. */
  staleDays: 365,
  /** Released within this many days: the niche is attracting newcomers. */
  newDays: 365,
  /** Median ratings at or above this: established leaders. */
  highMedian: 10000,
  /** Median ratings below this: nobody owns the keyword yet. */
  lowMedian: 500
}

const DAY = 86400000

export function summarize(keyword, apps, now = Date.now()) {
  const top = apps.slice(0, 10)
  const words = tokens(keyword)
  // Play hides ratings counts for small apps (null); judge those by installs.
  const known = top.filter((a) => a.ratings !== null && a.ratings !== undefined)
  const median = medianOf(known.map((a) => a.ratings))
  const isSmall = (a) =>
    a.ratings !== null && a.ratings !== undefined ? a.ratings < THRESHOLDS.weakRatings : a.installsMin !== null && a.installsMin !== undefined && a.installsMin < THRESHOLDS.weakInstalls
  const isWeak = (a) => isSmall(a) || (a.rating !== null && a.rating !== undefined && a.rating < THRESHOLDS.weakRating)
  const isStale = (a) => a.updated && now - Date.parse(a.updated) > THRESHOLDS.staleDays * DAY
  const isNew = (a) => a.released && now - Date.parse(a.released) < THRESHOLDS.newDays * DAY
  const titleMatches = top.filter((a) => words.every((w) => tokens(a.title).includes(w))).length
  const weak = top.filter(isWeak).length
  const stale = top.filter(isStale).length
  const fresh = top.filter(isNew).length
  const paid = top.filter((a) => a.price > 0).length
  // Apps a better-made newcomer could overtake: weak, stale, or both.
  const beatable = top.filter((a) => isWeak(a) || isStale(a)).length

  const mostlyBeatable = top.length > 0 && beatable >= Math.ceil(top.length / 2)

  // High means established leaders that a newcomer can't simply out-review.
  let competition = 'medium'
  if (top.length === 0) competition = 'none'
  else if (median >= THRESHOLDS.highMedian || (titleMatches >= 5 && median >= 2000 && !mostlyBeatable)) competition = 'high'
  else if (median < THRESHOLDS.lowMedian || mostlyBeatable) competition = 'low'

  const signals = []
  if (top.length === 0) signals.push('No apps returned: either a dead phrase or a true gap. Check that it autocompletes.')
  if (titleMatches === 0 && top.length > 0) signals.push(`None of the top ${top.length} put the phrase in their title.`)
  else if (titleMatches <= 2) signals.push(`Only ${titleMatches} of the top ${top.length} put the phrase in their title.`)
  if (titleMatches >= 7) signals.push(`${titleMatches} of the top ${top.length} put the phrase in their title: crowded on the exact phrase; look for a narrower variant.`)
  if (mostlyBeatable) signals.push(`${beatable} of the top ${top.length} are beatable (weak or stale).`)
  if (stale >= 3) signals.push(`${stale} of the top ${top.length} haven't been updated in a year.`)
  if (weak >= 3 && !mostlyBeatable) signals.push(`${weak} of the top ${top.length} are weak (under ${THRESHOLDS.weakRatings} ratings or rated under ${THRESHOLDS.weakRating}).`)
  if (top.length - known.length >= 3) signals.push(`${top.length - known.length} of the top ${top.length} hide their ratings count (small apps); judged by installs instead.`)
  if (fresh >= 3) signals.push(`${fresh} of the top ${top.length} launched in the last year: the niche is active.`)
  if (paid >= 3) signals.push(`${paid} of the top ${top.length} are paid upfront.`)
  const leader = top.reduce((best, a) => ((a.ratings ?? 0) > (best?.ratings ?? -1) ? a : best), null)

  return {
    results: top.length,
    competition,
    medianRatings: median,
    /** Apps whose ratings count the store didn't show. */
    ratingsHidden: top.length - known.length,
    leader: leader ? { title: leader.title, ratings: leader.ratings, rating: leader.rating, installs: leader.installs ?? null } : null,
    titleMatches,
    weak,
    stale,
    beatable,
    newcomers: fresh,
    paid,
    signals
  }
}

function tokens(s) {
  return String(s)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function medianOf(xs) {
  if (xs.length === 0) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2)
}
