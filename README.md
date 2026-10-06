# App Suite

Skills for Claude Code and Codex that help you build mobile apps quickly: find a niche worth building in, check the idea holds up, and get it through App Store and Google Play review.

| Skill | Status | What it does |
|---|---|---|
| `aso-research` | Available | Keyword and niche research from free store data. It finds the phrases people actually search, sizes up the apps ranking for them, spots the gaps, and suggests store listing wording within each store's character limits |
| `vet-app-idea` | Available | Scores an idea go / maybe / no-go on demand, competition, money, stack fit, policy risk and build size, with the evidence for each, then works through any no-go with you until it's fixed or shelved. Keeps one idea file per idea |
| `store-review` | Available | A pre-submission review of an Expo project against Apple's App Review Guidelines and Google Play's policies: blockers, risks and console tasks, each with its guideline, the evidence in the code, and the fix. It checks Apple's live guidelines for changes since its rules were written |

## Install

**Claude Code**

```sh
claude plugin marketplace add VagrantApe/app-suite && claude plugin install app-suite@app-suite
```

Or, inside Claude Code: `/plugin marketplace add VagrantApe/app-suite`, then `/plugin install app-suite@app-suite`.

**Codex**

```sh
codex plugin marketplace add VagrantApe/app-suite && codex plugin add app-suite@app-suite
```

Restart Codex afterwards so it picks up the skills.

**Other agents** that read the [Agent Skills](https://agentskills.io) format can use the `skills/` folder directly: copy or symlink `skills/aso-research`, `skills/vet-app-idea` and `skills/store-review` into the agent's skills folder (for Codex without plugins, `~/.agents/skills/`). Keep the three together; they use each other's scripts.

**Requires** Node.js 18 or newer on your PATH (the scripts are plain Node with no npm packages), and network access for keyword research and the guideline check. Codex's sandbox blocks the network by default: approve it when asked, or set `sandbox_workspace_write.network_access = true` in `~/.codex/config.toml`.

**Updating:** in Claude Code, `claude plugin update app-suite@app-suite`. In Codex, `codex plugin marketplace upgrade app-suite && codex plugin add app-suite@app-suite`. Restart either afterwards.

## Use it

Just ask. For example:

- "Is there room for an app that reminds you to water your houseplants?"
- "Find keywords for my meal-planning app and suggest an App Store name, subtitle and keyword field."
- "Which Google Play search terms should an ADHD habit tracker target in the UK?"
- "I want to build a habit tracker for people with ADHD at $3.99 a month. Is it worth building?"
- "Re-check my shelved plant-watering idea."
- "I'm about to submit my app to the App Store and Google Play. Will it pass review?"

Keyword research saves a folder with `report.md`, the evidence tables, the raw data, and `report.html`, a readable page it opens in your browser. Vetting saves an idea file (markdown, plus a readable `.html`) that it picks up again next time you ask about the same idea. A store review saves a dated report in the app's project.

### Settings

| Setting | Default | What it does |
|---|---|---|
| Research folder (`research_dir`) | `research/` in the current project | Where keyword research is saved |
| Ideas folder (`ideas_dir`) | `ideas/` in the current project | Where idea files are kept |
| Build stack (`stack`) | Expo, Firebase, RevenueCat, EAS Hosting | What you build with, for the stack-fit verdict |
| Reviews folder (`reviews_dir`) | `store-review/` in the app's project | Where store reviews are saved |

All are optional. Where to set them:

- **Claude Code:** `/config`, or when installing: `claude plugin install app-suite@app-suite --config research_dir=~/app-research`.
- **Codex and other agents:** Codex plugins have no settings of their own, so the skills read `~/.config/app-suite/settings.json` instead. Leave out anything you're happy with:

```json
{
  "research_dir": "~/app-research/research",
  "ideas_dir": "~/app-research/ideas",
  "reviews_dir": "~/app-research/reviews",
  "stack": "Expo, Supabase, RevenueCat, EAS Hosting"
}
```

Claude Code reads that file too when a setting isn't set in `/config`, so one file can serve both.

## What the data is, and isn't

- **No search volumes.** Neither store publishes them. Demand comes from autocomplete order (stores suggest popular phrases first), and competition from the top apps' ratings, installs and update dates. Reports say so, and never invent volumes.
- **Unofficial sources.** The scripts read the stores' public search suggestions, Apple's iTunes Search API and Google Play's public web pages. These aren't supported APIs: they can change without notice, and automated access sits in a grey area of the stores' terms. The scripts keep it light: a few requests at a time, paced, with a 24-hour cache in `~/.cache/app-suite/aso`. Use it for research, not bulk collection.
- **Ratings shown are the stores' own,** as of the run date. Small Play apps hide their ratings count; those show as "–" and are judged by installs.

## Develop

```sh
git clone https://github.com/VagrantApe/app-suite && cd app-suite
claude --plugin-dir .                       # Claude Code: load the plugin from this checkout
codex plugin marketplace add .              # Codex: add this checkout as a marketplace, then: codex plugin add app-suite@app-suite
node skills/aso-research/scripts/suggest.mjs "plant care" --expand
node skills/aso-research/scripts/serp.mjs "plant watering schedule" "plant care"
node --test tests/*.test.mjs skills/*/tests/*.test.mjs
node skills/vet-app-idea/scripts/unit-economics.mjs --price 4.99 --period month --cost photo=0.04
node skills/store-review/scripts/scan.mjs skills/store-review/tests/fixtures/bad-app
node skills/store-review/scripts/drift.mjs
claude plugin validate .claude-plugin/plugin.json --strict
```

The plugin has two manifests that must agree (a test checks): `.claude-plugin/plugin.json` for Claude Code and `plugin.json` for Codex and other [Agent Plugins](https://agent-plugins.org) clients, with matching marketplaces in `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`.

`skills/aso-research/evals/` holds the test prompts used with the `skill-creator` skill.

### Adding a paid ASO provider

A provider is a module in `skills/aso-research/scripts/lib/` exporting `id`, `suggest(term, country)` and `search(term, country, limit)` (see `apple.mjs`), registered in `PROVIDERS` in `lib/cli.mjs`. A paid one would also fill `volume` and `difficulty` on keywords, which the skill would prefer over the autocomplete proxy.

## License

MIT. Built by [Craig Lucksted](https://github.com/VagrantApe).
