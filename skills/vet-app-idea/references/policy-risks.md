# Policy risks by category

App types that draw extra review from Apple or Google, with the rule each falls under and what it takes to comply. This is for scoring an *idea*; `store-review` checks a finished project against the live rules.

Guideline numbers are from Apple's App Review Guidelines and policy names from Google Play's Policy Center, as of Oct 2026. Both change every year. When a verdict hinges on one, open the live page and confirm it:
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google Play: https://support.google.com/googleplay/android-developer/topic/9858052

## The categories

| Category | Apple | Google Play | Usually | Compliance path |
|---|---|---|---|---|
| **User-generated content** (posts, chat, profiles, shared media) | 1.2 User-Generated Content | User Generated Content | maybe | Filter objectionable content, let users report and block, act on reports, and publish contact details |
| **AI-generated content** (text, images, chat) | 1.1, 1.2; 5.1.2(i) for sending personal data to a third-party AI | AI-Generated Content | maybe | Let users report or flag offensive output, prevent prohibited content, and disclose and get consent before sending personal data to an outside AI provider |
| **Health, fitness and wellness** | 1.4.1 Medical; 5.1.3 Health and Health Research | Health Content and Services; health declarations | maybe; **no-go** if it diagnoses or treats | No diagnosis or treatment claims, disclaimers where advice is given, health data kept out of advertising, and Health Connect or HealthKit rules followed if used |
| **Kids** (a children's app, or kids in the audience) | 1.3 Kids Category; 5.1.4 Kids | Families Policy | maybe | No third-party ads or analytics in kids' apps, a parental gate for links and purchases, and child-appropriate content |
| **Gambling and contests** | 5.3 Gaming, Gambling, and Lotteries | Real-Money Gambling, Games and Contests | **no-go** for real money without a licence | Simulated (no real money) is allowed with age rating; sweepstakes need official rules and Apple isn't the sponsor |
| **Money and finance** (loans, trading, crypto) | 3.1.5 Cryptocurrencies; 5.1.1(ix) regulated fields | Financial Services | **no-go** for most indies | Usually needs a licensed entity |
| **Subscriptions and paywalls** | 3.1.1 In-App Purchase; 3.1.2 Subscriptions | Payments; Subscriptions | go when done right | Digital goods through store billing, clear price and terms before purchase, restore purchases, and no misleading free-trial wording |
| **Accounts and sign-in** | 5.1.1(v) account deletion; 4.8 Login Services | Account deletion requirement | go | In-app account deletion, plus Sign in with Apple wherever another social login is offered |
| **Personal data and permissions** (location, contacts, photos, health) | 5.1.1 Data Collection and Storage; 5.1.2 Data Use and Sharing | User Data; Data safety section; Permissions and APIs That Access Sensitive Information | go to maybe | Ask only for what a feature needs, explain why, and declare it in both stores' privacy forms. Background location and broad photo access draw extra review on Play |
| **Copycat or saturated categories** (flashlights, fart apps, wallpapers, horoscopes, generic reminders) | 4.3 Spam; 4.2 Minimum Functionality | Spam and Minimum Functionality | maybe; **no-go** if near-identical to existing apps | A clear difference in what it does, not just a re-skin. Apple rejects near-copies in saturated categories |
| **Other people's brands or content** | 4.1 Copycats; 5.2 Intellectual Property | Impersonation; Intellectual Property | **no-go** without rights | No other company's name, logo or content without permission. Naming an integration ("works with Spotify") in the description is fine; using it in the title or keywords isn't |
| **Web wrappers** (an app that's mostly a website) | 4.2 Minimum Functionality | Spam and Minimum Functionality | maybe | Native features beyond what the website offers |

## Reading it for an idea

- **One maybe is normal.** Most apps with accounts and a subscription carry some. Score the criterion **maybe** and write the compliance path as the risk.
- **Stack them up.** Kids, plus user-generated content, plus AI is three separate compliance programs. That's a fair reason to score **maybe** with a size warning, even though each is manageable alone.
- **A no-go is about the core feature.** If removing the risky part leaves a worthwhile app, the loop's question is whether to cut it.
