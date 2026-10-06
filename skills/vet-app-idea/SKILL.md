---
name: vet-app-idea
description: Decides whether a mobile app idea is worth building. Scores it go / maybe / no-go on demand, competition gap, money (unit economics after the store's cut), fit with the build stack, App Store and Google Play policy risk, and solo-build size, using real keyword research, then works through any no-go with the person until it's fixed or shelved. Keeps one idea file per idea so it can be re-vetted later. Use whenever someone has an app idea and asks if it's any good, worth building, viable, or "would this make money", wants a second opinion before starting an app, wants to compare app ideas, or wants to re-check a shelved or "maybe" idea, even if they never say "vet".
---

# Vet an app idea

Decide whether an idea is worth building, with evidence, and when it isn't, work out with the person what would make it worth building.

The output is an **idea file**. It opens with the **cost analysis**, front and center: what one user costs against what the app keeps after the store's cut. Then come the idea, the verdict, a scorecard of six criteria (each go / maybe / no-go with its reasoning), the keyword research, what the first version includes, and a dated log. The file is also the loop's memory: open it again in a month and the skill picks up where it left off.

## Where things are

- **This skill's folder** is the one this `SKILL.md` is in. Below, `references/`, `scripts/` and `assets/` mean folders there; run scripts by their full path, as `node "<skill folder>/scripts/unit-economics.mjs" ...`. (In Claude Code that's `${CLAUDE_PLUGIN_ROOT}/skills/vet-app-idea/`; in Codex or another agent, the folder it loaded the skill from.) The other App Suite skills are next to it: `../aso-research/`, `../vet-app-idea/`, `../store-review/`.
- **Ideas folder:** use the first of these that's set:
  1. Claude Code's plugin setting: `${user_config.ideas_dir}` (skip it if it's empty, or shows up literally with the `${...}` still in it);
  2. `ideas_dir` in `~/.config/app-suite/settings.json`, if that file exists (agents without plugin settings, like Codex, use this);
  3. `ideas/` in the current project. One file per idea: `<slug>.md`.
- **The stack ideas are built on:** use the first of these that's set:
  1. Claude Code's plugin setting: `${user_config.stack}` (skip it if it's empty, or shows up literally with the `${...}` still in it);
  2. `stack` in `~/.config/app-suite/settings.json`, if that file exists (agents without plugin settings, like Codex, use this);
  3. Expo (React Native) with Expo Router, Firebase for auth, database and storage, RevenueCat for subscriptions, and EAS Build plus EAS Hosting for the API.
- **Keyword research** comes from this plugin's `aso-research` skill, next to this one. Use it as a skill if your agent can (`app-suite:aso-research` in Claude Code, `$aso-research` in Codex); otherwise read `../aso-research/SKILL.md` and follow it. It saves to its own research folder.

## The six criteria

`references/criteria.md` defines each one: what go, maybe and no-go mean, the evidence each needs, and the step that owns a no-go. Read it before scoring.

| Criterion | Evidence from | No-go loops back to |
|---|---|---|
| Money | `scripts/unit-economics.mjs` | The idea |
| Demand | `aso-research` suggestions | Keyword research |
| Competition gap | `aso-research` rankings | Keyword research |
| Stack fit | The idea's features against the stack | The idea |
| Policy risk | `references/policy-risks.md` | The idea |
| Solo-build size | The first version's screens and features | The idea |

Scores are verdicts with reasons, not numbers. A number out of 100 would look more precise than these signals are; a verdict with its reasoning is something the person can argue with.

## Workflow

### 1. Find or start the idea file

Pick a short slug for the idea. If `<ideas folder>/<slug>.md` exists, read it first: its `step`, its verdicts and its open concerns say where things stand, and its log says what was already tried. Resume from there rather than starting over.

Otherwise, start one from `assets/idea-template.md`.

### 2. Understand the idea

Write "The idea" and "First version" sections from what the person said. If they point at a codebase, read it: the README, any CONTEXT or AGENTS file, `app.json` and `package.json` say what it does better than a description would.

Ask only for what would change a verdict and can't be found, in one message, with your assumption for each so they can just say yes. Usually that's at most:
- the price model (subscription and price, one-time, free with ads);
- what costs money each time someone uses it (AI calls, images, APIs).

If the person wants a one-shot report and isn't around to answer, state the assumptions in the file and carry on.

### 3. Get the keyword research

If the research folder already holds research for this idea that's under 30 days old, reuse it. Otherwise run the `aso-research` skill on the idea, for the store(s) and country the person cares about. It saves its own folder; put that path in the idea file's `research` field.

