import type { Block } from './block';
import { isBlank, normalizeBlock } from './text';
import type { Issue } from './validate';

/** Page ranges from normas-de-formatacao.md 8.4. They are guidance, never errors. */
export type ScriptFormat = 'short' | 'feature' | 'tv-hour' | 'tv-half-hour' | 'tv-movie';

export const PAGE_RANGES: Readonly<Record<ScriptFormat, readonly [min: number, max: number]>> = {
  short: [5, 30],
  feature: [90, 120],
  'tv-hour': [45, 65],
  'tv-half-hour': [25, 40],
  'tv-movie': [90, 110],
};

/** FMT110: returns a warning when the body page count (title page excluded) is out of range. */
export function checkPageRange(format: ScriptFormat, pageCount: number): Issue | null {
  const [min, max] = PAGE_RANGES[format];
  if (pageCount >= min && pageCount <= max) return null;
  return {
    code: 'FMT110',
    severity: 'warning',
    blockIndex: -1,
    message: `Roteiro com ${pageCount} páginas; a faixa orientativa do formato é ${min} a ${max}.`,
  };
}

export interface TitlePage {
  readonly title: string;
  readonly authors: readonly string[];
  readonly credit?: string;
  /** "Based on..." line. */
  readonly source?: string;
  /** One datum per line, separated by a line feed. */
  readonly contact?: string;
  readonly date?: string;
}

/** FMT111: title or author missing on the title page. */
export function checkTitlePage(page: TitlePage): Issue | null {
  if (!isBlank(page.title) && page.authors.some((a) => !isBlank(a))) return null;
  return {
    code: 'FMT111',
    severity: 'warning',
    blockIndex: -1,
    message: 'Título ou autor ausente na página de título.',
  };
}

/**
 * Auto-corrections allowed by normas-de-formatacao.md 8.3: spacing, upper case for heading,
 * character and transition, and no blank blocks at the start or end of the document.
 * Words are never rewritten. Blocks that need no change are returned as the same objects.
 */
export function autoFixBlocks(blocks: readonly Block[]): Block[] {
  let start = 0;
  let end = blocks.length;
  while (start < end && isBlank(blocks[start]?.text ?? '')) start++;
  while (end > start && isBlank(blocks[end - 1]?.text ?? '')) end--;
  return blocks.slice(start, end).map(normalizeBlock);
}
