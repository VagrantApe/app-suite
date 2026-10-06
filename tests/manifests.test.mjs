import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

// The plugin ships two manifests: Claude Code reads .claude-plugin/plugin.json,
// Codex and other Agent Plugins clients read plugin.json at the root.
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

test('both manifests describe the same plugin and version', () => {
  const claude = read('.claude-plugin/plugin.json')
  const agents = read('plugin.json')
  for (const key of ['name', 'version', 'description', 'license', 'repository']) assert.equal(agents[key], claude[key], key)
})

test('the Agent Plugins manifest has only the fields its schema allows', () => {
  const allowed = ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']
  for (const key of Object.keys(read('plugin.json'))) assert.ok(allowed.includes(key), key)
})

test('both marketplaces list the plugin at the repo root', () => {
  assert.equal(read('.claude-plugin/marketplace.json').plugins[0].source, './')
  assert.equal(read('.agents/plugins/marketplace.json').plugins[0].source.path, './')
})
