#!/usr/bin/env node
// The top apps for each keyword in each store, and what they say about the
// gap: how established the leaders are, how many target the phrase in their
// title, and how many are weak, stale, new or paid (see lib/analyze.mjs).

import { summarize, THRESHOLDS } from './lib/analyze.mjs'
import { emit, loadSaved, parseArgs, PROVIDERS } from './lib/cli.mjs'
import { serpMarkdown } from './lib/format.mjs'

const USAGE = `Usage: node serp.mjs <keyword> [<keyword>...] [options]

  --country <cc>     storefront (default us)
  --stores <list>    apple,play (default both)
  --limit <n>        apps per keyword per store (default 10)
  --rows <n>         apps listed per store in the printout (default 5)
  --out <file>       save every app's details as JSON there (keep it in data/)
  --json             print the summaries as JSON instead of markdown
  --full             print every app's details as JSON
  --from <file>      re-print a saved result without fetching
  --fresh            ignore the 24-hour cache

Prints markdown: an overview table (competition label, median ratings, title
matches, beatable apps and leader per keyword and store), then each keyword's
gap signals and top apps.
`

const opts = parseArgs(process.argv.slice(2), USAGE)
const markdown = (r) => serpMarkdown(r, { rows: opts.rows > 0 ? opts.rows : 5 })
const saved = loadSaved(opts)
if (saved) {
  emit(saved, { brief: briefOf(saved), markdown }, { ...opts, out: undefined })
  process.exit(0)
}
const limit = opts.limit > 0 ? opts.limit : 10
const keywords = []

for (const keyword of opts.positional) {
  const entry = { keyword }
  for (const store of opts.stores) {
    try {
      const apps = await PROVIDERS[store].search(keyword, opts.country, limit)
      entry[store] = { summary: summarize(keyword, apps), apps }
    } catch (e) {
      entry[store] = { error: e.message }
      process.stderr.write(`${store} results for "${keyword}" failed: ${e.message}\n`)
    }
  }
  keywords.push(entry)
}

const full = { country: opts.country, stores: opts.stores, generatedAt: new Date().toISOString(), thresholds: THRESHOLDS, keywords }
emit(full, { brief: briefOf(full), markdown }, opts)

/** The summaries and top 3 apps per keyword and store, for --json. */
function briefOf({ keywords: list, ...meta }) {
  return {
    ...meta,
    keywords: list.map((k) => {
      const out = { keyword: k.keyword }
      for (const store of meta.stores) {
        const r = k[store]
        out[store] = !r || r.error ? r : { ...r.summary, top3: r.apps.slice(0, 3).map(({ title, ratings, rating, installs, updated }) => ({ title, ratings, rating, installs, updated })) }
      }
      return out
    })
  }
}
