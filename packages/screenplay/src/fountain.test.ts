import { describe, expect, it } from 'vitest';
import {
  applyEmphasis,
  autoFixBlocks,
  normalizeBlock,
  normalizeMarks,
  parseEmphasis,
  parseFountain,
  remapMarks,
  toFountain,
  type Block,
} from './index';

describe('marks', () => {
  it('normalizeMarks clamps, drops empty ranges and merges', () => {
    expect(
      normalizeMarks(
        [
          { type: 'bold', from: -3, to: 4 },
          { type: 'bold', from: 4, to: 6 },
          { type: 'bold', from: 9, to: 9 },
          { type: 'italic', from: 2, to: 99 },
        ],
        8,
      ),
    ).toEqual([
      { type: 'bold', from: 0, to: 6 },
      { type: 'italic', from: 2, to: 8 },
    ]);
  });

  it('remapMarks follows removed characters', () => {
    // "ab  cd" -> "ab cd": source offset 3 (second space) is dropped
    expect(remapMarks([{ type: 'bold', from: 4, to: 6 }], [0, 1, 2, 4, 5])).toEqual([
      { type: 'bold', from: 3, to: 5 },
    ]);
  });

  it('normalizeBlock keeps marks on the same words when spacing collapses', () => {
    const b = normalizeBlock({
      type: 'action',
      text: '  Ana   entra  ,  sai',
      marks: [{ type: 'bold', from: 8, to: 13 }], // "entra"
    });
    expect(b.text).toBe('Ana entra, sai');
    expect(b.marks).toEqual([{ type: 'bold', from: 4, to: 9 }]);
    expect(b.text.slice(4, 9)).toBe('entra');
  });

  it('normalizeBlock keeps marks through upper-casing and returns the same object when unchanged', () => {
    const b = normalizeBlock({
      type: 'character',
      text: 'ana',
      marks: [{ type: 'italic', from: 0, to: 3 }],
    });
    expect(b).toEqual({ type: 'character', text: 'ANA', marks: [{ type: 'italic', from: 0, to: 3 }] });
    const same: Block = { type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 0, to: 3 }] };
    expect(normalizeBlock(same)).toBe(same);
    expect(autoFixBlocks([same])[0]).toBe(same);
  });
});

describe('Fountain emphasis', () => {
  it('parses bold, italic, bold italic and underline', () => {
    expect(parseEmphasis('a *b* **c** ***d*** _e_')).toEqual({
      text: 'a b c d e',
      marks: [
        { type: 'bold', from: 4, to: 5 },
        { type: 'bold', from: 6, to: 7 },
        { type: 'italic', from: 2, to: 3 },
        { type: 'italic', from: 6, to: 7 },
        { type: 'underline', from: 8, to: 9 },
      ],
    });
  });

  it('leaves unpaired delimiters and spaced asterisks literal', () => {
    expect(parseEmphasis('2 * 3 * 4').text).toBe('2 * 3 * 4');
    expect(parseEmphasis('*aberto').text).toBe('*aberto');
    expect(parseEmphasis('snake_case').text).toBe('snake_case');
  });

  it('honours escapes', () => {
    expect(parseEmphasis('a \\*b\\* c')).toEqual({ text: 'a *b* c', marks: [] });
  });

  it('round-trips through applyEmphasis', () => {
    const cases: [string, Block['marks']][] = [
      ['Ana entra agora', [{ type: 'bold', from: 4, to: 9 }]],
      ['Ana entra agora', [{ type: 'italic', from: 0, to: 3 }, { type: 'underline', from: 4, to: 15 }]],
      ['Ana entra agora', [{ type: 'bold', from: 0, to: 9 }, { type: 'italic', from: 4, to: 15 }]],
      ['a*b_c\\d', [{ type: 'bold', from: 0, to: 7 }]],
      ['tudo', [{ type: 'bold', from: 0, to: 4 }, { type: 'italic', from: 0, to: 4 }]],
    ];
    for (const [text, marks] of cases) {
      const back = parseEmphasis(applyEmphasis(text, marks));
      expect(back.text).toBe(text);
      expect(back.marks).toEqual(normalizeMarks(marks, text.length));
    }
  });

  it('never puts a delimiter next to whitespace', () => {
    const out = applyEmphasis('a b c', [{ type: 'bold', from: 1, to: 4 }]);
    expect(out).toBe('a **b** c');
  });
});

const SCRIPT = `Title: Casa Vazia
Credit: Written by
Author: Ana Souza
Draft date: 2026-10-23
Contact: ana@example.com

INT. COZINHA - NOITE

ANA (30s) abre a *geladeira*. Nada.
Ela **fecha** a porta.

ANA
(baixo)
Você comeu?

JOÃO ^
Não.

> FADE OUT.
`;

