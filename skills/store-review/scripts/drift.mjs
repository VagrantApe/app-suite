#!/usr/bin/env node
// Has Apple changed its App Review Guidelines since this skill's rules were
// written? Compares the live page with references/apple-sections.json and
// names the rules that cite each changed section.

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APPLE_URL, diffSections, fetchGuidelines } from './lib/apple-guidelines.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT = join(here, '..', 'references', 'apple-sections.json')
const RULES = join(here, '..', 'references', 'rules.md')

if (process.argv.includes('--help')) {
  process.stdout.write(`Usage: node drift.mjs [--update]

Compares Apple's live App Review Guidelines with the snapshot the rules were
written against. --update replaces the snapshot (after the rules are checked).
`)
  process.exit(0)
}

const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'))
let live
try {
  live = await fetchGuidelines()
} catch (e) {
  process.stdout.write(`Couldn't read Apple's guidelines (${e.message}). Check ${APPLE_URL} by hand for changes since ${snapshot.asOf}.\n`)
  process.exit(0)
}

if (process.argv.includes('--update')) {
  writeFileSync(SNAPSHOT, JSON.stringify({ asOf: new Date().toISOString().slice(0, 10), url: APPLE_URL, sections: live }, null, 1) + '\n')
  process.stdout.write(`Snapshot updated: ${Object.keys(live).length} sections.\n`)
  process.exit(0)
}

const changes = diffSections(snapshot.sections, live)
const rules = readFileSync(RULES, 'utf8')
const citing = (id) =>
  [...rules.matchAll(/^\| `([a-z-]+)` \|[^|]+\|([^|]+)\|/gm)]
    .filter(([, , cites]) => new RegExp(`Apple[^;]*\\b${id.replace(/\./g, '\\.')}(\\b|\\()`).test(cites))
    .map(([, rule]) => rule)

const L = [`# Apple guideline changes since ${snapshot.asOf}`, '']
if (!changes.length) {
  L.push(`None: all ${Object.keys(live).length} sections match the snapshot the rules were written against.`)
} else {
  L.push(`${changes.length} section${changes.length === 1 ? '' : 's'} changed. Read each one on ${APPLE_URL} and update the rules that cite it before relying on them.`, '')
  L.push('| Section | Change | Starts with | Rules citing it |', '|---|---|---|---|')
  for (const c of changes) L.push(`| ${c.id} | ${c.change} | ${c.title.replace(/\|/g, '/')} | ${citing(c.id).map((r) => `\`${r}\``).join(', ') || '–'} |`)
}
L.push('', "Google Play has no comparable page to diff; open the cited Play policy when a finding depends on its wording.", '')
process.stdout.write(L.join('\n'))
