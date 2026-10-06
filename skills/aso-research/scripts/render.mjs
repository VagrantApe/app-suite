#!/usr/bin/env node
// Turns markdown into a page a person can read in a browser, with real tables.
// Given a research folder: report.md first, then suggestions.md and
// rankings.md as sections that open on click, written to report.html. Given a
// single .md file (an idea file, say): that file, written beside it as .html.

import { execFile } from 'node:child_process'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { CSS, escape, markdownToHtml } from './lib/markdown.mjs'

const USAGE = `Usage: node render.mjs <research folder | file.md> [--open] [--expanded]

A folder: reads report.md (and suggestions.md, rankings.md if present) and
writes report.html beside them. A file: writes it as <file>.html beside it.
A YAML header at the top of a file (between --- lines) is left out.

  --open       open the page in the default browser
  --expanded   show the evidence sections open (for printing to PDF)
`

const args = process.argv.slice(2)
const dir = args.find((a) => !a.startsWith('--'))
if (!dir || args.includes('--help')) {
  process.stderr.write(USAGE)
  process.exit(dir ? 0 : 2)
}
const target = resolve(dir)
const single = existsSync(target) && statSync(target).isFile()
const folder = single ? dirname(target) : target
const read = (name) => (existsSync(join(folder, name)) ? stripHeader(readFileSync(join(folder, name), 'utf8')) : null)
const report = read(single ? basename(target) : 'report.md')
if (!report) {
  process.stderr.write(single ? `Can't read ${target}\n` : `No report.md in ${folder}\n`)
  process.exit(2)
}

const sections = (single ? [] : [
  ['suggestions.md', 'Search suggestions', 'Every phrase found, with its autocomplete rank in each store'],
  ['rankings.md', 'Who ranks', 'Competition per keyword and store, then each keyword’s top apps']
]
  .map(([file, title, sub]) => [read(file), title, sub])
  .filter(([md]) => md))
  .map(([md, title, sub]) => `<details${args.includes('--expanded') ? ' open' : ''}><summary><span>${title}</span><small>${sub}</small></summary>${markdownToHtml(md)}</details>`)

const title = /^#\s+(.+)$/m.exec(report)?.[1] ?? basename(folder)
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${markdownToHtml(report)}
${sections.length ? `<h2>Evidence</h2>\n${sections.join('\n')}` : ''}
</main>
</body>
</html>
`
const out = single ? target.replace(/\.md$/i, '') + '.html' : join(folder, 'report.html')
writeFileSync(out, html)
process.stdout.write(`${out}\n`)

if (args.includes('--open')) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'
  execFile(opener, [out], () => {})
}

/** Drops a YAML header (between --- lines at the very top): it's for scripts, not readers. */
function stripHeader(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '')
}
