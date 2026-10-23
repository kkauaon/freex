import type { Block, Mark, MarkType } from './block';
import type { TitlePage } from './document';
import { normalizeMarks } from './marks';
import {
  classifyTransition,
  isParentheticalLine,
  isSceneHeading,
  isShotLine,
  parseCharacterCue,
} from './parse';
import { isUpperCase } from './text';

export interface FountainIssue {
  /** 1-based line of the source. */
  readonly line: number;
  readonly severity: 'error' | 'warning';
  /** pt-BR, never contains script text. */
  readonly message: string;
}

export interface FountainDocument {
  readonly blocks: Block[];
  readonly titlePage: TitlePage | null;
  readonly issues: FountainIssue[];
  /** `lines[i]` is the 0-based source line where the element of `blocks[i]` starts. */
  readonly lines: number[];
}

// ---------------------------------------------------------------- emphasis

interface Token {
  readonly pos: number;
  readonly len: number;
  readonly kinds: readonly MarkType[];
}

interface Parsed {
  readonly text: string;
  readonly marks: Mark[];
}

function scanTokens(raw: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; ) {
    const c = raw.charAt(i);
    if (c === '\\' && /[*_\\]/.test(raw.charAt(i + 1))) {
      i += 2;
    } else if (raw.startsWith('***', i)) {
      tokens.push({ pos: i, len: 3, kinds: ['bold', 'italic'] });
      i += 3;
    } else if (raw.startsWith('**', i)) {
      tokens.push({ pos: i, len: 2, kinds: ['bold'] });
      i += 2;
    } else if (c === '*') {
      tokens.push({ pos: i, len: 1, kinds: ['italic'] });
      i += 1;
    } else if (c === '_') {
      tokens.push({ pos: i, len: 1, kinds: ['underline'] });
      i += 1;
    } else {
      i += 1;
    }
  }
  return tokens;
}

/** Pairs delimiters per kind; a token is kept only when all of its kinds are paired. */
function pairTokens(raw: string, input: Token[]): { tokens: Token[]; pairs: [Token, Token, MarkType][] } {
  let tokens = input;
  for (let round = 0; round < 4; round++) {
    const open = new Map<MarkType, Token>();
    const pairs: [Token, Token, MarkType][] = [];
    const paired = new Map<Token, number>();
    const bump = (t: Token) => paired.set(t, (paired.get(t) ?? 0) + 1);
    for (const t of tokens) {
      const next = raw.charAt(t.pos + t.len);
      const prev = raw.charAt(t.pos - 1);
      const canOpen = next !== '' && !/\s/.test(next);
      const canClose = prev !== '' && !/\s/.test(prev);
      for (const k of t.kinds) {
        const o = open.get(k);
        if (o && canClose) {
          pairs.push([o, t, k]);
          bump(o);
          bump(t);
          open.delete(k);
        } else if (canOpen) {
          open.set(k, t);
        }
      }
    }
    const good = tokens.filter((t) => paired.get(t) === t.kinds.length);
    if (good.length === tokens.length) return { tokens, pairs };
    tokens = good;
  }
  return { tokens: [], pairs: [] };
}

/** Fountain emphasis: `***bold italic***`, `**bold**`, `*italic*`, `_underline_`, `\*` escapes. */
export function parseEmphasis(raw: string): Parsed {
  const { tokens, pairs } = pairTokens(raw, scanTokens(raw));
  const dropped = new Set(tokens.map((t) => t.pos));
  const tokenAt = new Map(tokens.map((t) => [t.pos, t] as const));
  const outAt: number[] = new Array<number>(raw.length + 1).fill(0);
  let out = '';
  for (let i = 0; i < raw.length; ) {
    outAt[i] = out.length;
    const t = dropped.has(i) ? tokenAt.get(i) : undefined;
    if (t) {
      for (let k = 0; k < t.len; k++) outAt[i + k] = out.length;
      i += t.len;
    } else if (raw.charAt(i) === '\\' && /[*_\\]/.test(raw.charAt(i + 1))) {
      outAt[i + 1] = out.length;
      out += raw.charAt(i + 1);
      i += 2;
    } else {
      out += raw.charAt(i);
      i += 1;
    }
  }
  outAt[raw.length] = out.length;
  const marks = normalizeMarks(
    pairs.map(([a, b, type]) => ({ type, from: outAt[a.pos + a.len] ?? 0, to: outAt[b.pos] ?? 0 })),
    out.length,
  );
  return { text: out, marks };
}

