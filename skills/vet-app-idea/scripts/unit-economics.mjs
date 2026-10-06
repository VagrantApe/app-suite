#!/usr/bin/env node
// The cost analysis behind the Money criterion: what one subscriber pays after the
// store's cut, what serving them costs at typical and heavy use, and the
// verdict band that puts them in (see references/criteria.md).

import { compute, money, pct } from './lib/economics.mjs'

const USAGE = `Usage: node unit-economics.mjs --price <amount> --period <week|month|year> [options]

  --price <n>           what the user pays per period (e.g. 4.99)
  --period <p>          week, month or year; or "once" for a one-time price
  --cut <0-1>           the store's share (default 0.15)
  --revenuecat <0-1>    RevenueCat's share of revenue (default 0.01; free below
                        $2,500 a month, so this assumes you're past that)
  --no-revenuecat       leave RevenueCat's fee out (another billing service, or under $2.5K)
  --eas <plan>          Expo EAS plan: free, starter (default, $19/month), production
                        ($199/month) or none; the plan counts as a fixed monthly cost
  --no-eas-update       the app doesn't use EAS Update (otherwise $0.005 per active user)
  --requests <n>        API requests to EAS Hosting per use (default 0; $2 per million)
  --cost <name=amount>  cost per use, repeatable (e.g. --cost summary=0.01 --cost photo=0.04)
  --uses <n>            uses per day for a typical user (default 1)
  --heavy <n>           uses per day for a heavy user (default 3x typical)
  --cap <n>             the most uses a user gets per day, if you'll enforce one
  --fixed <n>           fixed costs per month (hosting, tools), for break-even
  --json                print JSON instead of markdown

Prints the net price per month, cost per user per month at typical and heavy
use, the share of net that cost takes, and the verdict band it falls in.
`

const opts = { cut: 0.15, rcRate: 0.01, eas: 'starter', easUpdate: true, requests: 0, uses: 1, costs: [], fixed: 0 }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  const v = () => {
    if (i + 1 >= argv.length) fail(`${a} needs a value`)
    return argv[++i]
  }
  if (a === '--help' || a === '-h') {
    process.stdout.write(USAGE)
    process.exit(0)
  } else if (a === '--price') opts.price = num(v(), a)
  else if (a === '--period') opts.period = v()
  else if (a === '--cut') opts.cut = num(v(), a)
  else if (a === '--revenuecat') opts.rcRate = num(v(), a)
  else if (a === '--no-revenuecat') opts.rcRate = 0
  else if (a === '--eas') opts.eas = v()
  else if (a === '--no-eas-update') opts.easUpdate = false
  else if (a === '--requests') opts.requests = num(v(), a)
  else if (a === '--uses') opts.uses = num(v(), a)
  else if (a === '--heavy') opts.heavy = num(v(), a)
  else if (a === '--cap') opts.cap = num(v(), a)
  else if (a === '--fixed') opts.fixed = num(v(), a)
  else if (a === '--json') opts.json = true
  else if (a === '--cost') {
    const [name, amount] = v().split('=')
    if (!name || amount === undefined) fail('--cost takes name=amount')
    opts.costs.push({ name, amount: num(amount, a) })
  } else fail(`Unknown option ${a}`)
}
if (opts.price === undefined || !opts.period) fail('Give --price and --period.')
if (!['week', 'month', 'year', 'once'].includes(opts.period)) fail('--period is week, month, year or once.')
if (opts.cut < 0 || opts.cut >= 1) fail('--cut is a share between 0 and 1, like 0.15.')
if (opts.rcRate < 0 || opts.rcRate >= 1) fail('--revenuecat is a share between 0 and 1, like 0.01.')
if (!['free', 'starter', 'production', 'none'].includes(opts.eas)) fail('--eas is free, starter, production or none.')

const result = compute(opts)
process.stdout.write(opts.json ? JSON.stringify(result, null, 2) + '\n' : markdown(result))

