// The scan's rules, matching references/rules.md. Each returns candidate
// findings with evidence; the skill confirms each one by reading the code.

import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import { hasDep, search } from './project.mjs'

/** The newest Expo SDK this skill knows of; raise it when the skill is updated. */
export const LATEST_EXPO_SDK = 57

const at = (o, path) => path.split('.').reduce((v, k) => v?.[k], o)

// Permissions iOS asks for, by module: the Info.plist key, and the module's config-plugin option for its wording.
const PERMISSIONS = [
  { dep: 'expo-camera', key: 'NSCameraUsageDescription', option: 'cameraPermission' },
  { dep: 'expo-image-picker', key: 'NSPhotoLibraryUsageDescription', option: 'photosPermission' },
  { dep: 'expo-image-picker', key: 'NSCameraUsageDescription', option: 'cameraPermission' },
  { dep: 'expo-media-library', key: 'NSPhotoLibraryUsageDescription', option: 'photosPermission' },
  { dep: 'expo-location', key: 'NSLocationWhenInUseUsageDescription', option: 'locationWhenInUsePermission' },
  { dep: 'expo-contacts', key: 'NSContactsUsageDescription', option: 'contactsPermission' },
  { dep: 'expo-calendar', key: 'NSCalendarsUsageDescription', option: 'calendarPermission' },
  { dep: 'expo-local-authentication', key: 'NSFaceIDUsageDescription', option: 'faceIDPermission' },
  { dep: 'expo-tracking-transparency', key: 'NSUserTrackingUsageDescription', option: 'userTrackingPermission' },
  { dep: 'expo-speech-recognition', key: 'NSSpeechRecognitionUsageDescription', option: 'speechRecognitionPermission' },
  { dep: 'expo-speech-recognition', key: 'NSMicrophoneUsageDescription', option: 'microphonePermission' },
  { dep: 'expo-audio', key: 'NSMicrophoneUsageDescription', option: 'microphonePermission', onlyIf: /useAudioRecorder|AudioRecorder|record/ },
  { dep: 'expo-av', key: 'NSMicrophoneUsageDescription', option: 'microphonePermission', onlyIf: /Recording|record/ }
]

