# The six criteria

Each criterion gets **go**, **maybe** or **no-go**, plus the reasoning and the evidence behind it. A verdict without evidence isn't a verdict; if the evidence can't be had, say what's missing and score **maybe**.

| Criterion | Question | Owner of a no-go |
|---|---|---|
| Money | Does the price cover what each user costs, after the store's cut? | The idea |
| Demand | Do people search for what this app does? | Keyword research |
| Competition gap | Can a new app win a place in those searches? | Keyword research |
| Stack fit | Can it be built on the configured stack without fighting it? | The idea |
| Policy risk | Will Apple and Google accept it, and at what compliance cost? | The idea |
| Solo-build size | Can one developer with an AI agent ship a first version in weeks? | The idea |

The **owner** is the step a no-go loops back to. A demand or competition problem goes back to keyword research (new angles, narrower phrases). Everything else goes back to the idea itself (change the price model, cut a feature, pick another audience).

---

## Demand

Evidence: `aso-research`'s suggestions and rankings for the idea's core phrases. A core phrase is what the target user would type to find this exact app, not the category.

| Verdict | When |
|---|---|
| **go** | At least one core phrase is suggested in the top 3 for its prefix in both stores, or top 1 in one |
| **maybe** | Core phrases appear only as long-tail suggestions (rank 4+), only in one store, or demand rides on a broader category word |
| **no-go** | No core phrase autocompletes in either store, even after expanding with `--expand` |

Autocomplete rank is a popularity order, not volume. A phrase can be suggested first and still be small; that's fine for an indie app.

## Competition gap

Evidence: `aso-research`'s rankings for the phrases that passed Demand.

| Verdict | When |
|---|---|
| **go** | At least one phrase with demand has **low** or **medium** competition with several beatable apps, or a title gap (few apps with the phrase in their title) in a store where it's suggested |
| **maybe** | Gaps exist only in the long tail or in one store; or the niche is a gold rush (many newcomers in the last year, all small); or leaders are weak but well funded |
| **no-go** | Every phrase with demand is **high** in both stores, with almost nothing beatable and the phrase already in most leaders' titles |

Read the apps, not just the label. A "high" label driven by one giant in a field of tiny title-matched apps is a gap (see `aso-research`'s signals reference).

## Money

Evidence: the price model the person intends (or the category norm from the research), and the cost of serving one user. Run the numbers with `scripts/unit-economics.mjs`; don't estimate them in your head. "Net" is what's left of the price after the store's cut and RevenueCat's 1% (leave RevenueCat out with `--no-revenuecat` if the app bills another way).

What goes into the cost per use:
- AI calls (tokens or images), per-request APIs, SMS, maps, transcription
- Storage and bandwidth that grow with each user
- Anything billed per user by a service (auth over a free tier, analytics seats)

When the app uses AI, `scripts/ai-costs.mjs` prices one use on every current text and image model (from `references/ai-prices.json`), so the verdict can name the cheapest model that does the job, and what the planned one costs by comparison.

What the script adds on its own (as of Oct 2026; check expo.dev/pricing and revenuecat.com/pricing if a verdict is close):
- **RevenueCat:** 1% of revenue once past $2,500 a month.
- **Expo EAS:** the plan as a fixed monthly cost (Starter $19, Production $199), EAS Update at $0.005 per monthly active user past the plan's included users (3,000 on Starter), and EAS Hosting at $2 per million requests past 100,000 a month. EAS Update counts free users too, so an app with many free users pays it for them.

| Verdict | When |
|---|---|
| **go** | At heavy use, variable cost is under 30% of the net (after the store's cut and RevenueCat), and the category has a paying precedent (paid apps or subscriptions among the leaders) |
| **maybe** | Heavy-use cost is 30–60% of net; or a cost is unknown; or every competitor is free and the paywall is unproven in this niche |
| **no-go** | Heavy-use cost is above 60% of net or exceeds it; or the plan is a one-time or lifetime price for a cost that continues, and a heavy user uses up the net price within 2 years (the script applies this; 2 to 5 years is a maybe); or the only model is one the stores don't allow |

Store cuts (as of Oct 2026; confirm in each store's current terms):
- **Apple:** 15% for developers in the Small Business Program (under $1M a year). Otherwise 30%, dropping to 15% on a subscription after the subscriber's first year.
- **Google Play:** 15% on subscriptions, and on the first $1M a year of other revenue; otherwise 30%.

Use 15% for an indie app unless told otherwise.

Lessons that recur:
- **Per-use costs need caps.** Rate limits per user per day keep a heavy user from eating a month's revenue. A plan that relies on caps is fine; say what they are.
- **Free tiers end.** If the economics only work on a service's free tier, score maybe, and name the tier limit.
- **Weekly plans exist for a reason.** Many categories price weekly; check the competitors' prices before calling a price "too high".

## Stack fit

Evidence: the idea's features against the configured stack (see the skill's "Where things are" section; the default is Expo + Firebase + RevenueCat + EAS Hosting).

| Verdict | When |
|---|---|
| **go** | Every core feature maps to the stack or to a maintained Expo module |
| **maybe** | Needs one extra service (for example Redis for rate limits, a vector store), a config plugin, or a native module that exists but is lightly maintained |
| **no-go** | A core feature fights the stack: long-running background work beyond what iOS allows, heavy server compute the hosting can't run, real-time multiplayer at scale, hardware or OS access Expo can't reach, or an essential library that only exists for native code with no Expo route |

Things to check on the default stack:
- **EAS Hosting** runs on Cloudflare Workers: no local storage, no long jobs, request time limits. Anything stateful needs another service.
- **Background tasks** on iOS are opportunistic. "Runs every hour in the background" isn't a promise iOS keeps.
- **Expo Go** won't run custom native code; a development build will. That's fine, but it's a setup step.

## Policy risk

Evidence: the idea's category and features against `references/policy-risks.md`.

| Verdict | When |
|---|---|
| **go** | None of the flagged categories apply, or only ones every app handles (account deletion, privacy labels) |
| **maybe** | A flagged category applies, with a known compliance path: user-generated or AI content (reporting and moderation), health and wellness (no diagnosis claims), subscriptions (clear terms and restore), kids in the audience (no third-party ads or analytics) |
| **no-go** | The core feature is disallowed or gated behind licences an indie can't get: real-money gambling, medical diagnosis or treatment claims, apps that need a regulated licence, or a saturated category where the app is a near-copy (Apple's spam rule, 4.3) |

Name the guideline or policy for each risk, so `store-review` can check it later.

## Solo-build size

Evidence: the idea's screens and features, counted.

| Verdict | When |
|---|---|
| **go** | A first version is about 6 weeks or less for one developer with an AI coding agent: roughly up to 10 screens, one backend, standard auth and payments |
| **maybe** | 6 to 12 weeks; or one hard part (real-time sync, a custom ML model, offline-first with conflict resolution) |
| **no-go** | Over 12 weeks; or it needs things one person can't supply: a large content library, human moderation around the clock, partnerships, or hardware |

List what's in the first version and what waits. Cutting scope is the usual fix for a no-go here.

---

## The overall verdict

- **No-go** on any criterion: the idea is **looping**. Work through it (see the skill's loop), then re-score only that criterion.
- No no-gos, and **maybe**s: **go, with known risks**. Each maybe is written down as a risk, with what would turn it into a go.
- All **go**: **go**.

Don't average. One no-go is enough to stop, and five gos don't cancel it.
