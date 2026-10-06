# Reading the research signals

What each field in the scripts' JSON means, the thresholds behind the labels, and the traps. The thresholds live in `scripts/lib/analyze.mjs` (`THRESHOLDS`), and every `serp.mjs` result repeats them, so a report can always say which rules it used.

## From `suggest.mjs`

| Field | Meaning |
|---|---|
| `apple`, `play` | The phrase's best position in that store's autocomplete (1 = suggested first), or `null` when not suggested. Positions are popularity order among phrases sharing a prefix. Comparing ranks across different prefixes is rough. |
| `inBoth` | Suggested by both stores. Demand on both platforms is the more trustworthy kind. |
| `via` | `seed` if it came from a seed itself, `expand` if from seed + a letter. Expansion phrases are the long tail: lower demand, usually easier. |

Apple's list mixes in **app names**, which are titles with a colon or dash, brand words, or "llc". They tell you which apps are popular enough to be searched by name. Treat them as competitors, not keywords.

Play's suggestions are requested in English (`hl=en`) even for non-English storefronts. For a non-English market, add seeds in the local language.

## From `serp.mjs`: the summary per keyword and store

| Field | Meaning | Threshold |
|---|---|---|
| `results` | How many apps were read (up to `--limit`) | |
| `medianRatings` | The middle app's ratings count, which shows how established a typical ranking app is. It counts only apps that show a ratings count. | low under 500, high from 10,000 |
| `ratingsHidden` | Apps whose ratings count the store doesn't show (Play hides it for small apps). Unknown, not zero: they're left out of the median and judged by installs. | weak under 10K installs |
| `leader` | The app with the most ratings, the one to beat or route around | |
| `titleMatches` | Apps whose title contains every word of the phrase. Many matches means the phrase is fought over; few means it's under-targeted. | crowded from 7; under-targeted at 2 or fewer |
| `weak` | Under 500 ratings (or, with the count hidden, under 10K installs), or rated under 4.0 | |
| `stale` | Not updated in 365 days, a sign of abandonment | |
| `beatable` | Weak or stale (each app counted once) | "mostly beatable" when at least half |
| `newcomers` | Released in the last 365 days (Apple only; Play pages don't give a release date). Several means the niche is active, which could be opportunity or a gold rush. | signal from 3 |
| `paid` | Apps with an upfront price. Many suggests users here pay, or the category resists free-plus-subscription. | signal from 3 |
| `competition` | The label, decided in this order: | |

1. `none`: no apps came back.
2. `high`: median ratings of 10,000 or more; or at least 5 title matches with median ratings of 2,000 or more, while the field isn't mostly beatable.
3. `low`: median ratings under 500, or mostly beatable.
4. `medium`: everything else.

`installs` (Play only) is Google's download bucket ("100K+"), and `installsMin` is its lower bound as a number.

## What makes a gap

The best opportunity is a phrase with:

1. **Demand**: suggested in the top 3 or so, ideally in both stores;
2. **A beatable field**: competition low or medium, with several weak or stale apps;
3. **Room in titles**: few title matches, so an app named for the phrase stands out.

Then check the apps behind the numbers:

- **A big publisher's stale app** still has brand pull. "Stale" is a weaker signal there than for a hobby app.
- **A store with high competition and another with low** is common. It's a real finding, so say which store to launch on first.
- **No results, or a tiny field, for a phrase that autocompletes well** is the rarest and best signal. Double-check it with a second phrasing before celebrating.
- **Seasonal phrases** ("new year resolution") swing through the year. Note the date of the research.

## Traps

- **Apple's order is approximate.** The iTunes Search API ranks close to, but not exactly like, the App Store app's search. Treat Apple top-10s as "who's around", not exact positions.
- **Ratings lag reality.** An app with 300 ratings can have 100K installs. Play's `installs` is the better size signal where it exists.
- **Category words can mislead.** "Journal" alone matches diaries, bullet journals and gratitude journals. Judge relevance by reading the titles, not just the counts.
- **Missing data isn't zero.** If a store failed, say so, rather than reading the gap as "no competition".
