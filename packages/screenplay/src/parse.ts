import type { Block } from './block';
import type { ElementType } from './constants';
import { isUpperCase } from './text';
import {
  SCENE_PREFIXES,
  SHOT_PREFIXES,
  TRANSITIONS,
  type TransitionKind,
} from './vocabulary';

export interface SceneHeading {
  /** Canonical prefix as typed (`INT.`, `EXT.`, `INT./EXT.`, `I/E.`) or null when missing. */
  readonly prefix: string | null;
  readonly location: string;
  /** Text after the last ` - `, without modifiers; null when the separator is missing. */
  readonly time: string | null;
  /** Trailing parenthesised modifiers, e.g. `FLASHBACK` in `INT. COZINHA - DAY (FLASHBACK)`. */
  readonly modifiers: readonly string[];
  readonly endsWithPeriod: boolean;
}

const TIME_SEPARATOR = ' - ';

export function parseSceneHeading(text: string): SceneHeading {
  let rest = text.trim();
  const modifiers: string[] = [];
  for (let m = /\s*\(([^()]*)\)\s*$/.exec(rest); m; m = /\s*\(([^()]*)\)\s*$/.exec(rest)) {
    modifiers.unshift((m[1] ?? '').trim());
    rest = rest.slice(0, m.index);
  }

  const upper = rest.toUpperCase();
  const prefix = SCENE_PREFIXES.find((p) => upper === p || upper.startsWith(`${p} `)) ?? null;
  if (prefix !== null) rest = rest.slice(prefix.length).trim();
  const endsWithPeriod = rest.endsWith('.');

  const cut = rest.lastIndexOf(TIME_SEPARATOR);
  const time = cut >= 0 ? rest.slice(cut + TIME_SEPARATOR.length).trim() : '';
  return {
    prefix,
    location: (cut >= 0 ? rest.slice(0, cut) : rest).trim(),
    time: time === '' ? null : time,
    modifiers,
    endsWithPeriod,
  };
}

export function isSceneHeading(text: string): boolean {
  return parseSceneHeading(text).prefix !== null;
}

export interface CharacterCue {
  readonly name: string;
  /** Parenthesised extensions in order, without the parentheses. */
  readonly extensions: readonly string[];
  readonly continued: boolean;
}

