#!/usr/bin/env node
// What one use of an AI feature costs on each provider's models, and, given a
// price, what that does to the cost analysis. Prices come from
// references/ai-prices.json, which carries its as-of date and sources.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compute, money, pct } from './lib/economics.mjs'

const USAGE = `Usage: node ai-costs.mjs --input <tokens> --output <tokens> [options]

What one use costs:
  --input <n>           input tokens per text call (prompt + user content)
  --output <n>          output tokens per text call
  --calls <n>           text calls per use (default 1)
  --images <n>          images generated per use (default 0)
  --other <amount>      other cost per use in dollars, e.g. transcription (default 0)
  --providers <list>    anthropic,openai,google,xai (default all)

With a price, each pairing also gets the full cost analysis and a band:
  --price <n> --period <week|month|year|once>
  --uses <n> --heavy <n> --cap <n> --fixed <n>
  --cut <0-1> --revenuecat <0-1> | --no-revenuecat
  --eas <plan> --no-eas-update --requests <n>
  --json                print JSON instead of markdown
`

const here = dirname(fileURLToPath(import.meta.url))
const PRICES = JSON.parse(readFileSync(join(here, '..', 'references', 'ai-prices.json'), 'utf8'))

const opts = { calls: 1, images: 0, other: 0, cut: 0.15, rcRate: 0.01, eas: 'starter', easUpdate: true, requests: 0, uses: 1, fixed: 0 }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const v = () => {
    if (i + 1 >= argv.length) fail(`${a} needs a value`)
    return argv[++i]
  }
  const n = () => {
    const x = Number(v())
    if (!Number.isFinite(x)) fail(`${a} needs a number`)
    return x
  }
  if (a === '--help' || a === '-h') {
    process.stdout.write(USAGE)
    process.exit(0)
  } else if (a === '--input') opts.input = n()
  else if (a === '--output') opts.output = n()
  else if (a === '--calls') opts.calls = n()
  else if (a === '--images') opts.images = n()
  else if (a === '--other') opts.other = n()
  else if (a === '--providers') opts.providers = v().split(',').map((s) => s.trim())
  else if (a === '--price') opts.price = n()
  else if (a === '--period') opts.period = v()
  else if (a === '--uses') opts.uses = n()
  else if (a === '--heavy') opts.heavy = n()
  else if (a === '--cap') opts.cap = n()
  else if (a === '--fixed') opts.fixed = n()
  else if (a === '--cut') opts.cut = n()
  else if (a === '--revenuecat') opts.rcRate = n()
  else if (a === '--no-revenuecat') opts.rcRate = 0
  else if (a === '--eas') opts.eas = v()
  else if (a === '--no-eas-update') opts.easUpdate = false
  else if (a === '--requests') opts.requests = n()
  else if (a === '--json') opts.json = true
  else fail(`Unknown option ${a}`)
}
if (opts.input === undefined || opts.output === undefined) fail('Give --input and --output tokens per call.')
if (opts.price !== undefined && !['week', 'month', 'year', 'once'].includes(opts.period)) fail('With --price, give --period week, month, year or once.')

const wanted = (p) => !opts.providers || opts.providers.includes(p)
const textCost = (m, input = m.input, output = m.output) => ((opts.input * input + opts.output * output) / 1e6) * opts.calls

const text = PRICES.text.filter((m) => wanted(m.provider)).map((m) => ({
  ...m,
  perCall: textCost(m) / opts.calls,
  perUse: textCost(m),
  later: m.changes ? { on: m.changes.on, perUse: textCost(m, m.changes.input, m.changes.output) } : null
}))
const images = opts.images ? PRICES.image.filter((m) => wanted(m.provider)).map((m) => ({ ...m, perUse: m.perImage * opts.images })) : []

// Each text model is paired with its own provider's cheapest image model; a
// provider without one borrows the cheapest image model available.
const cheapest = (list) => (list.length ? list.reduce((a, b) => (b.perUse < a.perUse ? b : a)) : null)
const cheapestImage = cheapest(images)
const pairings = text.flatMap((t) => {
  const own = cheapest(images.filter((im) => im.provider === t.provider))
  const image = opts.images ? (own ?? cheapestImage) : null
  const rows = [{ text: t, image, borrowed: !!image && image.provider !== t.provider, perUse: t.perUse + (image?.perUse ?? 0) + opts.other }]
  if (t.later) rows.push({ ...rows[0], later: t.later.on, perUse: t.later.perUse + (image?.perUse ?? 0) + opts.other })
  return rows
})
if (opts.price !== undefined) {
  for (const p of pairings) {
    p.analysis = compute({
      price: opts.price,
      period: opts.period,
      cut: opts.cut,
      rcRate: opts.rcRate,
      eas: opts.eas,
      easUpdate: opts.easUpdate,
      requests: opts.requests,
      costs: [{ amount: p.perUse }],
      uses: opts.uses,
      heavy: opts.heavy,
      cap: opts.cap,
      fixed: opts.fixed
    })
  }
}