const DELIMITER: Record<MarkType, string> = { bold: '**', italic: '*', underline: '_' };

/** Inverse of `parseEmphasis`. Marks are trimmed to non-space chars so delimiters stay valid. */
export function applyEmphasis(text: string, marks: readonly Mark[] | undefined): string {
  const trimmed = normalizeMarks(marks, text.length).flatMap((m) => {
    let { from, to } = m;
    while (from < to && /\s/.test(text.charAt(from))) from++;
    while (to > from && /\s/.test(text.charAt(to - 1))) to--;
    return to > from ? [{ type: m.type, from, to }] : [];
  });
  const active = (i: number) =>
    new Set(trimmed.filter((m) => m.from <= i && i < m.to).map((m) => m.type));
  const delimiters = (set: Set<MarkType>) =>
    set.has('bold') && set.has('italic')
      ? `***${set.has('underline') ? DELIMITER.underline : ''}`
      : [...set].map((k) => DELIMITER[k]).join('');

  let out = '';
  let prev = new Set<MarkType>();
  for (let i = 0; i <= text.length; i++) {
    const cur = i < text.length ? active(i) : new Set<MarkType>();
    const closing = new Set([...prev].filter((k) => !cur.has(k)));
    const opening = new Set([...cur].filter((k) => !prev.has(k)));
    out += delimiters(closing) + delimiters(opening);
    if (i < text.length) {
      const ch = text.charAt(i);
      out += /[*_\\]/.test(ch) ? `\\${ch}` : ch;
    }
    prev = cur;
  }
  return out;
}

// ---------------------------------------------------------------- parse

const TITLE_KEYS = new Set([
  'title',
  'credit',
  'author',
  'authors',
  'source',
  'notes',
  'draft date',
  'date',
  'contact',
  'copyright',
  'revision',
  'watermark',
  'font',
  'tl',
  'tc',
  'tr',
  'bl',
  'br',
]);

const HEADING = /^(?:INT|EXT|EST|INT\.?\/EXT|I\/E)(?:\.|\s)/i;
const SCENE_NUMBER = /\s*#([^#\n]+)#\s*$/;

function blank(text: string): string {
  return text.replace(/[^\n]/g, '');
}

function parseTitlePage(lines: string[], issues: FountainIssue[]): { page: TitlePage | null; next: number } {
  const first = /^([A-Za-z][A-Za-z ]*):/.exec(lines[0] ?? '');
  if (!first || !TITLE_KEYS.has((first[1] ?? '').toLowerCase())) return { page: null, next: 0 };
  const fields = new Map<string, string[]>();
  let key = '';
  let i = 0;
  for (; i < lines.length && (lines[i] ?? '').trim() !== ''; i++) {
    const line = lines[i] ?? '';
    const m = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/.exec(line);
    if (m && !/^\s/.test(line)) {
      key = (m[1] ?? '').toLowerCase();
      fields.set(key, m[2] ? [m[2].trim()] : []);
    } else if (key !== '') {
      fields.get(key)?.push(line.trim());
    } else {
      issues.push({ line: i + 1, severity: 'error', message: 'Linha inválida na página de título.' });
    }
  }
  const get = (keys: string[], sep = ' ') => {
    for (const k of keys) {
      const v = fields.get(k);
      if (v && v.length > 0) return v.join(sep);
    }
    return undefined;
  };
  const authors = get(['authors', 'author']);
  const credit = get(['credit']);
  const source = get(['source']);
  const contact = get(['contact'], '\n');
  const date = get(['draft date', 'date']);
  const page: TitlePage = {
    title: get(['title']) ?? '',
    authors: authors ? [authors] : [],
    ...(credit !== undefined && { credit }),
    ...(source !== undefined && { source }),
    ...(contact !== undefined && { contact }),
    ...(date !== undefined && { date }),
  };
  return { page, next: i };
}

/**
 * Imports Fountain. Syntax that the product does not support (manual page breaks, scene
 * numbers) is dropped and reported in `issues`; the text is never rewritten.
 */
