/** Attribute carrying the character offset of an element in the HTML pane. */
export const SOURCE_ATTR = 'data-ed-pos';

/** Elements whose contents are text, never markup. */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'title']);

const TAG_START = /^<([a-zA-Z][a-zA-Z0-9:-]*)/;

/**
 * Records where each element began in the source so clicking it in the preview
 * can jump back to the right line.
 *
 * This is a scanner rather than a parse: the pane holds a fragment that is
 * frequently mid-edit and therefore invalid, and any DOM-based round trip would
 * discard the offsets we are trying to keep.
 */
export function annotateHtml(html: string): string {
  let out = '';
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf('<', i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }

    out += html.slice(i, lt);
    const rest = html.slice(lt);

    if (rest.startsWith('<!--')) {
      const end = html.indexOf('-->', lt);
      const stop = end === -1 ? html.length : end + 3;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }

    if (rest.startsWith('</') || rest.startsWith('<!') || rest.startsWith('<?')) {
      const end = html.indexOf('>', lt);
      const stop = end === -1 ? html.length : end + 1;
      out += html.slice(lt, stop);
      i = stop;
      continue;
    }

    const match = TAG_START.exec(rest);
    if (!match) {
      out += '<';
      i = lt + 1;
      continue;
    }

    const tagName = match[1].toLowerCase();
    const openEnd = findTagEnd(html, lt);
    if (openEnd === -1) {
      out += html.slice(lt);
      break;
    }

    const nameEnd = lt + 1 + match[1].length;
    out += `${html.slice(lt, nameEnd)} ${SOURCE_ATTR}="${lt}"${html.slice(nameEnd, openEnd + 1)}`;
    i = openEnd + 1;

    if (RAW_TEXT.has(tagName)) {
      const closing = html.toLowerCase().indexOf(`</${tagName}`, i);
      const stop = closing === -1 ? html.length : closing;
      out += html.slice(i, stop);
      i = stop;
    }
  }

  return out;
}

/** Index of the `>` closing the tag that starts at `from`, honouring quotes. */
function findTagEnd(html: string, from: number): number {
  let quote: string | null = null;

  for (let i = from + 1; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }

  return -1;
}