if (opts.json) {
  process.stdout.write(JSON.stringify({ asOf: PRICES.asOf, workload: opts, text, images, pairings }, null, 2) + '\n')
} else {
  process.stdout.write(markdown())
}

function markdown() {
  const L = []
  const work = [
    `${opts.calls} text call${opts.calls === 1 ? '' : 's'} of ${opts.input.toLocaleString('en-US')} tokens in and ${opts.output.toLocaleString('en-US')} out`,
    opts.images ? `${opts.images} image${opts.images === 1 ? '' : 's'}` : null,
    opts.other ? `${money(opts.other, 4)} of other costs` : null
  ].filter(Boolean)
  L.push('# AI model costs', '', `One use: ${work.join(', ')}. Prices as of ${PRICES.asOf}.`, '')

  if (pairings[0]?.analysis) {
    const a0 = pairings[0].analysis
    L.push(
      `## By model, against ${money(opts.price)} a ${opts.period}`,
      '',
      a0.model === 'subscription'
        ? `Net after the store's ${pct(opts.cut)}${opts.rcRate ? ` and RevenueCat's ${pct(opts.rcRate)}` : ''}: ${money(a0.netPerMonth)} a month. Heavy user: ${a0.usesPerDay.heavy} use${a0.usesPerDay.heavy === 1 ? "" : "s"} a day${a0.usesPerDay.cap !== null ? ` (capped at ${a0.usesPerDay.cap})` : ''}. Sorted cheapest first.`
        : `A one-time price; net ${money(a0.net)}. Sorted cheapest first.`,
      '',
      a0.model === 'subscription'
        ? '| Text model | Image model | Per use | Typical / month | Heavy / month | Heavy share of net | Band |'
        : '| Text model | Image model | Per use | Heavy / month | Months to use up the net | Band |',
      a0.model === 'subscription' ? '|---|---|---:|---:|---:|---:|---|' : '|---|---|---:|---:|---:|---|'
    )
    for (const p of [...pairings].sort((a, b) => a.perUse - b.perUse)) {
      const a = p.analysis
      const t = `${p.text.name}${p.later ? ` (from ${p.later})` : ''}`
      const im = p.image ? `${p.image.name}${p.borrowed ? ' *' : ''}` : '–'
      L.push(
        a.model === 'subscription'
          ? `| ${t} | ${im} | ${money(p.perUse, 4)} | ${money(a.costTypicalPerMonth)} | ${money(a.costHeavyPerMonth)} | ${pct(a.shareHeavy)} | **${a.band}** |`
          : `| ${t} | ${im} | ${money(p.perUse, 4)} | ${money(a.costHeavyPerMonth)} | ${a.heavyMonthsCovered ?? '∞'} | **${a.band}** |`
      )
    }
    if (pairings.some((p) => p.borrowed)) L.push('', `\\* ${PRICES.noImages.join(', ')} has no image model, so it's paired with the cheapest one available.`)
    L.push('')
  }

  L.push('## Text models', '', '| Provider | Model | Tier | Per call | Per use |', '|---|---|---|---:|---:|')
  for (const t of [...text].sort((a, b) => a.perUse - b.perUse)) {
    L.push(`| ${t.provider} | ${t.name} | ${t.tier} | ${money(t.perCall, 4)} | ${money(t.perUse, 4)} |`)
    if (t.later) L.push(`| ${t.provider} | ${t.name}, from ${t.later.on} | ${t.tier} | ${money(t.later.perUse / opts.calls, 4)} | ${money(t.later.perUse, 4)} |`)
  }
  if (images.length) {
    L.push('', '## Image models', '', '| Provider | Model | Per image | Per use |', '|---|---|---:|---:|')
    for (const im of [...images].sort((a, b) => a.perUse - b.perUse)) L.push(`| ${im.provider} | ${im.name}${im.estimate ? ' †' : ''} | ${money(im.perImage, 4)} | ${money(im.perUse, 4)} |`)
    if (images.some((im) => im.estimate)) L.push('', `† Estimated: ${images.find((im) => im.estimate).estimate}`)
  }
  L.push('', `Sources: ${Object.values(PRICES.sources).join(', ')}.`, '')
  return L.join('\n')
}

function fail(message) {
  process.stderr.write(`${message}\n\n${USAGE}`)
  process.exit(2)
}