function markdown(r) {
  if (r.model === 'one-time') {
    return [
      '# Cost analysis: one-time price',
      '',
      `**Bottom line: ${r.band}.** ${r.why}`,
      '',
      `| | |`,
      `|---|---:|`,
      `| Price | ${money(r.price)} |`,
      `| Store's ${pct(r.cut)} | -${money(r.storeFee)} |`,
      ...(r.rcRate ? [`| RevenueCat's ${pct(r.rcRate)} | -${money(r.rcFee)} |`] : []),
      `| What you keep | ${money(r.net)} |`,
      `| Cost per use | ${money(r.perUse, 4)} |`,
      `| Heavy user's cost per month (usage and EAS) | ${small(r.costHeavyPerMonth)} |`,
      '',
      ...easNotes(r)
    ].join('\n')
  }
  return [
    `# Cost analysis: ${money(r.price)} a ${r.period}`,
    '',
    `**Bottom line: ${r.band}.** ${r.why}`,
    '',
    '| | Typical user | Heavy user |',
    '|---|---:|---:|',
    `| Uses per day | ${r.usesPerDay.typical} | ${r.usesPerDay.heavy}${r.usesPerDay.cap !== null ? ` (cap ${r.usesPerDay.cap})` : ''} |`,
    `| Price per month | ${money(r.grossPerMonth)} | ${money(r.grossPerMonth)} |`,
    `| Store's ${pct(r.cut)} | -${money(r.storeFeePerMonth)} | -${money(r.storeFeePerMonth)} |`,
    ...(r.rcRate ? [`| RevenueCat's ${pct(r.rcRate)} | -${money(r.rcFeePerMonth)} | -${money(r.rcFeePerMonth)} |`] : []),
    `| **What you keep (net)** | **${money(r.netPerMonth)}** | **${money(r.netPerMonth)}** |`,
    `| Usage (${money(r.perUse, 4)} a use) | ${small(r.usageTypicalPerMonth)} | ${small(r.usageHeavyPerMonth)} |`,
    ...(r.easUpdatePerUser ? [`| EAS Update (per active user) | ${small(r.easUpdatePerUser)} | ${small(r.easUpdatePerUser)} |`] : []),
    ...(r.requestsPerUse ? [`| EAS Hosting (${r.requestsPerUse} request${r.requestsPerUse === 1 ? '' : 's'} a use) | ${small(r.hostingTypicalPerMonth)} | ${small(r.hostingHeavyPerMonth)} |`] : []),
    `| **Total cost per month** | **${money(r.costTypicalPerMonth)}** | **${money(r.costHeavyPerMonth)}** |`,
    `| Share of net | ${pct(r.shareTypical)} | ${pct(r.shareHeavy)} |`,
    `| Left per month | ${money(r.marginTypicalPerMonth)} | ${money(r.netPerMonth - r.costHeavyPerMonth)} |`,
    '',
    ...easNotes(r),
    r.breakEvenSubscribers ? `Fixed costs of ${money(r.fixedPerMonth)} a month break even at ${r.breakEvenSubscribers} typical subscribers.` : '',
    r.rcRate ? `RevenueCat is free below $2,500 a month in revenue; its fee is counted here as if you're past that.` : '',
    ''
  ].join('\n')
}

function num(s, flag) {
  const n = Number(s)
  if (!Number.isFinite(n)) fail(`${flag} needs a number, got "${s}"`)
  return n
}

function fail(message) {
  process.stderr.write(`${message}\n\n${USAGE}`)
  process.exit(2)
}

/** The EAS lines under the table: the plan as a fixed cost, and what the per-user charges assume. */
function easNotes(r) {
  if (r.easPlan === 'none') return []
  const notes = []
  if (r.easPlanPrice) notes.push(`EAS ${r.easPlan[0].toUpperCase() + r.easPlan.slice(1)} plan: ${money(r.easPlanPrice)} a month, counted as a fixed cost.`)
  if (r.easUpdatePerUser)
    notes.push(
      `EAS Update is free for the first ${r.easIncludedUpdateUsers.toLocaleString('en-US')} monthly active users on this plan, then $0.005 each; it counts free users as well as paying ones.`
    )
  return notes
}

/** Money with enough decimals that a fraction of a cent doesn't show as $0.00. */
function small(n) {
  return Math.abs(n) > 0 && Math.abs(n) < 0.01 ? money(n, 4) : money(n)
}
