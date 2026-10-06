// The arithmetic behind the Money criterion, kept apart from the command
// line so it can be tested.

/**
 * RevenueCat's Pro plan (as of Oct 2026): free up to $2,500 a month of tracked
 * revenue, then 1%, measured on the full price before the store's cut. We
 * assume an app past the free tier, so the fee comes off every sale.
 */
export const REVENUECAT = { rate: 0.01, freeUpTo: 2500 }

/**
 * Expo's EAS plans (from expo.dev/pricing, Oct 2026). The plan is a fixed
 * monthly cost. EAS Update charges per monthly active user past the plan's
 * included users, and EAS Hosting per request past 100K a month; we count
 * both as if past the free allowance.
 */
export const EAS = {
  plans: { none: 0, free: 0, starter: 19, production: 199 },
  includedUpdateUsers: { none: 0, free: 1000, starter: 3000, production: 50000 },
  updatePerUser: 0.005,
  hostingPerRequest: 2 / 1e6
}

export function compute({
  price,
  period,
  cut,
  costs,
  uses,
  heavy,
  cap,
  fixed = 0,
  rcRate = REVENUECAT.rate,
  eas = 'starter',
  easUpdate = true,
  requests = 0
}) {
  const DAYS = 365 / 12
  const perUse = costs.reduce((s, c) => s + c.amount, 0)
  const heavyUses = Math.min(heavy ?? uses * 3, cap ?? Infinity)
  const typicalUses = Math.min(uses, cap ?? Infinity)
  // What each user costs a month: their usage, EAS Update, and their API requests on EAS Hosting.
  const usageTypical = perUse * typicalUses * DAYS
  const usageHeavy = perUse * heavyUses * DAYS
  const updatePerUser = easUpdate && eas !== 'none' ? EAS.updatePerUser : 0
  const hostingTypical = requests * typicalUses * DAYS * EAS.hostingPerRequest
  const hostingHeavy = requests * heavyUses * DAYS * EAS.hostingPerRequest
  const costTypical = usageTypical + updatePerUser + hostingTypical
  const costHeavy = usageHeavy + updatePerUser + hostingHeavy
  const easPlanPrice = EAS.plans[eas] ?? 0
  const fixedTotal = fixed + easPlanPrice
  const easDetail = {
    easPlan: eas,
    easPlanPrice,
    easIncludedUpdateUsers: EAS.includedUpdateUsers[eas] ?? 0,
    easUpdatePerUser: updatePerUser,
    requestsPerUse: requests,
    usageTypicalPerMonth: round(usageTypical, 3),
    usageHeavyPerMonth: round(usageHeavy, 3),
    hostingTypicalPerMonth: round(hostingTypical, 4),
    hostingHeavyPerMonth: round(hostingHeavy, 4),
    fixedPerMonth: round(fixedTotal)
  }

  if (period === 'once') {
    // A one-time price buys unlimited months; any ongoing cost eventually exceeds it.
    const storeFee = price * cut
    const rcFee = price * rcRate
    const net = price - storeFee - rcFee
    const monthsCovered = costHeavy > 0 ? net / costHeavy : Infinity
    return {
      model: 'one-time',
      ...easDetail,
      price,
      cut,
      rcRate,
      storeFee: round(storeFee),
      rcFee: round(rcFee),
      net,
      perUse,
      costTypicalPerMonth: round(costTypical),
      costHeavyPerMonth: round(costHeavy),
      heavyMonthsCovered: Number.isFinite(monthsCovered) ? round(monthsCovered, 1) : null,
      // A cost that takes years to use up the price is noise; one that takes months isn't.
      band: monthsCovered < 24 ? 'no-go' : monthsCovered <= 60 ? 'maybe' : 'go',
      why: !Number.isFinite(monthsCovered)
        ? 'No ongoing cost, so a one-time price can work.'
        : monthsCovered > 60
          ? `Ongoing costs are small: a heavy user takes ${round(monthsCovered / 12, 1)} years to use up the ${money(net)} net.`
          : `A one-time price for a cost that continues: a heavy user uses up the ${money(net)} net in ${round(monthsCovered, 1)} months (no-go under 24, maybe up to 60).`
    }
  }

  const perMonth = { week: (price * 52) / 12, month: price, year: price / 12 }[period]
  const storeFee = perMonth * cut
  const rcFee = perMonth * rcRate
  const net = perMonth - storeFee - rcFee
  const shareHeavy = net > 0 ? costHeavy / net : Infinity
  const shareTypical = net > 0 ? costTypical / net : Infinity
  const band = shareHeavy < 0.3 ? 'go' : shareHeavy <= 0.6 ? 'maybe' : 'no-go'
  const marginTypical = net - costTypical
  return {
    model: 'subscription',
    ...easDetail,
    price,
    period,
    cut,
    rcRate,
    grossPerMonth: round(perMonth),
    storeFeePerMonth: round(storeFee),
    rcFeePerMonth: round(rcFee),
    netPerMonth: round(net),
    perUse: round(perUse, 4),
    usesPerDay: { typical: typicalUses, heavy: heavyUses, cap: cap ?? null },
    costTypicalPerMonth: round(costTypical),
    costHeavyPerMonth: round(costHeavy),
    shareTypical: round(shareTypical, 3),
    shareHeavy: round(shareHeavy, 3),
    marginTypicalPerMonth: round(marginTypical),
    breakEvenSubscribers: fixedTotal > 0 ? (marginTypical > 0 ? Math.ceil(fixedTotal / marginTypical) : null) : 0,
    band,
    why: `A heavy user (${heavyUses}/day) costs ${money(costHeavy)} a month, ${pct(shareHeavy)} of the ${money(net)} net: ${
      band === 'go' ? 'under 30%' : band === 'maybe' ? 'between 30% and 60%' : 'over 60%'
    }.`
  }
}

export const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
export const money = (n, d = 2) => `${Number(n) < 0 ? '-' : ''}$${Math.abs(Number(n)).toFixed(d)}`
export const pct = (n) => (Number.isFinite(n) ? `${Math.round(n * 100)}%` : '∞')
