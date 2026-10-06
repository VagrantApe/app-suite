// A small markdown-to-HTML converter and page style for the research page.
// It covers what the reports use (headings, paragraphs, lists, tables, quotes,
// code and inline marks) so the skill needs no npm packages.

/** Enough markdown for these reports: headings, paragraphs, lists, tables, quotes, code, inline marks. */
export function markdownToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim() || /^<!--.*-->$/.test(line.trim())) {
      i++
    } else if (line.startsWith('```')) {
      const body = []
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i])
      i++
      out.push(`<pre><code>${escape(body.join('\n'))}</code></pre>`)
    } else if (/^#{1,6}\s/.test(line)) {
      const level = /^#+/.exec(line)[0].length
      out.push(`<h${level}>${inline(line.slice(level).trim())}</h${level}>`)
      i++
    } else if (line.startsWith('|') && /^\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
      const cells = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const align = cells(lines[i + 1]).map((c) => (c.endsWith(':') ? ' class="num"' : ''))
      const head = cells(line)
      const rows = []
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i]))
      out.push(
        `<div class="table"><table><thead><tr>${head.map((c, j) => `<th${align[j] ?? ''}>${inline(c)}</th>`).join('')}</tr></thead><tbody>` +
          rows.map((r) => `<tr>${r.map((c, j) => `<td${align[j] ?? ''}>${inline(c)}</td>`).join('')}</tr>`).join('') +
          '</tbody></table></div>'
      )
    } else if (/^>\s?/.test(line)) {
      const body = []
      for (; i < lines.length && /^>/.test(lines[i]); i++) body.push(lines[i].replace(/^>\s?/, ''))
      out.push(`<blockquote>${markdownToHtml(body.join('\n'))}</blockquote>`)
    } else if (/^\s*([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      for (; i < lines.length && (/^\s*([-*]|\d+\.)\s/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length)); i++) {
        if (/^\s*([-*]|\d+\.)\s/.test(lines[i]) && !/^\s{4,}/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s/, ''))
        else items[items.length - 1] += '\n' + lines[i].trim()
      }
      const tag = ordered ? 'ol' : 'ul'
      out.push(`<${tag}>${items.map((it) => `<li>${inline(it).replace(/\n/g, '<br>')}</li>`).join('')}</${tag}>`)
    } else {
      const para = []
      for (; i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\||\s*([-*]|\d+\.)\s)/.test(lines[i]); i++) para.push(lines[i].trim())
      out.push(`<p>${inline(para.join(' '))}</p>`)
    }
  }
  return out.join('\n')
}

function inline(s) {
  return escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
}

export function escape(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const CSS = `
:root { --bg: #ffffff; --text: #1d2025; --muted: #5d6570; --line: #e3e6ea; --head: #f5f6f8; --accent: #b4632a; --code: #f2f3f5; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f1114; --text: #e7e9ec; --muted: #a0a7b1; --line: #2b3036; --head: #171a1e; --accent: #e8a867; --code: #1f2328; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
h1 { font-size: 26px; margin: 0 0 4px; }
h1 + p { color: var(--muted); margin-top: 0; }
h2 { font-size: 19px; margin: 32px 0 10px; padding-top: 12px; border-top: 1px solid var(--line); }
h3 { font-size: 16px; margin: 22px 0 8px; }
p, li { max-width: 78ch; }
strong { font-weight: 650; }
code { font: 13px ui-monospace, "SF Mono", Menlo, monospace; background: var(--code); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
/* Nothing scrolls sideways: a printed page can't scroll, so everything wraps to fit. */
pre { background: var(--code); padding: 12px; border-radius: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
pre code { padding: 0; }
blockquote { margin: 12px 0; padding: 2px 16px; border-left: 3px solid var(--accent); color: var(--muted); }
.table { margin: 12px 0 18px; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
table { border-collapse: collapse; width: 100%; font-size: 13.5px; }
th, td { padding: 7px 10px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--line); overflow-wrap: break-word; }
th { background: var(--head); font-weight: 600; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--head); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
a { color: var(--accent); }
details { margin: 10px 0; border: 1px solid var(--line); border-radius: 10px; padding: 0 16px; }
details[open] { padding-bottom: 12px; }
summary { cursor: pointer; padding: 12px 0; display: flex; gap: 12px; align-items: baseline; }
summary span { font-weight: 600; }
summary small { color: var(--muted); }
details h1 { font-size: 18px; margin-top: 8px; }
details h2 { font-size: 16px; border-top: 0; margin-top: 18px; padding-top: 0; }
@page { margin: 12mm; }
@media print {
  body { font-size: 12px; }
  main { max-width: none; padding: 0; }
  table { font-size: 10.5px; }
  th, td { padding: 5px 7px; }
  code { font-size: 10px; }
  tr { break-inside: avoid; }
  details { break-inside: auto; }
}
`
