---
name: store-review
description: Pre-submission review of an Expo / React Native app against Apple's App Review Guidelines and Google Play's policies. Scans the project (config, EAS build profiles, dependencies, source) for what gets apps rejected — missing account deletion, social login without Sign in with Apple, no restore purchases, test builds, vague permission text, tracking without consent, AI data sharing, platform names in iOS copy, store-listing limits and trademark use — confirms each finding in the code, cites the exact guideline, and says how to fix it. Use whenever someone is about to submit or update an app on the App Store or Google Play, asks "will this pass review", "is my app ready to submit", "why might Apple reject this", got a rejection and wants a full check, or wants a compliance pass on a mobile app, even if they never say "review".
---

# Store review

Check an app against what Apple and Google actually reject, before a reviewer does. The output is a review report: blockers to fix before submitting, risks to judge, and the console tasks a person has to do, each with the guideline it cites, the evidence in the code, and the fix.

## Where things are

- **This skill's folder** is the one this `SKILL.md` is in. Below, `scripts/` and `references/` mean folders there; run scripts by their full path, as `node "<skill folder>/scripts/scan.mjs" ...`. (In Claude Code that's `${CLAUDE_PLUGIN_ROOT}/skills/store-review/`; in Codex or another agent, the folder it loaded the skill from.) The other App Suite skills are next to it: `../aso-research/`, `../vet-app-idea/`, `../store-review/`.
- **Reviews folder:** use the first of these that's set:
  1. Claude Code's plugin setting: `${user_config.reviews_dir}` (skip it if it's empty, or shows up literally with the `${...}` still in it);
  2. `reviews_dir` in `~/.config/app-suite/settings.json`, if that file exists (agents without plugin settings, like Codex, use this);
  3. `store-review/` in the app's project folder. Each review gets a dated subfolder.
- **The rules:** `references/rules.md`, the single source for what's checked, the citation, the severity and the fix.

## Workflow

### 1. Know what's being reviewed

Find the app's project folder (the one with `package.json` and `app.json` or `app.config.*`). Note which stores it's going to (both unless told otherwise) and whether this is a first submission or an update; a first submission needs the console checks too.

If an idea file exists for the app (from `vet-app-idea`), read its policy-risk notes: they're the risks the person already knows about.

### 2. Check the rules are current

Run `node scripts/drift.mjs`. It compares Apple's live guidelines with the snapshot the rules were written against, section by section. If a section that a rule cites has changed, read the new wording on Apple's page before relying on that rule, and say so in the report. If the page can't be read, note that the check was skipped.

### 3. Scan

Run `node scripts/scan.mjs <project folder> --out <review folder>/data/scan.json` (create the folder first). Add `--listing <file>` if the person has the store listing text (a JSON file with any of `name`, `subtitle`, `keywords`, `title`, `shortDescription`); an EAS Metadata `store.config.json` in the project is read automatically.

The scan prints candidates by severity. It works from patterns, so it has false positives and blind spots.

### 4. Confirm every candidate in the code

For each candidate, open the file and line it points at and decide:
- **Confirmed:** keep it, and replace the scan's evidence with the specific line or screen that shows the problem.
- **Dismissed:** drop it, and list it at the end of the report with the reason (for example, "Stripe is used only for physical orders", "the Android message is behind a platform check").

Then look for what patterns can't see, by reading the flows reviewers test:
- **Sign-in and sign-up:** is account deletion reachable from the app, and does it delete the data? Is the Sign in with Apple button as prominent as the others?
- **The paywall:** does it say what the subscription includes, its price and period, with working Terms of Use and privacy links and a visible Restore button?
- **Permission prompts:** does each one ask at the moment it's needed, with wording that says why?
- **Anything that sends user data to an outside service** (AI, analytics): is there consent where Apple 5.1.2 requires it?
- **The production build's settings:** for a `public-env` finding, run `eas env:list --environment production` (it only reads) if the EAS CLI is signed in. A missing `EXPO_PUBLIC_` key for payments, sign-in or the API means the store build can't do that, which makes it a blocker.

### 5. Write the report

Save it as `<review folder>/report.md`, using this structure so reviews compare over time:

```markdown
# Store review: <app name>

<date> · <stores> · <first submission | update> · rules as of <snapshot date><, N guideline changes since>

## Verdict
**<Ready to submit | Ready after N fixes | Not ready>.** One or two sentences: the blockers, and the biggest risk.

## Blockers
| # | Rule | Store | Guideline | Where | Fix |

## Risks
| # | Rule | Store | Guideline | Where | What to decide |

## Before you submit
- [ ] Each console task: demo account, privacy labels and Data safety, export compliance, age rating, account-deletion web link for Play…

## Dismissed
- `<rule>`: why it doesn't apply here.

## Guideline changes
<From drift.mjs: changed sections and the rules they touch, or "none since <date>".>
```

Every row cites its guideline as written in `references/rules.md`; don't paraphrase a section number. Then build the readable page and open it: `node "<skill folder>/../aso-research/scripts/render.mjs" <review folder>/report.md --open`. Tell the person the verdict, the blockers in a line each, and where the report is.

### 6. The loop: fix, then review again

Blockers loop back to building. Offer to fix them (they're usually small: a restore button, a config key, a platform check), and make changes only with the person's go-ahead. After fixes, run the scan again into a new dated folder and add a "Since last review" line to the new report: what was resolved, what's new.

If an idea file exists for the app, set its `step` to `store-review` while blockers are open and to `submit` once there are none, and log the review.

## Notes

- **Expo config.** The scan reads the resolved config through `npx expo config` when the project's dependencies are installed, so `app.config.ts` is covered; otherwise it reads `app.json` and says so in its header. If it couldn't read the config, tell the person to install dependencies and rerun.
- **Play's policies** have no single page to diff. When a Play finding hinges on a policy's exact wording, open that policy in the Play Console Policy Center and quote it.
- **This isn't a guarantee.** Reviewers judge things no scan sees: design quality, whether the app is useful, whether the screenshots match. Say so once in the verdict when the scan is clean.