const AI_SDKS = ['openai', '@anthropic-ai/sdk', '@google/genai', '@google/generative-ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google', '@ai-sdk/xai']
const AI_HOSTS = /api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.x\.ai/
const AD_SDKS = ['react-native-google-mobile-ads', 'react-native-fbsdk-next', 'react-native-appsflyer', 'react-native-adjust', 'react-native-branch', '@react-native-firebase/analytics']
const PURCHASE_SDKS = ['react-native-purchases', 'expo-iap', 'react-native-iap']
const SOCIAL_LOGIN = /@react-native-google-signin|GoogleAuthProvider|FacebookAuthProvider|providers\/google|providers\/facebook|oauth_google|signInWithGoogle/
// A privacy policy the user can reach: a URL, a route, or the words on a button or link.
const PRIVACY_LINK = /https?:\/\/[^'"`\s]*privacy|['"`]\/?privacy(-policy)?['"`]|['"`>][^'"`<]*privacy policy/i
const BRANDS = /\b(apple|iphone|ipad|android|google|play store|chatgpt|openai|gemini|claude|grok|spotify|fitbit|garmin|instagram|tiktok|youtube|facebook|whatsapp|snapchat|netflix|uber|amazon|duolingo|notion|todoist)\b/i

export function runRules(project, listing) {
  const f = []
  const add = (rule, severity, message, evidence = []) => f.push({ rule, severity, message, evidence })
  const c = project.config ?? {}
  const plugins = (c.plugins ?? []).map((p) => (Array.isArray(p) ? { name: p[0], options: p[1] ?? {} } : { name: p, options: {} }))
  const pluginOf = (name) => plugins.find((p) => p.name === name)

  // Builds
  const ids = [
    ['ios.bundleIdentifier', 'the App Store'],
    ['android.package', 'Google Play']
  ].filter(([path]) => !at(c, path))
  for (const [path, store] of ids) add('app-identity', 'blocker', `${path} isn't set, so there's no build for ${store} yet.`)
  for (const path of ['ios.bundleIdentifier', 'android.package']) {
    if (/^com\.example\./.test(at(c, path) ?? '')) add('app-identity', 'blocker', `${path} is still ${at(c, path)}; Google Play rejects com.example IDs, and the ID can't change after the first upload.`, [{ file: 'app config', text: at(c, path) }])
  }

  // The app icon: present, 1024x1024, and not still the template's.
  const icons = [c.icon, at(c, 'ios.icon'), at(c, 'android.adaptiveIcon.foregroundImage')].filter((i) => typeof i === 'string')
  if (!icons.length) add('app-icon', 'blocker', 'No app icon in the config.')
  for (const icon of new Set(icons)) {
    if (/(^|\/)expo\.icon$/.test(icon)) add('app-icon', 'risk', `The icon is still named after the Expo template (${icon}); confirm it's your own art.`, [{ file: 'app config', text: icon }])
    const size = pngSize(join(project.dir, icon))
    if (size && (icon === c.icon || icon === at(c, 'ios.icon')) && (size.width !== 1024 || size.height !== 1024))
      add('app-icon', 'blocker', `${icon} is ${size.width}×${size.height}; the App Store icon must be 1024×1024.`, [{ file: icon }])
  }

  // EXPO_PUBLIC_ values are built into the app; one missing from the production build ships broken.
  const prodEnv = at(project.eas, 'build.production.env') ?? {}
  const publicVars = [...new Set(search(project, /process\.env\.EXPO_PUBLIC_\w+/).flatMap((h) => h.text.match(/EXPO_PUBLIC_\w+/g)))]
  const unset = publicVars.filter((v) => !(v in prodEnv))
  if (unset.length)
    add('public-env', 'check', `The app reads ${unset.join(', ')}, which the production profile doesn't set in eas.json; confirm each is in the EAS production environment.`, [{ file: 'eas.json', text: 'build.production.env' }])

  const keyPath = at(project.eas, 'submit.production.android.serviceAccountKeyPath')
  if (keyPath && !existsSync(join(project.dir, keyPath)))
    add('submit-credentials', 'check', `${keyPath} is missing, so eas submit can't upload to Google Play from this machine.`, [{ file: 'eas.json', text: keyPath }])

  const prod = at(project.eas, 'build.production')
  if (!project.eas) add('test-build', 'blocker', 'No eas.json, so there is no store build profile.')
  else if (!prod) add('test-build', 'blocker', 'eas.json has no production profile.')
  else if (prod.developmentClient || prod.distribution === 'internal')
    add('test-build', 'blocker', `The production profile builds a ${prod.developmentClient ? 'development client' : 'internal-distribution build'}, which the stores reject.`, [{ file: 'eas.json', text: JSON.stringify(prod).slice(0, 140) }])

  const sdk = Number(/\d+/.exec(String(project.deps.expo ?? ''))?.[0])
  if (Number.isFinite(sdk) && sdk < LATEST_EXPO_SDK - 1)
    add('sdk-current', 'risk', `Expo SDK ${sdk} is more than one release behind ${LATEST_EXPO_SDK}; the stores' yearly build and target-API minimums may reject it.`, [{ file: 'package.json', text: `"expo": "${project.deps.expo}"` }])

  // Placeholder copy users would see; TODO comments aren't shown, so they don't count.
  const placeholders = search(project, /['"`>][^'"`<]*\b(lorem ipsum|coming soon|placeholder text)\b/i)
  if (placeholders.length) add('placeholder-content', 'risk', 'Placeholder or unfinished copy that users would see.', placeholders)

  if (at(c, 'ios.config.usesNonExemptEncryption') === undefined)
    add('export-compliance', 'check', 'ios.config.usesNonExemptEncryption is not set, so App Store Connect asks about encryption on every build.')

  // Accounts and sign-in
  const creates = search(project, /createUserWithEmailAndPassword|\.signUp\(|createAccount\(|linkWithCredential|EmailAuthProvider\.credential/)
  const deletes = search(project, /deleteUser|deleteAccount|delete[_ -]?account|account deletion|user\.delete\(\)|currentUser\??\.delete\(/i)
  if (creates.length && !deletes.length) add('account-deletion', 'blocker', 'The app creates accounts but has no account deletion.', creates.slice(0, 3))
  else if (creates.length) add('account-deletion', 'check', 'Account deletion code exists; confirm it is reachable in the app and deletes the data too.', deletes.slice(0, 2))

  const social = search(project, SOCIAL_LOGIN)
  const socialDeps = hasDep(project, '@react-native-google-signin/google-signin', 'react-native-fbsdk-next')
  if ((social.length || socialDeps.length) && !hasDep(project, 'expo-apple-authentication').length)
    add('login-parity', 'blocker', 'A social login with no Sign in with Apple (or equivalent) on iOS.', [...socialDeps.map((d) => ({ file: 'package.json', text: d })), ...social.slice(0, 3)])

  const auth = creates.length || social.length || search(project, /signInWith|signIn\(/).length
  if (auth) add('demo-account', 'check', 'The app has a login: give reviewers a demo account or instructions in App Review information and Play App access.')

  // Purchases
  const purchaseSdks = hasDep(project, ...PURCHASE_SDKS)
  if (purchaseSdks.length) {
    const restores = search(project, /restorePurchases|restoreTransactions|getAvailablePurchases|restoreCompletedTransactions/)
    if (!restores.length) add('restore-purchases', 'blocker', `${purchaseSdks.join(', ')} is installed but nothing calls a restore.`)
    // Signs of an auto-renewing subscription rather than a one-time unlock.
    const subs = search(project, /PACKAGE_TYPE\.(WEEKLY|MONTHLY|TWO_MONTH|THREE_MONTH|SIX_MONTH|ANNUAL)|subscriptionPeriod|['"`][^'"`]*\b(per (week|month|year)|\/(wk|mo|month|yr|year)|monthly|yearly|annual plan|subscribe|subscription|auto-renew\w*)\b[^'"`]*['"`]/i)
    const terms = search(project, /terms of (use|service)|\beula\b|apple\.com\/legal\/internet-services\/itunes/i)
    const privacy = search(project, PRIVACY_LINK)
    if (subs.length && (!terms.length || !privacy.length))
      add('subscription-terms', 'risk', `Subscriptions without ${!terms.length ? 'a Terms of Use (EULA) link' : ''}${!terms.length && !privacy.length ? ' or ' : ''}${!privacy.length ? 'a privacy link' : ''} in the app.`, subs.slice(0, 2))
  }
  const outside = [...hasDep(project, '@stripe/stripe-react-native', 'react-native-paypal').map((d) => ({ file: 'package.json', text: d })), ...search(project, /checkout\.stripe\.com|buy\.stripe\.com|paypal\.com\/checkout/)]
  if (outside.length) add('outside-payments', 'risk', 'A card or web payment path: fine for physical goods, not for digital features.', outside.slice(0, 3))

  const mentions = search(project, /['"`][^'"`]*\b(Google Play|Play Store|Google account|Android)\b[^'"`]*['"`]/, { exclude: /Platform\.OS|platform\s*===?|import |require\(|console\./ })
  if (mentions.length) add('platform-mentions', 'risk', 'Android or Google Play named in user-facing text, which an iOS build would show.', mentions.slice(0, 5))

  // Privacy and data
  for (const p of PERMISSIONS) {
    if (!project.deps[p.dep]) continue
    if (p.onlyIf && !search(project, p.onlyIf).length) continue
    const plist = at(c, `ios.infoPlist.${p.key}`)
    const plugin = pluginOf(p.dep)
    const wording = plist ?? plugin?.options?.[p.option]
    if (wording && !/\$\(PRODUCT_NAME\)|^Allow .* to access/i.test(wording)) continue
    if (wording) add('purpose-strings', 'risk', `${p.key} uses generic wording ("${String(wording).slice(0, 60)}"); say what the app does with it.`, [{ file: 'app config', text: p.dep }])
    else if (plugin) add('purpose-strings', 'risk', `${p.key} gets Expo's default wording from the ${p.dep} plugin; say what the app does with it.`, [{ file: 'app config', text: p.dep }])
    else add('purpose-strings', 'blocker', `${p.dep} is installed but ${p.key} isn't set and its config plugin isn't listed, so the build may be missing the permission text.`, [{ file: 'package.json', text: p.dep }])
  }

  const storage = hasDep(project, '@react-native-async-storage/async-storage', 'react-native-mmkv')
  if (storage.length && !at(c, 'ios.privacyManifests'))
    add('privacy-manifest', 'risk', `${storage.join(', ')} uses UserDefaults, a required-reason API, and the app declares no ios.privacyManifests.`, storage.map((d) => ({ file: 'package.json', text: d })))

  if (!search(project, PRIVACY_LINK).length) add('privacy-policy-link', 'risk', 'No privacy policy link in the app: no privacy URL, route or "Privacy Policy" text outside comments.')

  const ads = hasDep(project, ...AD_SDKS)
  if (ads.length && !hasDep(project, 'expo-tracking-transparency').length)
    add('tracking-consent', 'blocker', `${ads.join(', ')} with no App Tracking Transparency prompt.`, ads.map((d) => ({ file: 'package.json', text: d })))

  const ai = [...hasDep(project, ...AI_SDKS).map((d) => ({ file: 'package.json', text: d })), ...search(project, AI_HOSTS)]
  if (ai.length) add('ai-data-sharing', 'risk', 'Data goes to a third-party AI provider: ask before sending personal data, name the provider in the privacy policy, and let people report offensive output.', ai.slice(0, 4))

  // Keys built into the app can be pulled out of it; AI keys belong on a server.
  const secrets = [
    ...hasDep(project, ...AI_SDKS).map((d) => ({ file: 'package.json', text: `${d} (runs in the app)` })),
    ...search(project, /EXPO_PUBLIC_\w*(SECRET|PRIVATE|OPENAI|ANTHROPIC|GEMINI|XAI|GROK)\w*/)
  ]
  if (secrets.length) add('client-secrets', 'risk', 'An AI provider key or secret would ship inside the app, where anyone can extract it.', secrets.slice(0, 3))

  add('data-safety', 'check', "Fill in Apple's App Privacy labels and Play's Data safety form from what the app actually collects, consistently.")

  // Content and permissions
  const ugc = search(project, /collection\(\s*['"`](posts|comments|messages|chats|feed|threads)['"`]|react-native-gifted-chat|stream-chat|sendMessage\(/)
  if (ugc.length && !search(project, /report(Post|User|Content|Comment)|blockUser|blocked(Users)?/i).length)
    add('user-content', 'risk', 'Users can post or message each other, with no report or block code found.', ugc.slice(0, 3))

  const health = search(project, /['"`][^'"`]*\b(diagnos\w*|cures?|treats?|treatment|medical advice)\b[^'"`]*['"`]/i, { exclude: /import |console\./ })
  if (health.length) add('health-claims', 'risk', 'Health or medical wording in app copy.', health.slice(0, 3))

  if (project.deps['react-native-webview']) {
    const sites = search(project, /<WebView[^>]*uri:\s*['"`]https?:/)
    if (sites.length) add('web-wrapper', 'risk', 'A WebView loads a website; make sure the app does more than the site.', sites.slice(0, 2))
  }

  const blocked = (at(c, 'android.blockedPermissions') ?? []).map((p) => p.replace(/^android\.permission\./, ''))
  const asked = (at(c, 'android.permissions') ?? []).map((p) => p.replace(/^android\.permission\./, ''))
  const unblocked = ['SYSTEM_ALERT_WINDOW', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE'].filter((p) => !blocked.includes(p))
  if (unblocked.length) add('android-permissions', 'risk', `Not blocked: ${unblocked.join(', ')} (the Expo template can add them).`)
  if (project.deps['expo-media-library'] && !blocked.includes('READ_MEDIA_IMAGES'))
    add('android-permissions', 'risk', 'expo-media-library asks for broad photo access (READ_MEDIA_IMAGES), which Play allows only when it is core to the app; use the photo picker otherwise.', [{ file: 'package.json', text: 'expo-media-library' }])
  if (asked.includes('ACCESS_BACKGROUND_LOCATION') || at(pluginOf('expo-location'), 'options.isAndroidBackgroundLocationEnabled'))
    add('android-permissions', 'risk', 'Background location needs a Play declaration and a video showing why it is core.')

  // Store listing
  if (listing) {
    const limits = [
      ['name', listing.name, 30],
      ['subtitle', listing.subtitle, 30],
      ['keywords', listing.keywords, 100],
      ['title', listing.title, 30],
      ['shortDescription', listing.shortDescription, 80]
    ]
    for (const [field, value, max] of limits) {
      if (value && value.length > max) add('listing-limits', 'blocker', `${field} is ${value.length} characters; the limit is ${max}.`, [{ file: 'listing', text: value }])
    }
    for (const field of ['name', 'subtitle', 'keywords', 'title']) {
      const m = listing[field] && BRANDS.exec(listing[field])
      if (m) add('listing-brands', 'risk', `"${m[0]}" in ${field}: another company's name.`, [{ file: 'listing', text: listing[field] }])
    }
    for (const field of ['title', 'shortDescription']) {
      const m = listing[field] && /\b(best|#1|number one|top|free|new)\b/i.exec(listing[field])
      if (m) add('listing-claims', 'risk', `"${m[0]}" in ${field}.`, [{ file: 'listing', text: listing[field] }])
    }
  }
  return f
}

/** A PNG's width and height from its header, or null if it isn't a readable PNG. */
function pngSize(file) {
  if (!/\.png$/i.test(file) || !existsSync(file)) return null
  const buf = Buffer.alloc(24)
  const fd = openSync(file, 'r')
  try {
    readSync(fd, buf, 0, 24, 0)
  } finally {
    closeSync(fd)
  }
  if (buf.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}
