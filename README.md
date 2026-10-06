# App Suite

Claude Code skills for building mobile apps quickly: find a niche worth building in, check the idea holds up, and get it through App Store and Google Play review.

| Skill | Status | What it does |
|---|---|---|
| `aso-research` | Available | Keyword and niche research from free store data. It finds the phrases people actually search, sizes up the apps ranking for them, spots the gaps, and suggests store listing wording within each store's character limits |
| `vet-app-idea` | Available | Scores an idea go / maybe / no-go on demand, competition, money, stack fit, policy risk and build size, with the evidence for each, then works through any no-go with you until it's fixed or shelved. Keeps one idea file per idea |
| `store-review` | Coming | A pre-submission audit of an Expo project against Apple's and Google's rules, with each finding citing its guideline |

## Install

```sh
claude plugin marketplace add VagrantApe/app-suite && claude plugin install app-suite@app-suite
```

Or, inside Claude Code: `/plugin marketplace add VagrantApe/app-suite`, then `/plugin install app-suite@app-suite`.

**Requires** Node.js 18 or newer on your PATH (the research scripts are plain Node with no npm packages).

## Use it

Just ask. For example:

- "Is there room for an app that reminds you to water your houseplants?"
- "Find keywords for my meal-planning app and suggest an App Store name, subtitle and keyword field."
- "Which Google Play search terms should an ADHD habit tracker target in the UK?"
- "I want to build a habit tracker for people with ADHD at $3.99 a month. Is it worth building?"
- "Re-check my shelved plant-watering idea."

Keyword research saves a folder with `report.md`, the evidence tables, the raw data, and `report.html`, a readable page it opens in your browser. Vetting saves an idea file (markdown, plus a readable `.html`) that it picks up again next time you ask about the same idea.

### Settings

| Setting | Default | What it does |
|---|---|---|
| Research folder (`research_dir`) | `research/` in the current project | Where keyword research is saved |
| Ideas folder (`ideas_dir`) | `ideas/` in the current project | Where idea files are kept |
| Build stack (`stack`) | Expo, Firebase, RevenueCat, EAS Hosting | What you build with, for the stack-fit verdict |

Change it with `/config`, or when installing: `claude plugin install app-suite@app-suite --config research_dir=~/app-research`.

## What the data is, and isn't

- **No search volumes.** Neither store publishes them. Demand comes from autocomplete order (stores suggest popular phrases first), and competition from the top apps' ratings, installs and update dates. Reports say so, and never invent volumes.
- **Unofficial sources.** The scripts read the stores' public search suggestions, Apple's iTunes Search API and Google Play's public web pages. These aren't supported APIs: they can change without notice, and automated access sits in a grey area of the stores' terms. The scripts keep it light: a few requests at a time, paced, with a 24-hour cache in `~/.cache/app-suite/aso`. Use it for research, not bulk collection.
- **Ratings shown are the stores' own,** as of the run date. Small Play apps hide their ratings count; those show as "–" and are judged by installs.

## Develop

```sh
git clone https://github.com/VagrantApe/app-suite && cd app-suite
claude --plugin-dir .                       # load the plugin from this checkout
node skills/aso-research/scripts/suggest.mjs "plant care" --expand
node skills/aso-research/scripts/serp.mjs "plant watering schedule" "plant care"
node --test skills/*/tests/*.test.mjs
node skills/vet-app-idea/scripts/unit-economics.mjs --price 4.99 --period month --cost photo=0.04
claude plugin validate .claude-plugin/plugin.json --strict
```

`skills/aso-research/evals/` holds the test prompts used with the `skill-creator` skill.

### Adding a paid ASO provider

A provider is a module in `skills/aso-research/scripts/lib/` exporting `id`, `suggest(term, country)` and `search(term, country, limit)` (see `apple.mjs`), registered in `PROVIDERS` in `lib/cli.mjs`. A paid one would also fill `volume` and `difficulty` on keywords, which the skill would prefer over the autocomplete proxy.

## License

MIT. Built by [Craig Lucksted](https://github.com/VagrantApe).
