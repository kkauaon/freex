import { describe, expect, it } from 'vitest';
import {
  blocksToDocument,
  documentToBlocks,
  nodeToScriptDocument,
  normalizeBlocks,
  scriptDocumentToNode,
  scriptSchema,
  validateDocument,
  type Block,
} from './index';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Arbitrary, usually invalid, flat sequences: the editor must be able to carry any of them. */
function randomBlocks(next: () => number): Block[] {
  const types: Block['type'][] = [
    'scene-heading',
    'action',
    'character',
    'parenthetical',
    'dialogue',
    'transition',
    'shot',
  ];
  return Array.from({ length: Math.floor(next() * 14) }, () => {
    const type = types[Math.floor(next() * types.length)] ?? 'action';
    const text = next() < 0.2 ? '' : `texto ${Math.floor(next() * 99)}`;
    const column = type === 'character' && next() < 0.5 ? (next() < 0.5 ? 'left' : 'right') : undefined;
    return {
      type,
      text,
      ...(text.length > 3 && next() < 0.3 && { marks: [{ type: 'bold' as const, from: 1, to: 3 }] }),
      ...(column && { column }),
    };
  });
}

describe('scriptSchema', () => {
  it('accepts the documents built from any flat sequence', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const doc = blocksToDocument(randomBlocks(rng(seed)));
      expect(validateDocument(doc)).toEqual([]);
      // throws when the tree does not satisfy the schema content expressions
      expect(() => scriptDocumentToNode(doc)).not.toThrow();
    }
  });

  it('round-trips the canonical JSON', () => {
    const blocks: Block[] = [
      { type: 'scene-heading', text: 'INT. SALA - DIA' },
      { type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 0, to: 3 }] },
      { type: 'character', text: 'ANA', column: 'left' },
      { type: 'parenthetical', text: '(baixo)' },
      { type: 'dialogue', text: 'Eu vou.' },
      { type: 'character', text: 'JOÃO', column: 'right' },
      { type: 'dialogue', text: 'Eu fico.' },
      { type: 'transition', text: 'CUT TO:' },
    ];
    const doc = blocksToDocument(blocks);
    const node = scriptDocumentToNode(doc);
    expect(nodeToScriptDocument(node)).toEqual(doc);
    expect(documentToBlocks(nodeToScriptDocument(node))).toEqual(blocks);
  });

  it('rejects trees that break the speech grammar', () => {
    const t = (text: string) => [{ type: 'text', text }];
    const bad = (content: unknown[]) =>
      scriptDocumentToNode({ schemaVersion: 1, type: 'doc', content: content as never });
    // dialogue outside a speech
    expect(() => bad([{ type: 'dialogue', content: t('x') }])).toThrow();
    // speech without dialogue
    expect(() => bad([{ type: 'speech', content: [{ type: 'character', content: t('A') }] }])).toThrow();
    // parenthetical at the end of a speech
    expect(() =>
      bad([
        {
          type: 'speech',
          content: [
            { type: 'character' },
            { type: 'dialogue' },
            { type: 'parenthetical' },
          ],
        },
      ]),
    ).toThrow();
    // dual dialogue with one speech
    expect(() =>
      bad([
        {
          type: 'dual_dialogue',
          content: [{ type: 'speech', content: [{ type: 'character' }, { type: 'dialogue' }] }],
        },
      ]),
    ).toThrow();
  });

  it('keeps marks on text nodes and refuses unknown marks', () => {
    const doc = blocksToDocument([
      { type: 'action', text: 'Ana', marks: [{ type: 'italic', from: 0, to: 3 }] },
    ]);
    const node = scriptDocumentToNode(doc);
    expect(node.firstChild?.firstChild?.marks.map((m) => m.type.name)).toEqual(['italic']);
    expect(() =>
      scriptDocumentToNode({
        schemaVersion: 1,
        type: 'doc',
        content: [{ type: 'action', content: [{ type: 'text', text: 'x', marks: [{ type: 'strike' }] }] }] as never,
      }),
    ).toThrow();
  });

  it('exposes the element types as data-element attributes', () => {
    expect(scriptSchema.nodes.action?.spec.toDOM?.(scriptSchema.nodes.action.create())).toEqual([
      'p',
      { 'data-element': 'action' },
      0,
    ]);
  });
});

describe('normalizeBlocks', () => {
  it('reports where each block came from', () => {
    const { blocks, origin } = normalizeBlocks([
      { type: 'dialogue', text: 'a' },
      { type: 'character', text: 'ANA' },
      { type: 'action', text: 'b' },
    ]);
    expect(blocks.map((b) => b.type)).toEqual([
      'character',
      'dialogue',
      'character',
      'dialogue',
      'action',
    ]);
    expect(origin).toEqual([null, 0, 1, null, 2]);
  });

  it('is the identity on valid input and idempotent', () => {
    const valid: Block[] = [
      { type: 'action', text: 'a' },
      { type: 'character', text: 'ANA' },
      { type: 'parenthetical', text: '(x)' },
      { type: 'dialogue', text: 'b' },
    ];
    const once = normalizeBlocks(valid);
    expect(once.blocks).toEqual(valid);
    expect(once.origin).toEqual([0, 1, 2, 3]);
    expect(normalizeBlocks(once.blocks).blocks).toEqual(once.blocks);
  });

  it('adds a dialogue after a trailing parenthetical', () => {
    const { blocks } = normalizeBlocks([
      { type: 'character', text: 'ANA' },
      { type: 'dialogue', text: 'a' },
      { type: 'parenthetical', text: '(x)' },
    ]);
    expect(blocks.map((b) => b.type)).toEqual(['character', 'dialogue', 'parenthetical', 'dialogue']);
  });

  it('keeps columns only on adjacent left/right pairs', () => {
    const { blocks } = normalizeBlocks([
      { type: 'character', text: 'A', column: 'left' },
      { type: 'dialogue', text: 'a' },
      { type: 'action', text: 'x' },
      { type: 'character', text: 'B', column: 'right' },
      { type: 'dialogue', text: 'b' },
    ]);
    expect(blocks.filter((b) => b.type === 'character').map((b) => b.column)).toEqual([undefined, undefined]);
  });
});
