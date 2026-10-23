import type { Block } from './block';
import type { ElementType } from './constants';
import { remapMarks } from './marks';

/** Greedy word wrap by character count; never hyphenates. No DOM measurement. */
export function wrap(text: string, width: number): string[] {
  return wrapWithOffsets(text, width).map((l) => l.text);
}

export interface WrappedLine {
  readonly text: string;
  /** Source offset of each char of `text`; a joining space maps to the end of the previous word. */
  readonly source: readonly number[];
}

/**
 * Same breaks as `wrap` (long words are cut by character, normas 7.2), keeping the source
 * offset of every char so inline marks can follow the text.
 */
export function wrapWithOffsets(text: string, width: number): WrappedLine[] {
  const out: WrappedLine[] = [];
  let cur = '';
  let curSrc: number[] = [];
  const flush = () => {
    out.push({ text: cur, source: curSrc });
    cur = '';
    curSrc = [];
  };

  for (const m of text.matchAll(/\S+/g)) {
    let word = m[0];
    let start = m.index;
    // a word longer than the column is cut by character
    while (word.length > width) {
      if (cur !== '') flush();
      cur = word.slice(0, width);
      curSrc = Array.from({ length: width }, (_, k) => start + k);
      flush();
      word = word.slice(width);
      start += width;
    }
    if (cur === '') {
      cur = word;
      curSrc = Array.from({ length: word.length }, (_, k) => start + k);
    } else if (cur.length + 1 + word.length <= width) {
      curSrc.push((curSrc[curSrc.length - 1] ?? start) + 1, ...Array.from({ length: word.length }, (_, k) => start + k));
      cur += ` ${word}`;
    } else {
      flush();
      cur = word;
      curSrc = Array.from({ length: word.length }, (_, k) => start + k);
    }
  }
  if (cur !== '') flush();
  return out.length > 0 ? out : [{ text: '', source: [] }];
}

/** Elements whose text is stored and shown in upper case (FR-EDT-006). */
export const UPPERCASE_ELEMENTS: ReadonlySet<ElementType> = new Set([
  'scene-heading',
  'character',
  'transition',
]);

export function isBlank(text: string): boolean {
  return text.trim() === '';
}

/** True when the text has letters and none of them is lower case. */
export function isUpperCase(text: string): boolean {
  return /\p{L}/u.test(text) && text === text.toUpperCase();
}

export interface MappedText {
  readonly text: string;
  /** Source offset of each output char. */
  readonly map: readonly number[];
}

/**
 * Whitespace and punctuation clean-ups allowed by normas-de-formatacao.md 8.3, keeping a map
 * back to the source so inline marks survive. Never rewrites words, only spacing.
 */
export function normalizeSpacingMapped(text: string): MappedText {
  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let ch = text.charAt(i);
    if (ch === '\r' && text.charAt(i + 1) === '\n') continue;
    if (ch === '\r' || ch === '\n' || ch === '\t') ch = ' ';
    if (ch === ' ') {
      if (chars.length === 0 || chars[chars.length - 1] === ' ') continue;
    } else if (/[,;:.!?]/.test(ch) && chars[chars.length - 1] === ' ') {
      chars.pop();
      map.pop();
    }
    chars.push(ch);
    map.push(i);
  }
  if (chars[chars.length - 1] === ' ') {
    chars.pop();
    map.pop();
  }
  return { text: chars.join(''), map };
}

export function normalizeSpacing(text: string): string {
  return normalizeSpacingMapped(text).text;
}

function upperMapped(m: MappedText): MappedText {
  const chars: string[] = [];
  const map: number[] = [];
  for (let i = 0; i < m.text.length; i++) {
    const up = m.text.charAt(i).toUpperCase();
    for (const c of up) {
      chars.push(c);
      map.push(m.map[i] ?? 0);
    }
  }
  return { text: chars.join(''), map };
}

/** Applies the spacing clean-up and the upper-casing rule of the element. */
export function normalizeText(type: ElementType, text: string): string {
  const spaced = normalizeSpacing(text);
  return UPPERCASE_ELEMENTS.has(type) ? spaced.toUpperCase() : spaced;
}

/** Same as `normalizeText` for a whole block: marks are re-targeted, other fields kept. */
export function normalizeBlock(block: Block): Block {
  let m = normalizeSpacingMapped(block.text);
  if (UPPERCASE_ELEMENTS.has(block.type)) m = upperMapped(m);
  if (m.text === block.text) return block;
  const marks = remapMarks(block.marks, m.map);
  const { marks: _old, ...rest } = block;
  return marks.length > 0 ? { ...rest, text: m.text, marks } : { ...rest, text: m.text };
}
