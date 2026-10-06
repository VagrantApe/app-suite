---
name: aso-research
description: App Store Optimization (ASO) keyword research and niche-finding for mobile apps on the App Store and Google Play, from free public data (store autocomplete, iTunes Search, Play listings). Finds the phrases people actually search, sizes up the apps ranking for them, and spots gaps (weak, stale or off-target competitors) worth building into. Use whenever someone wants app keyword ideas, wants to know whether a niche or app category is crowded, asks what to call an app or what to put in its title, subtitle or keyword field, wants to scout competitors for an app idea, or asks "is there room for an app that does X", even if they never say "ASO". Also used by vet-app-idea to judge demand and competition.
---

# ASO research

Find where people search and nobody serves them well. The output is a short report: which phrases have demand, how beatable the apps ranking for them are, the gaps worth building into, and listing wording that targets them.

The data is free and public, which means **proxies, not volumes**. Neither store publishes search volume. What we have:

- **Autocomplete rank**: stores order search-box suggestions by popularity, so a phrase suggested first for its prefix is searched more than one suggested eighth. It's ordinal, not a count.
- **The top apps for a phrase**: their ratings counts, ratings, update dates and installs (Play only) show how established the field is.

Say so in the report. A confident "4,200 searches a month" would be invented; "suggested first in both stores, and 8 of the top 10 apps are weak or stale" is true and actionable.

## Where things are

- **Scripts:** `${CLAUDE_PLUGIN_ROOT}/skills/aso-research/scripts/`. Below, `scripts/` means that folder; run them as `node "<that folder>/suggest.mjs" ...`. (If that path shows up literally, with the `${...}` still in it, the skill wasn't loaded as a plugin, and the scripts are in the `scripts/` folder next to this file.)
- **Reference:** `${CLAUDE_PLUGIN_ROOT}/skills/aso-research/references/signals.md`, called `references/signals.md` below.
- **Research folder:** `${user_config.research_dir}`. If that's empty or shows up literally, use `research/` in the current project. Each topic gets its own subfolder there.

## Scripts

Both research scripts need only Node 18+, and cache responses for 24 hours (`--fresh` skips the cache). They print **readable markdown tables**. That's what you read, and what a person can read too.

| Script | Prints | Cost |
|---|---|---|
| `node scripts/suggest.mjs <seed>... [--expand]` | One table: every suggested phrase with its autocomplete rank in each store | 1 request per seed per store; `--expand` adds 26 (seed + a…z) |
| `node scripts/serp.mjs <keyword>...` | An overview table (competition, median ratings, title matches, beatable apps, leader per keyword and store), then each keyword's gap signals and top 5 apps | About 12 requests per keyword (Play fetches each listing) |

Common options:
- `--country <cc>`: the storefront (default `us`; run `--help` for the list).
- `--stores apple` or `--stores play`: one store only.
- `--out data/<name>.json`: also save the full raw data.
- `--from data/<name>.json`: re-print saved data without fetching.
- `--rows <n>`: list more apps per keyword.
- `--json`: print JSON instead of tables (only when another script needs it).

**Where files go.** The report is the document a person reads, so keep everything else out of their way:
- Save raw data with `--out` into a `data/` folder next to the report.
- Save the printed tables as `suggestions.md` and `rankings.md` beside the report, as the evidence behind it.
- Don't save JSON printouts or summaries anywhere else.

A ratings count of "–" means the store doesn't show one; Play hides it for small apps. It's unknown, not zero. Those apps are judged by installs instead (`signals.md` explains).

## Workflow

### 1. Frame the search

Work out what's being researched: an app idea, a category, or a competitor to pick apart. Note the country (US unless told otherwise). If an idea file exists for it (written by `vet-app-idea`, next to the research folder), read it first, since earlier rounds' keywords and concerns are there.

### 2. Write 5 to 10 seeds

Seeds are short phrases (two or three words) that the *user* would type, not marketing language. Cover different angles:

- **The category**: "plant care", "habit tracker"
- **The job to be done**: "water plants", "track habits"
- **The problem**: "dying plants", "can't stay consistent"
- **The result wanted**: "healthy plants", "build habits"

Avoid competitor brand names as seeds. People searching a brand want that app.

### 3. Expand them

Run `suggest.mjs` on all the seeds (`--out data/suggest.json`). Then run it again with `--expand` on the two or three most central seeds (`--out data/suggest-expand.json`), to surface the long tail.

Clean the list before going further:

- **Separate app names from phrases.** Apple mixes app names into its suggestions ("olmi: plant watering tracker", "plantly - plant watering care", anything with "llc"). They're competitors, not keywords. Note them for the competitor section, and drop them from the keyword list.
- Drop phrases that are off-topic for the idea, and merge plurals and near-duplicates.

### 4. Pick 8 to 15 keywords for a closer look

Mix two kinds:

- **Head phrases**: ranked 1 to 3 in both stores. They have the most demand and usually the most competition.
- **Long-tail phrases**: narrower and suggested lower or by one store only. They're where small apps win.

Prefer phrases that appear in both stores (`inBoth`). Demand that shows up on both platforms is more trustworthy.

### 5. Look at who ranks

Run `serp.mjs <keywords> --out data/serp.json`, and save what it prints as `rankings.md`. Read each keyword's line in the overview, and its gap signals, against `references/signals.md`, which explains every field, the thresholds behind the labels, and the traps (for example, the iTunes Search API's order isn't exactly the App Store app's).

