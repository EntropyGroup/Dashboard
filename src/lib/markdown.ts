function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s: string) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
}

/** Tiny markdown → HTML for the notes editor's preview. Headings, bold/italic/code, links, lists, quotes. */
export function markdownToHtml(source: string) {
  const lines = source.split('\n')
  const html: string[] = []
  let listOpen: 'ul' | 'ol' | null = null

  function closeList() {
    if (listOpen) html.push(`</${listOpen}>`)
    listOpen = null
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      closeList()
      html.push(`<blockquote>${inline(quote[1])}</blockquote>`)
      continue
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line)
    if (bullet) {
      if (listOpen !== 'ul') {
        closeList()
        html.push('<ul>')
        listOpen = 'ul'
      }
      html.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line)
    if (numbered) {
      if (listOpen !== 'ol') {
        closeList()
        html.push('<ol>')
        listOpen = 'ol'
      }
      html.push(`<li>${inline(numbered[1])}</li>`)
      continue
    }

    closeList()
    if (!line.trim()) continue
    html.push(`<p>${inline(line)}</p>`)
  }
  closeList()

  return html.join('\n')
}
