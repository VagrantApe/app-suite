---
idea: <one-line name>
slug: <kebab-case-slug>
# Where the idea is: idea | keyword-research | vet | build | store-review | submit
step: vet
# pending | go | go-with-risks | looping | shelved
verdict: pending
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
country: us
research: <path to the aso-research folder>
criteria:
  demand: { verdict: pending, owner: keyword-research }
  competition: { verdict: pending, owner: keyword-research }
  money: { verdict: pending, owner: idea }
  stack: { verdict: pending, owner: idea }
  policy: { verdict: pending, owner: idea }
  size: { verdict: pending, owner: idea }
# One entry per no-go being worked on; rounds counts the attempts to fix it.
concerns: []
---

# <Idea name>

## Cost analysis
**Bottom line: <go | maybe | no-go>.** <What a heavy user costs a month against the net price after the store's cut, as a share; and the fix if it's over the line.>

<The table from unit-economics.mjs. If there's a no-go or maybe, a second table of the pricing scenarios that would fix it (price, caps, cheaper inputs), each with its band.>

<The assumptions behind every number: the costs per use and where they came from, uses per day, the store cut.>

## The idea
<One paragraph: who it's for, the problem it solves, the core feature, and how it makes money.>

## Verdict
**<Go | Go, with known risks | Looping on <criterion> | Shelved>.** <One or two sentences: why, and what happens next.>

## Scorecard
| Criterion | Verdict | Why |
|---|---|---|
| Money | | |
| Demand | | |
| Competition gap | | |
| Stack fit | | |
| Policy risk | | |
| Solo-build size | | |

## Known risks
- <One bullet per maybe: the risk, and what would turn it into a go.>

## Open concerns
- <One bullet per no-go being worked on: what's wrong, the step it loops back to, and the round (1 of 3).>

## Keyword research
<The research's verdict, its best keywords and its gaps, with a link to the full research folder.>

## First version
- **In:** <the features the first release needs>
- **Later:** <what waits>

## Log
- <YYYY-MM-DD>: <what happened, newest first>
