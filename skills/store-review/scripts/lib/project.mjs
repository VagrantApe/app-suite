// Reads what the review needs from an Expo project: its resolved config, EAS
// build profiles, dependencies and source files, plus a search over the source
// that returns file and line evidence.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SKIP = new Set(['node_modules', 'android', 'ios', '.git', '.expo', 'dist', 'build', 'web-build', 'coverage', '.next', 'research', 'store-review'])
const SOURCE = /\.(tsx?|jsx?|mjs|cjs)$/

export function loadProject(dir) {
  const json = (f) => {
    try {
      return JSON.parse(readFileSync(join(dir, f), 'utf8'))
    } catch {
      return null
    }
  }
  const pkg = json('package.json') ?? {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const { config, configSource } = resolveConfig(dir, json('app.json'))
  const files = []
  walk(dir, dir, files)
  return { dir, pkg, deps, config, configSource, eas: json('eas.json'), files }
}

/**
 * The resolved Expo config. `npx expo config` evaluates app.config.js/ts too,
 * but needs the project's node_modules; without them, app.json is read as is.
 */
function resolveConfig(dir, appJson) {
  if (existsSync(join(dir, 'node_modules', 'expo'))) {
    try {
      const out = execFileSync('npx', ['expo', 'config', '--json', '--type', 'public'], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 60000,
        stdio: ['ignore', 'pipe', 'ignore'],
        env: { ...process.env, EXPO_NO_TELEMETRY: '1', CI: '1' }
      })
      return { config: JSON.parse(out), configSource: 'npx expo config' }
    } catch {
      // Fall back to app.json.
    }
  }
  if (appJson) return { config: appJson.expo ?? appJson, configSource: 'app.json' }
  const code = ['app.config.ts', 'app.config.js'].find((f) => existsSync(join(dir, f)))
  return { config: {}, configSource: code ? `${code} (not evaluated: install dependencies so npx expo config can read it)` : 'none found' }
}

function walk(root, dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(root, p, out)
    else if (SOURCE.test(name) && st.size < 512 * 1024 && !/\.(test|spec)\./.test(name) && !/(^|\/)(test|tests|__tests__)\//.test(relative(root, p))) {
      out.push({ file: relative(root, p), lines: readFileSync(p, 'utf8').split('\n') })
    }
  }
}

const COMMENT = /^\s*(\/\/|\/?\*)/

/**
 * Lines matching a pattern, as evidence: [{ file, line, text }]. Comment
 * lines are skipped unless `comments` is set: a word in a comment isn't
 * something a user or reviewer sees.
 */
export function search(project, pattern, { exclude, comments = false } = {}) {
  const hits = []
  for (const f of project.files) {
    f.lines.forEach((text, i) => {
      if (!comments && COMMENT.test(text)) return
      if (pattern.test(text) && !(exclude && exclude.test(text))) hits.push({ file: f.file, line: i + 1, text: text.trim().slice(0, 140) })
    })
  }
  return hits
}

export const hasDep = (project, ...names) => names.filter((n) => project.deps[n] !== undefined)
