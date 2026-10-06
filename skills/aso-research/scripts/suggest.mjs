#!/usr/bin/env node
// Expands seed phrases into the search terms people actually type, from each
// store's search-box suggestions. A term's rank is its best position in any
// suggestion list (1 = suggested first); stores order suggestions by
// popularity, so a low rank is the closest free signal to search volume.

import { emit, loadSaved, parseArgs, PROVIDERS } from './lib/cli.mjs'
import { suggestMarkdown } from './lib/format.mjs'

const USAGE = `Usage: node suggest.mjs <seed> [<seed>...] [options]

  --country <cc>     storefront (default us)
  --stores <list>    apple,play (default both)
  --expand           also try "<seed> a" ... "<seed> z" for long-tail terms
  --out <file>       save the full result as JSON there (keep it in data/)
  --json             print JSON instead of a markdown table
  --from <file>      re-print a saved result without fetching
  --fresh            ignore the 24-hour cache

Prints a markdown table: every suggested phrase with its rank in each store.
`

const opts = parseArgs(process.argv.slice(2), USAGE)
const saved = loadSaved(opts)
if (saved) {
  emit(saved, { markdown: suggestMarkdown }, { ...opts, out: undefined })
  process.exit(0)
}
const terms = new Map()

for (const seed of opts.positional) {
  const queries = [{ q: seed, via: 'seed' }]
  if (opts.expand) for (const c of 'abcdefghijklmnopqrstuvwxyz') queries.push({ q: `${seed} ${c}`, via: 'expand' })
  for (const store of opts.stores) {
    for (const { q, via } of queries) {
      let list = []
      try {
        list = await PROVIDERS[store].suggest(q, opts.country)
      } catch (e) {
        process.stderr.write(`${store} suggestions for "${q}" failed: ${e.message}\n`)
      }
      list.forEach((raw, i) => {
        const keyword = raw.trim().toLowerCase()
        const t = terms.get(keyword) ?? { keyword, apple: null, play: null, seeds: new Set(), via }
        t[store] = t[store] === null ? i + 1 : Math.min(t[store], i + 1)
        t.seeds.add(seed)
        if (via === 'seed') t.via = 'seed'
        terms.set(keyword, t)
      })
    }
  }
}

const best = (t) => Math.min(t.apple ?? 99, t.play ?? 99)
const keywords = [...terms.values()]
  .map((t) => ({ ...t, seeds: [...t.seeds], inBoth: t.apple !== null && t.play !== null }))
  .sort((a, b) => Number(b.inBoth) - Number(a.inBoth) || best(a) - best(b) || a.keyword.localeCompare(b.keyword))

emit(
  {
    country: opts.country,
    stores: opts.stores,
    generatedAt: new Date().toISOString(),
    seeds: opts.positional,
    expanded: !!opts.expand,
    note: 'Ranks are suggestion positions (1 = first), a popularity proxy, not search volume.',
    keywords
  },
  { markdown: suggestMarkdown },
  opts
)
