import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { diffSections, parseGuidelines } from '../scripts/lib/apple-guidelines.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const scan = (fixture, ...args) =>
  JSON.parse(execFileSync('node', [join(here, '..', 'scripts', 'scan.mjs'), join(here, 'fixtures', fixture), '--json', ...args], { encoding: 'utf8' }))
const rules = (r, severity) => [...new Set(r.findings.filter((f) => f.severity === severity).map((f) => f.rule))].sort()

test('finds every blocker planted in the bad app', () => {
  assert.deepEqual(rules(scan('bad-app'), 'blocker'), [
    'account-deletion',
    'app-icon',
    'app-identity',
    'login-parity',
    'purpose-strings',
    'restore-purchases',
    'test-build',
    'tracking-consent'
  ])
})

test('flags the bad app\'s risks, each with its citation and fix from rules.md', () => {
  const r = scan('bad-app')
  assert.ok(r.findings.some((f) => f.rule === 'app-identity' && /com\.example/.test(f.message)))
  for (const rule of ['client-secrets', 'sdk-current', 'placeholder-content', 'subscription-terms', 'outside-payments', 'platform-mentions', 'privacy-manifest', 'ai-data-sharing', 'user-content', 'health-claims', 'android-permissions'])
    assert.ok(rules(r, 'risk').includes(rule), rule)
  for (const f of r.findings) assert.ok(f.cites && f.fix, `${f.rule} has no citation or fix`)
})

test('a word in a comment is not a privacy link, and a TODO comment is not placeholder copy', () => {
  const r = scan('bad-app')
  assert.ok(r.findings.some((f) => f.rule === 'privacy-policy-link'))
  const placeholder = r.findings.find((f) => f.rule === 'placeholder-content')
  assert.ok(placeholder.evidence.every((e) => !e.text.includes('TODO')))
})

test('the clean app has no blockers or risks, only the console checks', () => {
  const r = scan('clean-app')
  assert.equal(r.counts.blocker, 0)
  assert.equal(r.counts.risk, 0)
  assert.deepEqual(rules(r, 'check'), ['account-deletion', 'data-safety', 'demo-account'])
})

test('flags an icon that is not 1024x1024, and EXPO_PUBLIC_ values the production build does not set', () => {
  const r = scan('wrong-icon')
  assert.ok(r.findings.some((f) => f.rule === 'app-icon' && f.severity === 'blocker' && /512×512/.test(f.message)))
  assert.ok(r.findings.some((f) => f.rule === 'public-env' && /EXPO_PUBLIC_API_KEY/.test(f.message)))
  assert.ok(r.findings.some((f) => f.rule === 'submit-credentials'))
})

test('a platform check keeps an Android-only message from counting as a mention', () => {
  const r = scan('clean-app')
  assert.ok(!r.findings.some((f) => f.rule === 'platform-mentions'))
})

test('checks listing limits, brands and claims', () => {
  const listing = join(here, 'fixtures', 'listing.json')
  const r = scan('clean-app', '--listing', listing)
  assert.ok(r.findings.some((f) => f.rule === 'listing-limits'))
  assert.ok(r.findings.some((f) => f.rule === 'listing-brands'))
  assert.ok(r.findings.some((f) => f.rule === 'listing-claims'))
})

test('reports guideline sections that were added, removed or reworded', () => {
  const before = parseGuidelines('<h3 id="1.1">1.1 Objectionable Content</h3><p>Old.</p><h3 id="1.2">1.2 UGC</h3><p>Same.</p>')
  const after = parseGuidelines('<h3 id="1.1">1.1 Objectionable Content</h3><p>New wording.</p><h3 id="1.3">1.3 Kids</h3><p>Kids.</p>')
  assert.deepEqual(
    diffSections(before, after).map((c) => [c.id, c.change]),
    [
      ['1.1', 'changed'],
      ['1.2', 'removed'],
      ['1.3', 'added']
    ]
  )
})