Copy the research's verdict, best keywords and gaps into the "Keyword research" section. The demand and competition verdicts come straight from it.

### 4. Score the other four

- **Money:** run `node scripts/unit-economics.mjs` with the price and the per-use costs (`--help` lists the options). The script takes the store's cut and RevenueCat's 1% off the price, and counts Expo's EAS costs: the plan as a fixed monthly cost (Starter, $19, unless told otherwise), EAS Update per active user, and EAS Hosting per API request. Match it to the app: `--requests <n>` for the API calls each use makes to an EAS Hosting backend, `--no-eas-update` if it doesn't ship updates over the air, `--eas production` for a bigger plan, and `--eas none` / `--no-revenuecat` if the stack doesn't use them. Put other fixed monthly costs (a database plan, a domain) in `--fixed`. Use the heavy-use figure for the verdict. This is the **Cost analysis**, the first section of the idea file and the first thing the person reads: its bottom line, the script's table, and the assumptions behind each number. When the bottom line is a maybe or no-go, run the script again for the fixes worth considering (a higher price, a cap, a cheaper input) and add them as a scenarios table, each with its band, so the way out is visible next to the problem. If a cost isn't known, look it up (the AI provider's price page, the API's pricing) or score **maybe** and say what's missing.
- **AI features:** when the app calls an AI model, run `node scripts/ai-costs.mjs` too: it prices one use on every current model from Anthropic, OpenAI, Google and xAI (text and images), pairs each text model with an image model, and runs each pairing through the same cost analysis. Estimate the tokens per call from the prompt and the user content (or calibrate to a measured cost if the person has one), and pass the same price and caps as the main run. Add its "By model" table to the Cost analysis under the heading "AI model costs", and say which model the person plans to use and which would be cheapest at acceptable quality. Its prices live in `references/ai-prices.json` with an as-of date; if that's more than a couple of months old, or a verdict hinges on one price, check the provider's page and update the file.
- **Stack fit:** go through the first version's features against the stack. Name any extra service or native module needed.
- **Policy risk:** check the idea's category and features against `references/policy-risks.md`, and name the guideline for each risk.
- **Solo-build size:** count the first version's screens and features, and list what waits for later.

### 5. Write the verdict

Fill in the scorecard, then the overall verdict (from `references/criteria.md`):
- **No-go** on any criterion: **looping**. Add each no-go to "Open concerns" and to the `concerns` list in the header, at round 1.
- No no-gos: **go, with known risks** if there are maybes, each written under "Known risks" with what would make it a go; otherwise **go**.

Update the header (`step`, `verdict`, each criterion's verdict, `updated`), add a log entry, and render the file so it's readable: `node "<skill folder>/../aso-research/scripts/render.mjs" <idea file> --open`. Tell the person the result in two or three sentences, starting with the cost analysis's bottom line (what a heavy user costs against the net, and the band), then the overall verdict, and where the file is.

### 6. The loop: work through each no-go

A no-go isn't the end; it's a question about what would have to change. Take the no-gos one at a time:

1. **Hash it out with the person, one question at a time.** Each question comes with your recommended answer and the options that would flip the verdict. For example, for Money: "Cap AI generations at one a day (recommended), raise the price to $6.99, or drop the image feature?" For Competition: "Target the narrower 'plant watering schedule' instead of 'plant care'?"
2. **When an answer changes the idea,** update "The idea" and "First version" to match.
3. **Re-score only that criterion.** If it's owned by keyword research, rerun `aso-research` on the new angle. If it's owned by the idea, rerun just what that criterion needs (for example, the economics script with the new price). Don't re-vet everything.
4. **Log the round:** what was tried and what the verdict became. Increment the concern's `rounds`.

Stop on a concern when it reaches **go** or **maybe** (a maybe becomes a known risk and the idea moves on).

**After 3 rounds on the same no-go without it moving, suggest shelving the idea,** with the reason in one sentence. The person decides. Shelving sets `verdict: shelved` and keeps the whole file. Ideas get re-vetted when markets move, and the history saves starting from zero.

If the person isn't there to discuss (a one-shot report), don't invent their answers. Leave each no-go open, and under it write the questions you'd ask, with your recommended answer to each.

### 7. Hand off

When the verdict is go or go-with-risks, set `step: build`. The known risks are the to-do list for building. The policy ones are what `store-review` will check before submission.

## Re-vetting later

When asked to re-check an idea (a shelved one, or a "maybe"), read its file, rerun the keyword research fresh (`--fresh`), re-score every criterion, and log what changed since the last vet, criterion by criterion. Markets move: a niche that was crowded can thin out, and a cost that was too high can drop.
