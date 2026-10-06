// Markdown views of the research results: what a person reads. The JSON stays
// in data/ for scripts and for re-checking; these tables are the readable
// version, compact enough to read in a terminal or paste into a report.

const STORE = { apple: 'App Store', play: 'Google Play' }

export function suggestMarkdown(r) {
  const lines = [
    `# Search suggestions: ${r.seeds.length <= 3 ? list(r.seeds.map((s) => `"${s}"`)) : `${r.seeds.length} seeds`}`,
    '',
    `${r.country.toUpperCase()} · ${r.generatedAt.slice(0, 10)}${r.expanded ? ' · expanded a–z' : ''}`,
    '',
    'Ranks are autocomplete positions (1 = suggested first): a popularity order, not search volume. "–" means not suggested.',
    '',
    `| Keyword | ${r.stores.map((s) => STORE[s]).join(' | ')} | From |`,
    `|---|${r.stores.map(() => '---:').join('|')}|---|`
  ]
  for (const k of r.keywords) {
    lines.push(`| ${k.keyword} | ${r.stores.map((s) => k[s] ?? '–').join(' | ')} | ${k.via === 'expand' ? 'long tail' : 'seed'} |`)
  }
  lines.push('', `${r.keywords.length} phrases.`)
  return lines.join('\n') + '\n'
}

export function serpMarkdown(r, { rows = 5 } = {}) {
  const lines = [
    `# Who ranks: ${r.keywords.length <= 3 ? list(r.keywords.map((k) => `"${k.keyword}"`)) : `${r.keywords.length} keywords`}`,
    '',
    `${r.country.toUpperCase()} · ${r.generatedAt.slice(0, 10)} · top ${r.keywords[0] ? appsIn(r.keywords[0], r.stores) : 10} apps per store`,
    '',
    '| Keyword | Store | Competition | Median ratings | Title matches | Beatable | Leader |',
    '|---|---|---|---:|---:|---:|---|'
  ]
  for (const k of r.keywords) {
    for (const s of r.stores) {
      const e = k[s]
      if (!e || e.error) {
        lines.push(`| ${k.keyword} | ${STORE[s]} | failed: ${e?.error ?? 'no data'} | | | | |`)
        continue
      }
      const m = e.summary
      const leader = m.leader ? `${m.leader.title} (${num(m.leader.ratings)}${m.leader.installs ? `, ${m.leader.installs}` : ''})` : '–'
      lines.push(`| ${k.keyword} | ${STORE[s]} | **${m.competition}** | ${num(m.medianRatings)} | ${m.titleMatches}/${m.results} | ${m.beatable}/${m.results} | ${leader} |`)
    }
  }

  for (const k of r.keywords) {
    lines.push('', `## ${k.keyword}`)
    for (const s of r.stores) {
      const e = k[s]
      if (!e || e.error) continue
      const m = e.summary
      lines.push('', `**${STORE[s]}**: ${m.competition} competition.${m.signals.length ? ' ' + m.signals.join(' ') : ''}`, '')
      const play = s === 'play'
      lines.push(play ? '| # | App | Ratings | Rating | Installs | Updated |' : '| # | App | Ratings | Rating | Released | Updated |')
      lines.push('|---:|---|---:|---:|---|---|')
      e.apps.slice(0, rows).forEach((a, i) => {
        lines.push(`| ${i + 1} | ${a.title} | ${num(a.ratings)} | ${a.rating ?? '–'} | ${(play ? a.installs : a.released) ?? '–'} | ${a.updated ?? '–'} |`)
      })
    }
  }
  return lines.join('\n') + '\n'
}

const appsIn = (k, stores) => Math.max(...stores.map((s) => k[s]?.apps?.length ?? 0))

/** Ratings counts: unknown (null) shows as "–", never as 0. */
function num(n) {
  return n === null || n === undefined ? '–' : n.toLocaleString('en-US')
}

function list(xs) {
  return xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`
}
