import {
  BLANK_LINES_BETWEEN_BLOCKS,
  ELEMENT_BOX,
  GRID,
  type Block,
} from '@freex/screenplay';

export interface Line {
  readonly type: Block['type'];
  /** Column offset from the left edge of the text area. */
  readonly col: number;
  readonly text: string;
}

export interface Page {
  readonly number: number;
  readonly lines: readonly Line[];
}

/** Greedy word wrap by character count; never hyphenates. No DOM measurement. */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (current === '') {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      out.push(current);
      current = word;
    }
  }
  if (current !== '') out.push(current);
  return out.length > 0 ? out : [''];
}

export function layoutBlock(block: Block): Line[] {
  const box = ELEMENT_BOX[block.type];
  const text = block.type === 'scene-heading' ? block.text.toUpperCase() : block.text;
  return wrap(text, box.width).map((t) => ({
    type: block.type,
    col: box.align === 'right' ? box.indent + box.width - t.length : box.indent,
    text: t,
  }));
}

/**
 * Minimal paginator: fills 54 body lines per page, one blank line between blocks,
 * and moves a block to the next page when it does not fit.
 * PARTIAL: orphan/widow rules, (MORE)/(CONT'D) and dialogue splitting are not implemented yet.
 */
export function paginate(blocks: readonly Block[]): Page[] {
  const pages: Page[] = [];
  let lines: Line[] = [];
  const flush = () => {
    pages.push({ number: pages.length + 1, lines });
    lines = [];
  };

  for (const block of blocks) {
    const blockLines = layoutBlock(block);
    const gap = lines.length === 0 ? 0 : BLANK_LINES_BETWEEN_BLOCKS;
    if (lines.length > 0 && lines.length + gap + blockLines.length > GRID.bodyLines) {
      flush();
      lines.push(...blockLines);
    } else {
      for (let i = 0; i < gap; i++) lines.push({ type: block.type, col: 0, text: '' });
      lines.push(...blockLines);
    }
  }
  if (lines.length > 0 || pages.length === 0) flush();
  return pages;
}