const CONTD = /^CONT['’]D$/i;

export function parseCharacterCue(text: string): CharacterCue {
  const trimmed = text.trim();
  const m = /^(.*?)((?:\s*\([^()]*\))*)$/.exec(trimmed);
  const name = (m?.[1] ?? trimmed).trim();
  const extensions = [...(m?.[2] ?? '').matchAll(/\(([^()]*)\)/g)].map((e) => (e[1] ?? '').trim());
  return { name, extensions, continued: extensions.some((e) => CONTD.test(e)) };
}

/** Identity of a character across the script: name only, no extensions, upper case. */
export function characterKey(text: string): string {
  return parseCharacterCue(text).name.toUpperCase();
}

export interface TransitionInfo {
  readonly kind: TransitionKind;
  /** `FADE IN:` is the only transition aligned to the left margin. */
  readonly align: 'left' | 'right';
}

const KNOWN_TRANSITIONS = new Map(
  Object.values(TRANSITIONS)
    .flat()
    .map((t) => [t.text, t.kind] as const),
);

/** Returns null when the text is not a transition. Accepts both vocabularies. */
export function classifyTransition(text: string): TransitionInfo | null {
  const t = text.trim().replace(/\s+/g, ' ').toUpperCase();
  let kind: TransitionKind | undefined = KNOWN_TRANSITIONS.get(t);
  if (kind === undefined) {
    if (/^FADE (OUT|TO BLACK)\.$/.test(t)) kind = 'fade-out';
    else if (/^[A-ZÀ-Ý][A-ZÀ-Ý .'-]* (TO|PARA):$/.test(t)) kind = 'cut';
  }
  if (kind === undefined) return null;
  return { kind, align: kind === 'fade-in' ? 'left' : 'right' };
}

const CLOSING_LINE = /^(THE END|END|FIM)\.?$/;

/** `THE END`, `END` or `FIM`, with or without a final period, in any case. */
export function isClosingText(text: string): boolean {
  return CLOSING_LINE.test(text.trim().replace(/\s+/g, ' ').toUpperCase());
}

/**
 * The closing mark of the script: the last block, when it is an action (or a transition typed by
 * mistake) that only says `THE END`, `END` or `FIM`. It is centred in the text area instead of
 * following the geometry of its element.
 */
export function isClosingBlock(blocks: readonly Block[], index: number): boolean {
  const block = blocks[index];
  return (
    index === blocks.length - 1 &&
    block !== undefined &&
    (block.type === 'action' || block.type === 'transition') &&
    isClosingText(block.text)
  );
}

export function isShotLine(text: string): boolean {
  const t = text.trimStart();
  return SHOT_PREFIXES.some((p) => t.startsWith(p));
}

export function isParentheticalLine(text: string): boolean {
  return /^\(.*\)$/.test(text.trim());
}

/** Heuristic used only when importing plain text, where element types are not explicit. */
function looksLikeCharacter(line: string): boolean {
  const t = line.trim();
  if (t === '' || isParentheticalLine(t) || /[.:!?]$/.test(t)) return false;
  if (isSceneHeading(t) || classifyTransition(t) !== null || isShotLine(t)) return false;
  const { name } = parseCharacterCue(t);
  return name !== '' && isUpperCase(name);
}

function parseParagraph(lines: readonly string[], out: Block[]): void {
  const [first, ...rest] = lines;
  if (first === undefined) return;

  if (isSceneHeading(first)) {
    out.push({ type: 'scene-heading', text: first });
    parseParagraph(rest, out);
  } else if (classifyTransition(first) !== null) {
    out.push({ type: 'transition', text: first });
    parseParagraph(rest, out);
  } else if (isShotLine(first)) {
    out.push({ type: 'shot', text: first });
    parseParagraph(rest, out);
  } else if (rest.length > 0 && looksLikeCharacter(first)) {
    out.push({ type: 'character', text: first });
    let dialogue: string[] = [];
    const flush = () => {
      if (dialogue.length > 0) out.push({ type: 'dialogue', text: dialogue.join(' ') });
      dialogue = [];
    };
    for (const line of rest) {
      if (isParentheticalLine(line)) {
        flush();
        out.push({ type: 'parenthetical', text: line });
      } else {
        dialogue.push(line);
      }
    }
    flush();
  } else {
    out.push({ type: 'action', text: lines.join(' ') });
  }
}

/**
 * Infers blocks from plain text: paragraphs are separated by blank lines, a character cue
 * owns the lines right below it. Soft line breaks inside a paragraph become spaces.
 * Not a Fountain parser.
 */
export function parsePlainText(source: string): Block[] {
  const out: Block[] = [];
  let lines: string[] = [];
  const flush = () => {
    parseParagraph(lines, out);
    lines = [];
  };
  for (const raw of source.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (line === '') flush();
    else lines.push(line);
  }
  flush();
  return out;
}

const SPEECH_TYPES: ReadonlySet<ElementType> = new Set(['character', 'parenthetical', 'dialogue']);

/** Inverse of `parsePlainText`: speech blocks stay together, other blocks are separated by a blank line. */
export function serializePlainText(blocks: readonly Block[]): string {
  let out = '';
  blocks.forEach((b, i) => {
    const prev = blocks[i - 1];
    if (prev !== undefined) {
      const sameSpeech = SPEECH_TYPES.has(prev.type) && SPEECH_TYPES.has(b.type) && b.type !== 'character';
      out += sameSpeech ? '\n' : '\n\n';
    }
    out += b.text;
  });
  return out === '' ? '' : `${out}\n`;
}