describe('parseFountain', () => {
  it('reads the title page and the elements', () => {
    const doc = parseFountain(SCRIPT);
    expect(doc.titlePage).toEqual({
      title: 'Casa Vazia',
      authors: ['Ana Souza'],
      credit: 'Written by',
      contact: 'ana@example.com',
      date: '2026-10-23',
    });
    expect(doc.blocks.map((b) => [b.type, b.text])).toEqual([
      ['scene-heading', 'INT. COZINHA - NOITE'],
      ['action', 'ANA (30s) abre a geladeira. Nada. Ela fecha a porta.'],
      ['character', 'ANA'],
      ['parenthetical', '(baixo)'],
      ['dialogue', 'Você comeu?'],
      ['character', 'JOÃO'],
      ['dialogue', 'Não.'],
      ['transition', 'FADE OUT.'],
    ]);
    const action = doc.blocks[1];
    const slice = (type: string) =>
      action?.marks?.filter((m) => m.type === type).map((m) => action.text.slice(m.from, m.to));
    expect(slice('italic')).toEqual(['geladeira']);
    expect(slice('bold')).toEqual(['fecha']);
    expect(doc.issues).toEqual([]);
  });

  it('maps every block to the source line where its element starts', () => {
    const doc = parseFountain(SCRIPT);
    expect(doc.lines).toHaveLength(doc.blocks.length);
    // line 7 (index 6) is the heading; the speech starts at the cue line
    expect(doc.lines[0]).toBe(6);
    expect(doc.lines[2]).toBe(doc.lines[3]);
    const sourceLines = SCRIPT.split('\n');
    expect(sourceLines[doc.lines[2] ?? 0]).toBe('ANA');
    expect(sourceLines[doc.lines[7] ?? 0]).toBe('> FADE OUT.');
  });

  it('turns ^ into dual dialogue columns', () => {
    const doc = parseFountain('ANA\nEu vou.\n\nJOÃO ^\nEu fico.\n');
    expect(doc.blocks.map((b) => [b.type, b.column])).toEqual([
      ['character', 'left'],
      ['dialogue', undefined],
      ['character', 'right'],
      ['dialogue', undefined],
    ]);
  });

  it('reports a dual marker without a previous speech', () => {
    const doc = parseFountain('INT. SALA - DIA\n\nANA ^\nOi.\n');
    expect(doc.issues).toEqual([
      { line: 3, severity: 'warning', message: 'Diálogo duplo sem fala anterior.' },
    ]);
    expect(doc.blocks.find((b) => b.type === 'character')?.column).toBeUndefined();
  });

  it('drops unsupported syntax and reports it without echoing the text', () => {
    const doc = parseFountain(
      'INT. SALA - DIA #12#\n\n===\n\nAna entra. [[nota]] Senha /* oculto */ ok.\n\n/* aberto',
    );
    expect(doc.blocks.map((b) => b.text)).toEqual(['INT. SALA - DIA', 'Ana entra. Senha ok.']);
    expect(doc.issues.map((i) => [i.line, i.severity])).toEqual([
      [1, 'warning'],
      [3, 'error'],
      [7, 'error'],
    ]);
    expect(JSON.stringify(doc.issues)).not.toContain('oculto');
  });

  it('supports forced elements', () => {
    const doc = parseFountain('.SUBIDA AO TELHADO\n\n!ANA CORRE\n\n@Ana\nOi.\n\n> CORTE <\n');
    expect(doc.blocks.map((b) => [b.type, b.text])).toEqual([
      ['scene-heading', 'SUBIDA AO TELHADO'],
      ['action', 'ANA CORRE'],
      ['character', 'Ana'],
      ['dialogue', 'Oi.'],
      ['action', 'CORTE'],
    ]);
  });

  it('does not turn an upper-case action line without dialogue into a character', () => {
    const doc = parseFountain('INT. SALA - DIA\n\nMOMENTS LATER\n\nAna sai.\n');
    expect(doc.blocks.map((b) => b.type)).toEqual(['scene-heading', 'action', 'action']);
  });

  it('empty input', () => {
    expect(parseFountain('')).toEqual({ blocks: [], titlePage: null, issues: [], lines: [] });
  });
});

describe('toFountain', () => {
  const blocks: Block[] = [
    { type: 'transition', text: 'FADE IN:' },
    { type: 'scene-heading', text: 'INT. COZINHA - NOITE' },
    { type: 'scene-heading', text: 'SUBIDA AO TELHADO' },
    {
      type: 'action',
      text: 'Ana abre a geladeira.',
      marks: [{ type: 'italic', from: 11, to: 20 }],
    },
    { type: 'action', text: 'SILÊNCIO' },
    { type: 'character', text: 'ANA', column: 'left' },
    { type: 'parenthetical', text: '(baixo)' },
    { type: 'dialogue', text: 'Você comeu?' },
    { type: 'character', text: 'JOÃO (V.O.)', column: 'right' },
    { type: 'dialogue', text: 'Não *comi*.' },
    { type: 'transition', text: 'CUT TO:' },
    { type: 'shot', text: 'CLOSE ON: a chave.' },
    { type: 'transition', text: 'FADE OUT.' },
  ];

  it('forces ambiguous elements and writes dual dialogue with ^', () => {
    const out = toFountain(blocks);
    expect(out).toContain('> FADE IN:');
    expect(out).toContain('.SUBIDA AO TELHADO');
    expect(out).toContain('!SILÊNCIO');
    expect(out).toContain('JOÃO (V.O.) ^');
    expect(out).toContain('Não \\*comi\\*.');
    expect(out).toContain('\nCUT TO:\n');
    expect(out).toContain('> FADE OUT.');
    expect(out).toContain('Ana abre a *geladeira*.');
  });

  it('round-trips through parseFountain', () => {
    const doc = parseFountain(toFountain(blocks));
    expect(doc.issues).toEqual([]);
    expect(doc.blocks).toEqual(blocks);
  });

  it('writes the title page', () => {
    const out = toFountain([], { title: 'Casa', authors: ['Ana', 'João'], date: '2026-10-23' });
    expect(out).toBe('Title: Casa\nAuthor: Ana, João\nDraft date: 2026-10-23\n');
    expect(parseFountain(out).titlePage).toMatchObject({ title: 'Casa', date: '2026-10-23' });
  });

  it('empty script', () => {
    expect(toFountain([])).toBe('');
  });
});
