import { describe, expect, it } from 'vitest';
import type { Block } from '@freex/screenplay';
import { EMPTY_COVER } from './editor-model';
import { parseDraft, serializeDraft } from './draft';

const blocks: Block[] = [
  { type: 'scene-heading', text: 'INT. SALA - DIA' },
  { type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 0, to: 3 }] },
  { type: 'character', text: 'ANA', column: 'left' },
  { type: 'dialogue', text: 'Oi.' },
];

describe('draft', () => {
  it('round-trips blocks, marks, columns and the cover', () => {
    const cover = { ...EMPTY_COVER, title: 'Casa', authors: 'Ana' };
    expect(parseDraft(serializeDraft(blocks, cover))).toEqual({ version: 2, blocks, cover, profile: 'spec' });
  });

  it('keeps the profile, and drafts without one use the default', () => {
    expect(parseDraft(serializeDraft([], EMPTY_COVER, undefined, 'production'))?.profile).toBe('production');
    expect(parseDraft('{"version":2,"blocks":[]}')?.profile).toBe('spec');
    expect(parseDraft('{"version":2,"blocks":[],"profile":"x"}')?.profile).toBe('spec');
  });

  it('keeps the time of the last save, and ignores one that makes no sense', () => {
    expect(parseDraft(serializeDraft([], EMPTY_COVER, 1_760_000_000_000))?.savedAt).toBe(1_760_000_000_000);
    expect(parseDraft(serializeDraft([], EMPTY_COVER))?.savedAt).toBeUndefined();
    for (const bad of ['"ontem"', '-5', '0', 'null']) {
      expect(parseDraft(`{"version":2,"blocks":[],"savedAt":${bad}}`)?.savedAt).toBeUndefined();
    }
  });

  it('reads nothing from missing, broken or foreign data', () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft('not json')).toBeNull();
    expect(parseDraft('42')).toBeNull();
    expect(parseDraft('{"version":1,"blocks":[]}')).toBeNull();
    expect(parseDraft('{"version":2,"blocks":"x"}')).toBeNull();
  });

  it('rejects unknown elements and non-text content instead of loading them', () => {
    const bad = (b: unknown) => parseDraft(JSON.stringify({ version: 2, blocks: [b] }));
    expect(bad({ type: 'script', text: 'x' })).toBeNull();
    expect(bad({ type: 'action', text: 5 })).toBeNull();
    expect(bad(null)).toBeNull();
  });

  it('drops invalid marks and columns and removes line feeds', () => {
    const draft = parseDraft(
      JSON.stringify({
        version: 2,
        blocks: [
          {
            type: 'action',
            text: 'a\nb',
            marks: [
              { type: 'bold', from: 0, to: 99 },
              { type: 'strike', from: 0, to: 1 },
              { type: 'italic', from: 0, to: 2 },
            ],
            column: 'middle',
          },
        ],
      }),
    );
    expect(draft?.blocks).toEqual([{ type: 'action', text: 'a b', marks: [{ type: 'italic', from: 0, to: 2 }] }]);
    expect(draft?.cover).toEqual(EMPTY_COVER);
  });

  it('accepts an empty script', () => {
    expect(parseDraft(serializeDraft([], EMPTY_COVER))?.blocks).toEqual([]);
  });
});