export function parseFountain(source: string): FountainDocument {
  const issues: FountainIssue[] = [];
  let text = source.replace(/\r\n?/g, '\n');
  text = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (/\/\*/.test(text)) {
    const line = text.slice(0, text.indexOf('/*')).split('\n').length;
    issues.push({ line, severity: 'error', message: 'Comentário /* */ não fechado.' });
    text = text.replace(/\/\*[\s\S]*$/, blank);
  }
  text = text.replace(/\[\[[\s\S]*?\]\]/g, blank);

  const all = text.split('\n');
  const { page, next } = parseTitlePage(all, issues);
  const lines = all;
  const isBlankAt = (k: number) => k < 0 || k >= lines.length || (lines[k] ?? '').trim() === '';

  const blocks: Block[] = [];
  const starts: number[] = [];
  const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
  const emphasised = (type: Block['type'], raw: string, column?: 'left' | 'right'): Block => {
    const p = parseEmphasis(tidy(raw));
    return {
      type,
      text: p.text,
      ...(p.marks.length > 0 && { marks: p.marks }),
      ...(column && { column }),
    };
  };
  const literal = (type: Block['type'], text: string): Block => ({ type, text: tidy(text) });

  let lastSpeech: { start: number; end: number } | null = null;

  const speech = (i: number, nameLine: string): number => {
    const dual = /\s*\^$/.test(nameLine);
    const name = nameLine.replace(/\s*\^$/, '').trim();
    const start = blocks.length;
    let column: 'right' | undefined;
    if (dual) {
      if (lastSpeech && lastSpeech.end === start) {
        const left = blocks[lastSpeech.start];
        if (left) blocks[lastSpeech.start] = { ...left, column: 'left' };
        column = 'right';
      } else {
        issues.push({ line: i + 1, severity: 'warning', message: 'Diálogo duplo sem fala anterior.' });
      }
    }
    blocks.push({ ...literal('character', name), ...(column && { column }) });
    let dialogue: string[] = [];
    const flush = () => {
      if (dialogue.length > 0) blocks.push(emphasised('dialogue', dialogue.join(' ')));
      dialogue = [];
    };
    let k = i + 1;
    for (; !isBlankAt(k); k++) {
      const line = (lines[k] ?? '').trim();
      if (isParentheticalLine(line)) {
        flush();
        blocks.push(emphasised('parenthetical', line));
      } else {
        dialogue.push(line.replace(/^~/, ''));
      }
    }
    flush();
    lastSpeech = { start, end: blocks.length };
    return k;
  };

  const paragraph = (i: number, firstOverride?: string): number => {
    const parts: string[] = [];
    let k = i;
    for (; !isBlankAt(k); k++) {
      const line = (lines[k] ?? '').trim();
      parts.push(k === i && firstOverride !== undefined ? firstOverride : line);
    }
    blocks.push(emphasised(isShotLine(parts[0] ?? '') && parts.length === 1 ? 'shot' : 'action', parts.join(' ')));
    return k;
  };

  for (let i = next; i < lines.length; ) {
    const t = (lines[i] ?? '').trim();
    const prevBlank = isBlankAt(i - 1);
    let consumedTo = i + 1;
    if (t === '') {
      i++;
      continue;
    }
    if (/^={3,}$/.test(t)) {
      issues.push({
        line: i + 1,
        severity: 'error',
        message: 'Quebra de página manual não é suportada; a paginação é automática.',
      });
    } else if (t.startsWith('#') || (t.startsWith('=') && !t.startsWith('=='))) {
      // sections and synopses are outline notes, not script content
    } else if (t.startsWith('.') && !t.startsWith('..')) {
      blocks.push(literal('scene-heading', stripSceneNumber(t.slice(1).trim(), i, issues)));
    } else if (t.startsWith('!')) {
      consumedTo = paragraph(i, t.slice(1).trim());
    } else if (t.startsWith('>')) {
      if (t.endsWith('<')) blocks.push(emphasised('action', t.slice(1, -1).trim()));
      else blocks.push(literal('transition', t.slice(1).trim()));
    } else if (t.startsWith('@')) {
      consumedTo = speech(i, t.slice(1).trim());
    } else if (prevBlank && HEADING.test(t)) {
      blocks.push(literal('scene-heading', stripSceneNumber(t, i, issues)));
    } else if (prevBlank && isBlankAt(i + 1) && isUpperCase(t) && classifyTransition(t) !== null) {
      blocks.push(literal('transition', t));
    } else if (prevBlank && !isBlankAt(i + 1) && isCharacterLine(t)) {
      consumedTo = speech(i, t);
    } else if (isShotLine(t)) {
      blocks.push(emphasised('shot', t));
    } else {
      consumedTo = paragraph(i);
    }
    while (starts.length < blocks.length) starts.push(i);
    i = Math.max(consumedTo, i + 1);
  }

  return { blocks, titlePage: page, issues: issues.sort((a, b) => a.line - b.line), lines: starts };
}

