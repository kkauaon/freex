import { ELEMENT_TYPES, type Block, type Mark, type MarkType } from '@freex/screenplay';
import { EMPTY_COVER, type CoverForm } from './editor-model';

/** Unsent draft kept in the browser: a per-device convenience, never the source of truth. */
export const DRAFT_KEY = 'freex:draft:v2';
/** The first editor kept its Fountain text under this key. */
export const LEGACY_DRAFT_KEY = 'freex:draft';

export interface Draft {
  readonly version: 2;
  readonly blocks: Block[];
  readonly cover: CoverForm;
  /** When this browser last saved the draft (epoch ms); drafts from before this field have none. */
  readonly savedAt?: number;
}

const MARK_TYPES: readonly MarkType[] = ['bold', 'italic', 'underline'];
const MAX_BLOCKS = 20_000;
const MAX_TEXT = 10_000;

function isMark(m: unknown, length: number): m is Mark {
  if (typeof m !== 'object' || m === null) return false;
  const x = m as Record<string, unknown>;
  return (
    MARK_TYPES.includes(x.type as MarkType) &&
    Number.isInteger(x.from) &&
    Number.isInteger(x.to) &&
    (x.from as number) >= 0 &&
    (x.to as number) <= length
  );
}

function sanitizeBlock(b: unknown): Block | null {
  if (typeof b !== 'object' || b === null) return null;
  const x = b as Record<string, unknown>;
  if (!ELEMENT_TYPES.includes(x.type as Block['type'])) return null;
  if (typeof x.text !== 'string' || x.text.length > MAX_TEXT) return null;
  const text = x.text.replace(/[\r\n]+/g, ' ');
  const marks = Array.isArray(x.marks) ? x.marks.filter((m) => isMark(m, text.length)) : [];
  const column = x.column === 'left' || x.column === 'right' ? x.column : undefined;
  return {
    type: x.type as Block['type'],
    text,
    ...(marks.length > 0 && { marks: marks as Mark[] }),
    ...(column && { column }),
  };
}

function sanitizeCover(c: unknown): CoverForm {
  if (typeof c !== 'object' || c === null) return EMPTY_COVER;
  const x = c as Record<string, unknown>;
  const s = (k: keyof CoverForm) => (typeof x[k] === 'string' ? (x[k] as string).slice(0, 1_000) : '');
  return {
    title: s('title'),
    credit: s('credit'),
    authors: s('authors'),
    source: s('source'),
    contact: s('contact'),
    date: s('date'),
  };
}

export function serializeDraft(blocks: readonly Block[], cover: CoverForm, savedAt?: number): string {
  const draft: Draft = { version: 2, blocks: [...blocks], cover, ...(savedAt !== undefined && { savedAt }) };
  return JSON.stringify(draft);
}

/** Reads a stored draft; anything unexpected yields null so the editor starts from the sample. */
export function parseDraft(raw: string | null): Draft | null {
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null) return null;
  const x = json as Record<string, unknown>;
  if (x.version !== 2 || !Array.isArray(x.blocks) || x.blocks.length > MAX_BLOCKS) return null;
  const blocks: Block[] = [];
  for (const b of x.blocks) {
    const ok = sanitizeBlock(b);
    if (!ok) return null;
    blocks.push(ok);
  }
  const savedAt = typeof x.savedAt === 'number' && Number.isFinite(x.savedAt) && x.savedAt > 0 ? x.savedAt : undefined;
  return { version: 2, blocks, cover: sanitizeCover(x.cover), ...(savedAt !== undefined && { savedAt }) };
}
