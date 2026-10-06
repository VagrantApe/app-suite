// Fetching for the store providers: a browser-like user agent, polite pacing
// between requests to the same host, retries on throttling, and a 24-hour disk
// cache so re-running research on the same keywords is fast and doesn't hammer
// the stores.

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const CACHE_DIR = process.env.APP_SUITE_CACHE ?? join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'app-suite', 'aso')
const CACHE_MS = 24 * 60 * 60 * 1000
const GAP_MS = 400
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

const lastHit = new Map()
let noCache = false

/** Skips the disk cache for this run (fresh data). */
export function disableCache() {
  noCache = true
}

/**
 * Fetches a URL as text. `init` is passed to fetch; its body counts toward the
 * cache key, so two POSTs with different bodies are cached apart.
 */
export async function fetchText(url, init = {}) {
  const key = createHash('sha1').update(url + '\n' + (init.body ?? '')).digest('hex')
  const file = join(CACHE_DIR, key)
  if (!noCache) {
    try {
      if (Date.now() - statSync(file).mtimeMs < CACHE_MS) return readFileSync(file, 'utf8')
    } catch {
      // Not cached yet.
    }
  }

  const host = new URL(url).host
  for (let attempt = 0; ; attempt++) {
    const wait = (lastHit.get(host) ?? 0) + GAP_MS - Date.now()
    if (wait > 0) await sleep(wait)
    lastHit.set(host, Date.now())
    let res
    try {
      res = await fetch(url, { ...init, headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9', ...init.headers } })
    } catch (e) {
      // A dropped connection or DNS hiccup; worth another try.
      if (attempt < 3) {
        await sleep(1000 * 2 ** attempt)
        continue
      }
      throw new Error(`${e.cause?.code ?? e.message} reaching ${host}`)
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await sleep(1500 * 2 ** attempt)
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText} from ${host}`)
    const text = await res.text()
    mkdirSync(CACHE_DIR, { recursive: true })
    writeFileSync(file, text)
    return text
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Runs fn over items, a few at a time. */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
      }
    })
  )
  return out
}
