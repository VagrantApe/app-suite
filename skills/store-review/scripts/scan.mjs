#!/usr/bin/env node
// Scans an Expo project for what App Review and Google Play review reject.
// Prints candidate findings by severity, with evidence and the rule each
// breaks; the skill confirms each one by reading the code.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProject } from './lib/project.mjs'
import { runRules } from './lib/rules.mjs'

const USAGE = `Usage: node scan.mjs <project folder> [options]

  --listing <file>   store listing to check: JSON with any of name, subtitle,
                     keywords, title, shortDescription (an EAS Metadata
                     store.config.json in the project is read automatically)
  --out <file>       also save the findings as JSON
  --json             print JSON instead of markdown
`

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const dir = args.find((a, i) => !a.startsWith('--') && !['--listing', '--out'].includes(args[i - 1]))
if (!dir || args.includes('--help')) {
  process.stderr.write(USAGE)
  process.exit(dir ? 0 : 2)
}
const root = resolve(dir)
if (!existsSync(join(root, 'package.json'))) {
  process.stderr.write(`No package.json in ${root}: point this at the app's folder.\n`)
  process.exit(2)
}

const RULES = loadRuleTable()
const project = loadProject(root)
const listing = loadListing(root, opt('--listing'))
const findings = runRules(project, listing).map((f) => ({ ...f, ...RULES[f.rule] }))
const result = {
  project: root,
  scannedAt: new Date().toISOString(),
  config: project.configSource,
  files: project.files.length,
  listing: listing ? (opt('--listing') ?? 'store.config.json') : null,
  counts: count(findings),
  findings
}
if (opt('--out')) writeFileSync(opt('--out'), JSON.stringify(result, null, 2) + '\n')
process.stdout.write(args.includes('--json') ? JSON.stringify(result, null, 2) + '\n' : markdown(result))

function markdown(r) {
  const L = [
    `# Store review scan: ${r.project.split('/').pop()}`,
    '',
    `${r.scannedAt.slice(0, 10)} · ${r.files} source files · config from ${r.config}${r.listing ? ` · listing from ${r.listing}` : ' · no store listing checked'}`,
    '',
    `**${r.counts.blocker} blocker${r.counts.blocker === 1 ? '' : 's'}, ${r.counts.risk} risk${r.counts.risk === 1 ? '' : 's'}, ${r.counts.check} to check.** These are candidates: confirm each against the code before reporting it.`,
    ''
  ]
  for (const [sev, title] of [
    ['blocker', 'Blockers'],
    ['risk', 'Risks'],
    ['check', 'To check in the store consoles']
  ]) {
    const list = r.findings.filter((x) => x.severity === sev)
    if (!list.length) continue
    L.push(`## ${title}`, '', '| Rule | Store | Cites | Found | Fix |', '|---|---|---|---|---|')
    for (const x of list) {
      const ev = x.evidence.slice(0, 3).map((e) => `\`${e.file}${e.line ? `:${e.line}` : ''}\``).join(', ')
      L.push(`| \`${x.rule}\` | ${x.store ?? ''} | ${x.cites ?? ''} | ${esc(x.message)}${ev ? ` (${ev})` : ''} | ${x.fix ?? ''} |`)
    }
    L.push('')
  }
  return L.join('\n')
}

/** Store, citation and fix for each rule, from references/rules.md, so the table there stays the one source. */
function loadRuleTable() {
  const here = dirname(fileURLToPath(import.meta.url))
  const md = readFileSync(join(here, '..', 'references', 'rules.md'), 'utf8')
  const table = {}
  for (const line of md.split('\n')) {
    const m = /^\| `([a-z-]+)` \| ([^|]+) \| ([^|]+) \| [^|]+ \| [^|]+ \| ([^|]+) \|$/.exec(line)
    if (m) table[m[1]] = { store: m[2].trim(), cites: m[3].trim(), fix: m[4].trim() }
  }
  return table
}

function loadListing(root, file) {
  if (file) {
    const text = readFileSync(file, 'utf8')
    try {
      return JSON.parse(text)
    } catch {
      return { description: text }
    }
  }
  const p = join(root, 'store.config.json')
  if (!existsSync(p)) return null
  const info = Object.values(JSON.parse(readFileSync(p, 'utf8'))?.apple?.info ?? {})[0]
  return info ? { name: info.title, subtitle: info.subtitle, keywords: Array.isArray(info.keywords) ? info.keywords.join(',') : info.keywords } : null
}

function count(list) {
  const c = { blocker: 0, risk: 0, check: 0 }
  for (const f of list) c[f.severity]++
  return c
}

function esc(s) {
  return String(s).replace(/\|/g, '\\|')
}
