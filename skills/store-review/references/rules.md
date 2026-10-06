# Review rules

What `store-review` checks before an Expo app goes to App Review or Google Play review. Each rule names the rule it enforces, how `scripts/scan.mjs` spots it, and the fix.

Apple citations are App Review Guidelines section numbers, checked against the live page on 2026-10-06 (`scripts/drift.mjs` reports any section that has changed since). Google Play citations are policy names from the Play Console Policy Center, as of 2026-10-06; open the policy when a finding hinges on its wording.

**Severity:**
- **blocker:** the build will be rejected or won't upload as it stands.
- **risk:** a reviewer may reject it, depending on details the scan can't see. Confirm by reading the code.
- **check:** something a person has to do or answer in the store consoles; the scan can't verify it.

The scan finds candidates. Every candidate is confirmed or dismissed by reading the code it points at before it goes in the report.

## Builds

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `app-identity` | Both | App Store Connect bundle ID; Play Console package name (Play rejects `com.example`) | blocker | `ios.bundleIdentifier` or `android.package` missing from the resolved config, or still `com.example.*` | Set both to your own reverse-domain ID before the first build; they can't change once the store records exist |
| `app-icon` | Both | App Store Connect icon requirements (1024×1024 PNG); Apple 2.3 Accurate Metadata; Play: graphic assets requirements | blocker if missing or wrong size, risk if it looks like the template | No `icon` in the config, an icon PNG that isn't 1024×1024, or an icon still named after the Expo template (`expo.icon`) | Your own 1024×1024 icon; for Play, a 512×512 version in the listing |
| `public-env` | Both | Apple 2.1 App Completeness (the reviewed build must work); Play: Minimum Functionality | check | `EXPO_PUBLIC_` variables the source reads that the production build profile doesn't set in `eas.json` | Confirm each is set for production (`eas env:list --environment production`); they're built into the app, so a missing key ships a broken build |
| `submit-credentials` | Play | EAS Submit to Google Play (service account key) | check | `submit.production.android.serviceAccountKeyPath` points to a file that isn't there | Put the key file back locally (it's gitignored, so each machine needs its own copy) |
| `test-build` | Both | Apple 2.2 Beta Testing, 2.1 App Completeness; Play: Minimum Functionality | blocker | The `production` profile in `eas.json` sets `developmentClient: true` or `distribution: "internal"`, or there's no `production` profile | A production profile that builds a store build (no dev client, store distribution) |
| `sdk-current` | Both | Apple 2.5.1 (current OS, public APIs; Apple's yearly minimum Xcode/SDK for uploads); Play: Target API level requirement | risk | The `expo` version in `package.json` is more than one SDK release behind the latest the skill knows | Upgrade the Expo SDK; each release targets the current Xcode and Android API level |
| `placeholder-content` | Both | Apple 2.1 App Completeness, 2.3 Accurate Metadata; Play: Minimum Functionality | risk | "lorem ipsum", "TODO(launch)", "coming soon", "placeholder" or "test" strings in app source | Finish or remove unfinished screens and copy |
| `export-compliance` | Apple | App Store Connect export compliance (`ITSAppUsesNonExemptEncryption`) | check | `ios.config.usesNonExemptEncryption` isn't set | Set it in `app.json` (usually `false`), so every TestFlight build doesn't ask |

## Accounts and sign-in

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `account-deletion` | Both | Apple 5.1.1(v) Account Sign-In; Play: Account deletion requirement (in the app and on the web) | blocker | Account creation (Firebase `createUserWithEmailAndPassword`, `signUp`, an auth SDK) with no account-deletion code (`deleteUser`, `deleteAccount`, "delete account") | An in-app way to delete the account and its data, plus a web page for Play's form |
| `login-parity` | Apple | Apple 4.8 Login Services | blocker | A third-party or social login (Google Sign-In, Facebook, `GoogleAuthProvider`, `expo-auth-session` with Google) with no `expo-apple-authentication` | Offer Sign in with Apple (or another login that limits data to name and email and lets people hide their email) |
| `demo-account` | Both | Apple 2.1 App Completeness (demo account info); Play: App access declaration | check | Any login | Put a demo account, or instructions, in App Review information and Play's App access form |

## Purchases

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `restore-purchases` | Apple | Apple 3.1.1 In-App Purchase (a restore mechanism for restorable purchases) | blocker | A purchases SDK (`react-native-purchases`, `expo-iap`, `react-native-iap`) with no restore call (`restorePurchases`, `restoreTransactions`, `getAvailablePurchases`) | A visible Restore Purchases button |
| `subscription-terms` | Both | Apple 3.1.2(c) Subscription Information; App Store Connect's Terms of Use (EULA) link; Play: Subscriptions policy | risk | Subscription purchases with no Terms of Use / EULA and privacy links in the app's paywall code | Show what the subscription includes, its price and period, and links to the terms and the privacy policy on the paywall |
| `outside-payments` | Both | Apple 3.1.1, 3.1.3 Other Purchase Methods; Play: Payments policy | risk | A web or card payment SDK (`@stripe/stripe-react-native`, Stripe or PayPal checkout links) | Digital goods and features must go through store billing; card payments are fine only for physical goods and services used outside the app |
| `platform-mentions` | Apple | Apple 2.3.10 (no other platforms' names in an iOS app or its metadata) | risk | "Android", "Google Play" or "Google account" in user-facing strings, outside platform checks | Word messages per platform, for example a restore message that names the App Store on iOS |

## Privacy and data

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `purpose-strings` | Apple | Apple 5.1.1(ii) Permission (purpose strings must explain the use); App Store Connect upload check for missing usage descriptions | blocker if missing, risk if generic | A module that needs a permission (camera, photos, microphone, location, contacts, calendar, Face ID, speech, tracking) whose `NS…UsageDescription` isn't set in `ios.infoPlist` or the module's config plugin; an Expo default ("Allow $(PRODUCT_NAME) to access your camera") counts as generic | A specific sentence per permission, saying what the app does with it |
| `privacy-manifest` | Apple | App Store Connect upload check: privacy manifest required-reason APIs (ITMS-91053) | risk | No `ios.privacyManifests` in `app.json` while the app uses required-reason APIs directly (for example AsyncStorage or MMKV, which use `UserDefaults`) | Declare the app's own required-reason API use in `ios.privacyManifests`; Expo modules ship their own |
| `privacy-policy-link` | Both | Apple 5.1.1(i) Privacy Policies (in the metadata and in the app); Play: User Data policy | risk | No privacy-policy link anywhere in app source | A privacy-policy link in Settings or the about screen, plus the URL in both store consoles |
| `tracking-consent` | Apple | Apple 5.1.2(i) Data Use and Sharing; App Tracking Transparency | blocker | An ads or attribution SDK (`react-native-google-mobile-ads`, Facebook SDK, AppsFlyer, Adjust, Branch) with no `expo-tracking-transparency` | Ask through App Tracking Transparency before tracking, and say so in the privacy labels |
| `ai-data-sharing` | Both | Apple 5.1.2(i) (disclose and get explicit permission before sharing personal data with third-party AI), 1.1 and 1.2; Play: AI-Generated Content | risk | Calls to an AI provider (OpenAI, Anthropic, Google Gemini, xAI SDKs or API hosts) | Ask before sending personal data to the AI provider, name it in the privacy policy, and let people report offensive AI output |
| `client-secrets` | Both | Not a store rule: security (anything built into the app can be extracted) | risk | An AI provider's SDK in the app's dependencies, or an `EXPO_PUBLIC_` variable named like a secret (`SECRET`, `PRIVATE`, or an AI provider's `API_KEY`) | Call the provider from your server (an EAS Hosting API route) and keep the key there |
| `data-safety` | Both | Apple App Privacy labels; Play: Data safety section | check | Always | Fill in both forms from what the app actually collects, and keep them consistent with each other and the privacy policy |

## Content and permissions

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `user-content` | Both | Apple 1.2 User-Generated Content (filter, report, block, contact info); Play: User Generated Content | risk | Signs of users posting to each other (posts, comments, chat, shared feeds) with no report or block code | Filtering, a report button, user blocking, and published contact details |
| `health-claims` | Both | Apple 1.4.1 (medical), 5.1.3 Health and Health Research; Play: Health Content and Services | risk | "diagnose", "treat", "cure" or "medical advice" in app copy | No diagnosis or treatment claims; a disclaimer where the app gives health-adjacent advice |
| `web-wrapper` | Both | Apple 4.2 Minimum Functionality; Play: Spam and Minimum Functionality (webviews) | risk | A WebView that loads a whole site as a main screen | Native features beyond the website |
| `android-permissions` | Play | Play: Permissions and APIs that access sensitive information; Photo and Video Permissions; location permissions | risk | `SYSTEM_ALERT_WINDOW` or legacy storage permissions not blocked; `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` (for example from `expo-media-library`); `ACCESS_BACKGROUND_LOCATION` | Block what the app doesn't use (`android.blockedPermissions`); use the photo picker instead of broad media access; declare background location only if it's core |

## Store listing

These need the listing text: pass it with `--listing` (a JSON or text file), or read EAS Metadata's `store.config.json` if the project has one.

| Rule | Store | Cites | Severity | The scan looks for | Fix |
|---|---|---|---|---|---|
| `listing-limits` | Both | App Store Connect and Play Console field limits | blocker | Name or title over 30 characters, subtitle over 30, keywords over 100, Play short description over 80 | Shorten |
| `listing-brands` | Both | Apple 2.3.7 (no trademarked terms or other apps' names in metadata), 4.1, 5.2; Play: Metadata, Impersonation | risk | Other companies' names (competitors, platforms, integrations) in the name, subtitle or keywords | Keep brands out of those fields; naming an integration in the description is fine |
| `listing-claims` | Play | Play: Metadata policy (no "best", "#1", "free" as ranking or price claims in the title, icon or developer name) | risk | "best", "#1", "top", "free", "new" in the title or short description | Describe what the app does instead |