function stripSceneNumber(text: string, line: number, issues: FountainIssue[]): string {
  if (!SCENE_NUMBER.test(text)) return text;
  issues.push({
    line: line + 1,
    severity: 'warning',
    message: 'Número de cena ignorado: o perfil spec não numera cenas.',
  });
  return text.replace(SCENE_NUMBER, '');
}

function isCharacterLine(line: string): boolean {
  const t = line.replace(/\s*\^$/, '');
  if (t === '' || isParentheticalLine(t) || /[:]$/.test(t)) return false;
  if (isSceneHeading(t) || HEADING.test(t) || classifyTransition(t) !== null) return false;
  const { name } = parseCharacterCue(t);
  return name !== '' && isUpperCase(name);
}

// ---------------------------------------------------------------- export

const SPEECH = new Set<Block['type']>(['character', 'parenthetical', 'dialogue']);

function actionNeedsForce(text: string): boolean {
  return (
    /^[.@>~#=![]/.test(text) ||
    HEADING.test(text) ||
    isUpperCase(text) ||
    classifyTransition(text) !== null
  );
}

/** Exports blocks as Fountain. Blocks that plain Fountain would misread are forced with a prefix. */
export function toFountain(blocks: readonly Block[], titlePage?: TitlePage | null): string {
  const out: string[] = [];
  if (titlePage) {
    const t: string[] = [];
    if (titlePage.title) t.push(`Title: ${titlePage.title}`);
    if (titlePage.credit) t.push(`Credit: ${titlePage.credit}`);
    if (titlePage.source) t.push(`Source: ${titlePage.source}`);
    if (titlePage.authors.length > 0) t.push(`Author: ${titlePage.authors.join(', ')}`);
    if (titlePage.date) t.push(`Draft date: ${titlePage.date}`);
    if (titlePage.contact) {
      const [first, ...more] = titlePage.contact.split('\n');
      t.push(`Contact: ${first ?? ''}`, ...more.map((m) => `    ${m}`));
    }
    if (t.length > 0) out.push(t.join('\n'));
  }

  let speechLines: string[] = [];
  const flushSpeech = () => {
    if (speechLines.length > 0) out.push(speechLines.join('\n'));
    speechLines = [];
  };

  blocks.forEach((b, i) => {
    const body = applyEmphasis(b.text, b.marks);
    if (SPEECH.has(b.type)) {
      if (b.type === 'character') {
        flushSpeech();
        const prev = blocks.slice(0, i).reverse().find((x) => x.type === 'character');
        const caret = b.column === 'right' && prev?.column === 'left' ? ' ^' : '';
        const name = isUpperCase(parseCharacterCue(b.text).name) ? b.text : `@${b.text}`;
        speechLines.push(`${name}${caret}`);
      } else {
        speechLines.push(body);
      }
      return;
    }
    flushSpeech();
    switch (b.type) {
      case 'scene-heading':
        out.push(isSceneHeading(b.text) && HEADING.test(b.text) ? b.text : `.${b.text}`);
        break;
      case 'transition':
        out.push(isUpperCase(b.text) && /\sTO:$/.test(b.text) ? b.text : `> ${b.text}`);
        break;
      case 'shot':
        out.push(isUpperCase(b.text) ? `!${body}` : body);
        break;
      default:
        out.push(actionNeedsForce(b.text) ? `!${body}` : body);
    }
  });
  flushSpeech();
  return out.length > 0 ? `${out.join('\n\n')}\n` : '';
}
