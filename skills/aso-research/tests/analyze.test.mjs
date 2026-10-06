import assert from 'node:assert/strict'
import { test } from 'node:test'
import { summarize } from '../scripts/lib/analyze.mjs'

const NOW = Date.parse('2026-10-05')
const app = (o) => ({ title: 'Something', ratings: 5000, rating: 4.6, price: 0, updated: '2026-09-01', released: '2020-01-01', ...o })

test('labels established leaders high', () => {
  const apps = Array.from({ length: 10 }, (_, i) => app({ title: `Habit Tracker ${i}`, ratings: 20000 }))
  assert.equal(summarize('habit tracker', apps, NOW).competition, 'high')
})

test('labels a field of weak or stale apps low, even with some big names', () => {
  const apps = [
    ...Array.from({ length: 4 }, () => app({ ratings: 3000 })),
    ...Array.from({ length: 6 }, () => app({ ratings: 3000, updated: '2024-01-01' }))
  ]
  const s = summarize('plant identifier', apps, NOW)
  assert.equal(s.competition, 'low')
  assert.equal(s.beatable, 6)
  assert.equal(s.stale, 6)
})

test('counts title matches by whole words, ignoring case and punctuation', () => {
  const apps = [app({ title: 'Plant Care: Watering' }), app({ title: 'Care for Plants' }), app({ title: 'PLANT-CARE Pro' })]
  assert.equal(summarize('plant care', apps, NOW).titleMatches, 2)
})

test('counts an app that is weak and stale once', () => {
  const s = summarize('x', [app({ ratings: 10, updated: '2020-01-01' })], NOW)
  assert.equal(s.beatable, 1)
  assert.equal(s.weak, 1)
  assert.equal(s.stale, 1)
})

test('reports no results as none', () => {
  const s = summarize('nothing here', [], NOW)
  assert.equal(s.competition, 'none')
  assert.match(s.signals[0], /No apps returned/)
})

test('judges apps with a hidden ratings count by installs, and leaves them out of the median', () => {
  const apps = [
    app({ ratings: 1000 }),
    app({ ratings: 3000 }),
    app({ ratings: null, rating: null, installsMin: 5000 }),
    app({ ratings: null, rating: null, installsMin: 100000 })
  ]
  const s = summarize('x', apps, NOW)
  assert.equal(s.medianRatings, 2000)
  assert.equal(s.ratingsHidden, 2)
  assert.equal(s.weak, 1)
})
