import { describe, expect, it } from 'vitest';
import { scriptDocumentToNode, blocksToDocument, type Block } from '@freex/screenplay';
import { closingDecoration, closingIndent } from './closing';

const decorations = (blocks: Block[]) => {
  const doc = scriptDocumentToNode(blocksToDocument(blocks));
  return closingDecoration(doc).find();
};

describe('closing mark', () => {
  it('centres the last block when it is FIM, END or THE END', () => {
    for (const text of ['FIM', 'End', 'The end.']) {
      const found = decorations([{ type: 'action', text: 'Ela sai.' }, { type: 'action', text }]);
      expect(found).toHaveLength(1);
    }
  });

  it('does nothing when it is not the last block or not a closing text', () => {
    expect(decorations([{ type: 'action', text: 'FIM' }, { type: 'action', text: 'Ela sai.' }])).toHaveLength(0);
    expect(decorations([{ type: 'action', text: 'FIM DE JOGO' }])).toHaveLength(0);
    expect(decorations([{ type: 'dialogue', text: 'FIM' }])).toHaveLength(0);
  });

  it('also centres a scene heading, which is what Enter creates after FADE OUT.', () => {
    expect(decorations([{ type: 'action', text: 'Ela sai.' }, { type: 'scene-heading', text: 'FIM' }])).toHaveLength(1);
  });

  it('uses the same column as the layout engine', () => {
    expect(closingIndent('FIM')).toBe(28);
    expect(closingIndent('THE END')).toBe(26);
    expect(closingIndent('END.')).toBe(28);
  });
});
