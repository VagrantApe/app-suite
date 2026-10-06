import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const script = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'ai-costs.mjs')
const run = (...args) => JSON.parse(execFileSync('node', [script, ...args, '--json'], { encoding: 'utf8' }))

test('prices a text call from tokens: 1,000 in and 1,000 out at $1/$5 per million is $0.006', () => {
  const r = run('--input', '1000', '--output', '1000', '--providers', 'anthropic')
  assert.equal(r.text.find((t) => t.model === 'claude-haiku-4-5').perUse, 0.006)
})

test("pairs each provider with its cheapest image model, and borrows one for a provider without images", () => {
  const r = run('--input', '1000', '--output', '500', '--images', '1')
  const google = r.pairings.find((p) => p.text.provider === 'google' && !p.later)
  const googleImages = r.images.filter((i) => i.provider === 'google').map((i) => i.perUse)
  assert.equal(google.image.perUse, Math.min(...googleImages))
  const claude = r.pairings.find((p) => p.text.provider === 'anthropic')
  assert.equal(claude.borrowed, true)
  assert.equal(claude.image.perUse, Math.min(...r.images.map((i) => i.perUse)))
})

test('adds a row for a scheduled price change, and a band when given a price', () => {
  const r = run('--input', '1000', '--output', '500', '--price', '4.99', '--period', 'month', '--providers', 'google')
  assert.ok(r.pairings.some((p) => p.later))
  for (const p of r.pairings) assert.ok(['go', 'maybe', 'no-go'].includes(p.analysis.band))
})
