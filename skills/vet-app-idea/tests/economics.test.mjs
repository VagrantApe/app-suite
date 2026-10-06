import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compute } from '../scripts/lib/economics.mjs'

const base = { cut: 0.15, costs: [], uses: 1, fixed: 0 }

test('puts an AI app costing $0.06 a use, once a day, in the maybe band', () => {
  const r = compute({ ...base, price: 4.99, period: 'month', costs: [{ amount: 0.06 }], heavy: 1 })
  assert.equal(r.netPerMonth, 4.19)
  assert.equal(r.costHeavyPerMonth, 1.83)
  assert.equal(r.band, 'maybe')
})

test('a cap holds a heavy user to it', () => {
  const r = compute({ ...base, price: 4.99, period: 'month', costs: [{ amount: 0.06 }], heavy: 20, cap: 1 })
  assert.equal(r.usesPerDay.heavy, 1)
  assert.equal(r.band, 'maybe')
})

test("takes the store's cut and RevenueCat's 1% off the price, unless RevenueCat is left out", () => {
  const r = compute({ ...base, price: 10, period: 'month' })
  assert.deepEqual([r.storeFeePerMonth, r.rcFeePerMonth, r.netPerMonth], [1.5, 0.1, 8.4])
  assert.equal(compute({ ...base, price: 10, period: 'month', rcRate: 0 }).netPerMonth, 8.5)
})

test('turns weekly and yearly prices into a monthly figure', () => {
  assert.equal(compute({ ...base, price: 4.99, period: 'week' }).grossPerMonth, 21.62)
  assert.equal(compute({ ...base, price: 39.99, period: 'year' }).grossPerMonth, 3.33)
})

test('a free-to-serve app is a go, and break-even counts fixed costs plus the EAS plan', () => {
  const r = compute({ ...base, price: 2.99, period: 'month', fixed: 50 })
  assert.equal(r.band, 'go')
  // $50 + EAS Starter's $19, over $2.51 kept per subscriber.
  assert.equal(r.fixedPerMonth, 69)
  assert.equal(r.breakEvenSubscribers, 28)
})

test('counts EAS Update per user and EAS Hosting per request, and the plan as a fixed cost', () => {
  const r = compute({ ...base, price: 4.99, period: 'month', heavy: 3, requests: 2 })
  assert.equal(r.easUpdatePerUser, 0.005)
  // 2 requests x 3 uses x 30.4 days x $2 per million
  assert.equal(r.hostingHeavyPerMonth, 0.0004)
  assert.equal(r.easPlanPrice, 19)
  const none = compute({ ...base, price: 4.99, period: 'month', eas: 'none', requests: 2 })
  assert.equal(none.easUpdatePerUser, 0)
  assert.equal(none.fixedPerMonth, 0)
  assert.equal(compute({ ...base, price: 4.99, period: 'month', eas: 'production' }).easPlanPrice, 199)
  assert.equal(compute({ ...base, price: 4.99, period: 'month', easUpdate: false }).easUpdatePerUser, 0)
})

test('a one-time price is judged by how long a heavy user takes to use it up', () => {
  // $0.01 x 3 a day = $0.91 a month against $25.49 net: gone in 28 months.
  assert.equal(compute({ ...base, price: 29.99, period: 'once', costs: [{ amount: 0.01 }] }).band, 'maybe')
  assert.equal(compute({ ...base, price: 9.99, period: 'once', costs: [{ amount: 0.15 }], uses: 1, heavy: 1 }).band, 'no-go')
  // A token-refresh-sized cost takes centuries: not a reason to reject.
  assert.equal(compute({ ...base, price: 4.99, period: 'once', costs: [{ amount: 0.00001 }] }).band, 'go')
  assert.equal(compute({ ...base, price: 29.99, period: 'once' }).band, 'go')
})
