import { describe, expect, it } from 'vitest';
import {
  blocksToDocument,
  documentToBlocks,
  parsePlainText,
  validateDocument,
  type Block,
  type ScriptDocument,
} from './index';

describe('blocksToDocument', () => {
  it('matches the example in modelo-de-dados.md 5.1', () => {
    const doc = blocksToDocument([
      { type: 'scene-heading', text: 'INT. COZINHA - NOITE' },
      { type: 'action', text: 'Ana abre a geladeira.' },
      { type: 'character', text: 'ANA' },
      { type: 'dialogue', text: 'Você comeu?' },
      { type: 'transition', text: 'CUT TO:' },
    ]);
    expect(doc).toEqual({
      schemaVersion: 1,
      type: 'doc',
      content: [
        {
          type: 'scene_heading',
          attrs: { sceneNumber: null, revisionColor: null },
          content: [{ type: 'text', text: 'INT. COZINHA - NOITE' }],
        },
        { type: 'action', content: [{ type: 'text', text: 'Ana abre a geladeira.' }] },
        {
          type: 'speech',
          content: [
            { type: 'character', content: [{ type: 'text', text: 'ANA' }] },
            { type: 'dialogue', content: [{ type: 'text', text: 'Você comeu?' }] },
          ],
        },
        { type: 'transition', content: [{ type: 'text', text: 'CUT TO:' }] },
      ],
    });
    expect(validateDocument(doc)).toEqual([]);
  });

  it('groups parentheticals and several dialogue blocks into one speech', () => {
    const doc = blocksToDocument([
      { type: 'character', text: 'ANA' },
      { type: 'parenthetical', text: '(baixo)' },
      { type: 'dialogue', text: 'Um.' },
      { type: 'parenthetical', text: '(beat)' },
      { type: 'dialogue', text: 'Dois.' },
    ]);
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0]?.content?.map((n) => n.type)).toEqual([
      'character',
      'parenthetical',
      'dialogue',
      'parenthetical',
      'dialogue',
    ]);
  });

  it('wraps a left and right column in dual_dialogue', () => {
    const doc = blocksToDocument([
      { type: 'character', text: 'ANA', column: 'left' },
      { type: 'dialogue', text: 'Eu vou.' },
      { type: 'character', text: 'JOÃO', column: 'right' },
      { type: 'dialogue', text: 'Eu fico.' },
      { type: 'action', text: 'Silêncio.' },
    ]);
    expect(doc.content.map((n) => n.type)).toEqual(['dual_dialogue', 'action']);
    expect(doc.content[0]?.content?.map((n) => n.type)).toEqual(['speech', 'speech']);
    expect(validateDocument(doc)).toEqual([]);
  });

  it('splits marked text into text nodes with marks', () => {
    const doc = blocksToDocument([
      {
        type: 'action',
        text: 'Ana entra agora',
        marks: [
          { type: 'bold', from: 4, to: 9 },
          { type: 'italic', from: 6, to: 15 },
        ],
      },
    ]);
    expect(doc.content[0]?.content).toEqual([
      { type: 'text', text: 'Ana ' },
      { type: 'text', text: 'en', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'tra', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { type: 'text', text: ' agora', marks: [{ type: 'italic' }] },
    ]);
  });

  it('always produces a valid document', () => {
    const doc = blocksToDocument([
      { type: 'dialogue', text: 'Sem personagem.' },
      { type: 'character', text: 'ANA' },
      { type: 'action', text: 'Sem diálogo.' },
      { type: 'character', text: 'JOÃO', column: 'left' },
      { type: 'dialogue', text: 'Coluna sozinha.' },
      { type: 'scene-heading', text: '' },
    ]);
    expect(validateDocument(doc)).toEqual([]);
  });
});

describe('documentToBlocks', () => {
  const sample: Block[] = [
    { type: 'scene-heading', text: 'INT. SALA - DIA' },
    { type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 4, to: 9 }] },
    { type: 'character', text: 'ANA', column: 'left' },
    { type: 'parenthetical', text: '(baixo)' },
    { type: 'dialogue', text: 'Eu vou.' },
    { type: 'character', text: 'JOÃO', column: 'right' },
    { type: 'dialogue', text: 'Eu fico.' },
    { type: 'character', text: 'ANA' },
    { type: 'dialogue', text: 'Tá.' },
    { type: 'shot', text: 'CLOSE ON: a chave.' },
    { type: 'transition', text: 'FADE OUT.' },
  ];

  it('round-trips a valid sequence, marks and columns included', () => {
    expect(documentToBlocks(blocksToDocument(sample))).toEqual(sample);
  });

  it('round-trips plain text parsed into blocks', () => {
    const blocks = parsePlainText('INT. SALA - DIA\n\nAna entra.\n\nANA\n(baixo)\nOi.\n\nCUT TO:');
    expect(documentToBlocks(blocksToDocument(blocks))).toEqual(blocks);
  });

  it('survives a JSON round trip', () => {
    const doc = JSON.parse(JSON.stringify(blocksToDocument(sample))) as ScriptDocument;
    expect(documentToBlocks(doc)).toEqual(sample);
  });

  it('rejects unknown node types instead of dropping text', () => {
    expect(() =>
      documentToBlocks({ schemaVersion: 1, type: 'doc', content: [{ type: 'mystery' }] }),
    ).toThrow(TypeError);
  });
});

describe('validateDocument (modelo-de-dados.md 5.3)', () => {
  const doc = (content: ScriptDocument['content']): ScriptDocument => ({
    schemaVersion: 1,
    type: 'doc',
    content,
  });
  const t = (text: string) => [{ type: 'text', text }];

  it('flags dialogue at the top level', () => {
    expect(validateDocument(doc([{ type: 'dialogue', content: t('x') }]))).toEqual([
      { path: [0], message: 'Personagem, parêntese e diálogo devem estar dentro de uma fala.' },
    ]);
  });

  it('flags a speech without dialogue or with two characters', () => {
    const issues = validateDocument(
      doc([
        { type: 'speech', content: [{ type: 'character', content: t('ANA') }] },
        {
          type: 'speech',
          content: [
            { type: 'character', content: t('ANA') },
            { type: 'character', content: t('JOÃO') },
            { type: 'dialogue', content: t('x') },
          ],
        },
      ]),
    );
    expect(issues.map((i) => i.path)).toEqual([[0], [1]]);
  });

  it('flags a parenthetical in the wrong place', () => {
    const issues = validateDocument(
      doc([
        {
          type: 'speech',
          content: [
            { type: 'character', content: t('ANA') },
            { type: 'dialogue', content: t('x') },
            { type: 'parenthetical', content: t('(fim)') },
          ],
        },
      ]),
    );
    expect(issues).toEqual([
      { path: [0, 2], message: 'Parêntese deve ficar entre personagem e diálogo, ou entre diálogos.' },
    ]);
  });

  it('flags dual dialogue without two speeches and text with line feeds', () => {
    const issues = validateDocument(
      doc([
        { type: 'dual_dialogue', content: [] },
        { type: 'action', content: t('a\nb') },
      ]),
    );
    expect(issues.map((i) => i.path)).toEqual([[0], [1]]);
    expect(JSON.stringify(issues)).not.toContain('a\\nb');
  });
});
