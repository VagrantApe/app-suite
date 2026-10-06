// Shared command-line handling for the research scripts.

import { readFileSync, writeFileSync } from 'node:fs'
import { checkCountry } from './countries.mjs'
import { disableCache } from './http.mjs'
import * as apple from './apple.mjs'
import * as play from './play.mjs'

/**
 * The stores to research. A paid ASO provider would be added here: a module
 * with the same suggest/search functions, plus volume and difficulty on its
 * keyword results.
 */
export const PROVIDERS = { apple, play }

export function parseArgs(argv, usage) {
  const opts = { country: 'us', stores: ['apple', 'play'], positional: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const value = () => {
      if (i + 1 >= argv.length) fail(`${a} needs a value`, usage)
      return argv[++i]
    }
    if (a === '--help' || a === '-h') fail(null, usage)
    else if (a === '--country') opts.country = value()
    else if (a === '--stores') opts.stores = value().split(',').map((s) => s.trim())
    else if (a === '--out') opts.out = value()
    else if (a === '--limit') opts.limit = Number(value())
    else if (a === '--rows') opts.rows = Number(value())
    else if (a === '--from') opts.from = value()
    else if (a === '--expand') opts.expand = true
    else if (a === '--json') opts.json = true
    else if (a === '--full') opts.full = true
    else if (a === '--fresh') disableCache()
    else if (a.startsWith('--')) fail(`Unknown option ${a}`, usage)
    else opts.positional.push(a)
  }
  try {
    opts.country = checkCountry(opts.country)
  } catch (e) {
    fail(e.message, usage)
  }
  for (const s of opts.stores) if (!(s in PROVIDERS)) fail(`Unknown store "${s}". Use apple, play or both.`, usage)
  if (opts.positional.length === 0 && !opts.from) fail('Give at least one keyword.', usage)
  return opts
}

/** A saved result to re-render instead of fetching (--from). */
export function loadSaved(opts) {
  return opts.from ? JSON.parse(readFileSync(opts.from, 'utf8')) : null
}

/**
 * Saves the full result as JSON with --out, then prints it for reading:
 * markdown by default, `brief` JSON with --json, everything with --full.
 */
export function emit(full, { brief, markdown }, opts) {
  if (opts.out) writeFileSync(opts.out, JSON.stringify(full, null, 2) + '\n')
  if (opts.full) process.stdout.write(JSON.stringify(full, null, 2) + '\n')
  else if (opts.json) process.stdout.write(JSON.stringify(brief ?? full, null, 2) + '\n')
  else process.stdout.write(markdown(full))
  if (opts.out) process.stderr.write(`Saved the full data to ${opts.out}\n`)
}

function fail(message, usage) {
  if (message) process.stderr.write(`${message}\n\n`)
  process.stderr.write(usage)
  process.exit(message ? 2 : 0)
}