A **gap** is demand plus a beatable field: a phrase suggested near the top, where the apps ranking for it are weak, stale, few in number, or not really targeting the phrase. Check the label against the apps themselves before calling something a gap: a "low" label driven by stale apps from a big publisher is different from one driven by hobby apps.

### 6. Write the report

Use this structure, so reports can be compared across ideas and over time:

```markdown
# ASO research: <topic>

<country> · <date> · free sources (autocomplete rank and top-10 apps; no search volumes)

## Verdict
Two or three sentences: the best opportunity, with its evidence, and the phrase to avoid.

## Keywords
| Keyword | Apple rank | Play rank | Apple competition | Play competition | What stands out |
(Ranks are autocomplete positions; "-" means not suggested. Sort by opportunity.)

## Gaps and niches
- One bullet per gap: the phrase, the evidence (numbers from the summaries), and what an app would need to do to win it.

## Competitors to know
| App | Store | Ratings | Rating | Installs | Last updated | Why it matters |

## Listing recommendations
**App Store:** name (30 characters), subtitle (30), keyword field (100).
**Google Play:** title (30), short description (80), and the opening of the full description.

## Caveats
What the proxies can't tell us here, and anything that looked odd in the data.
```

For the listing recommendations, use each store's rules (as of Oct 2026):

- **App Store:**
  - App name 30 characters, subtitle 30 characters, keyword field 100 characters.
  - The keyword field is comma-separated with no spaces after the commas.
  - Don't repeat words already in the name or subtitle; Apple combines them.
  - Use singular forms, skip "app" and "free", and leave out every other company's brand: competitors, and also services the app integrates with. Apple rejects other companies' trademarks in metadata; name an integration in the description instead.
- **Google Play:**
  - Title 30 characters, short description 80 characters, full description 4,000 characters.
  - Play indexes the description, so use the main phrase naturally three to five times.
  - Keyword stuffing, or ranking claims like "best" or "#1", break Play's metadata policy.

Show the character count next to each recommended string.

### 7. Save it and show it

Research for one topic lives in one folder, `<research folder>/<date>-<slug>/`, holding `report.md`, `suggestions.md`, `rankings.md` and `data/`. Create it (and its `data/`) at the start, and run the scripts from inside it, so the `--out data/...` paths land there.

Then build the readable page and open it: `node scripts/render.mjs <folder> --open`. It writes `report.html` beside the report, with real tables, and with the suggestions and rankings as sections that open on click. That page is what the person reads; tell them its path. Markdown tables look like a wall of pipes and dashes outside a markdown viewer, so don't point them at the `.md` files.

If an idea file exists for this app, also replace its "Keyword research" section with the report's Verdict, Keywords and Gaps, and link the research folder.

## When something fails

The stores' endpoints are unofficial and occasionally change. If a script reports a failure for one store, finish with the other and say which data is missing. Don't guess the missing numbers. If one store fails every time, the parsing in `scripts/lib/apple.mjs` or `scripts/lib/play.mjs` probably needs updating against the current page.
