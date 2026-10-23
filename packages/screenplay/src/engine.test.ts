import { describe, expect, it } from 'vitest';
import {
  autoFixBlocks,
  characterKey,
  checkPageRange,
  checkTitlePage,
  classifyTransition,
  countText,
  CPI,
  DUAL_DIALOGUE_BOX,
  ELEMENT_TYPES,
  hasBlockingIssues,
  listCharacters,
  listScenes,
  nextOnEnter,
  nextOnShiftTab,
  nextOnTab,
  normalizeText,
  PAGE,
  parseCharacterCue,
  parsePlainText,
  parseSceneHeading,
  serializePlainText,
  suggestCharacters,
  suggestTimes,
  suggestTransitions,
  validateBlocks,
  wrap,
  type Block,
} from './index';

const codes = (blocks: Block[], profile?: 'spec' | 'production') =>
  validateBlocks(blocks, { profile }).map((i) => i.code);

describe('element state machine (ux-e-interface.md 5.2)', () => {
  it('Enter', () => {
    expect(nextOnEnter('scene-heading', false)).toBe('action');
    expect(nextOnEnter('action', false)).toBe('action');
    expect(nextOnEnter('action', true)).toBe('scene-heading');
    expect(nextOnEnter('character', false)).toBe('dialogue');
    expect(nextOnEnter('character', true)).toBe('action');
    expect(nextOnEnter('dialogue', false)).toBe('action');
    expect(nextOnEnter('dialogue', true)).toBe('character');
    expect(nextOnEnter('transition', false)).toBe('scene-heading');
    expect(nextOnEnter('shot', true)).toBe('scene-heading');
  });

  it('Tab walks every element in order and wraps; Shift+Tab walks back', () => {
    const order = [
      'scene-heading',
      'action',
      'character',
      'parenthetical',
      'dialogue',
      'transition',
      'shot',
    ] as const;
    expect([...ELEMENT_TYPES]).toEqual([...order]);
    order.forEach((t, i) => {
      expect(nextOnTab(t)).toBe(order[(i + 1) % order.length]);
      expect(nextOnShiftTab(t)).toBe(order[(i + order.length - 1) % order.length]);
    });
    // seven presses in either direction come back to the start, visiting all seven elements
    for (const step of [nextOnTab, nextOnShiftTab]) {
      const seen = new Set<string>();
      let t: (typeof order)[number] = 'action';
      for (let i = 0; i < order.length; i++) {
        seen.add(t);
        t = step(t) as (typeof order)[number];
      }
      expect(seen.size).toBe(order.length);
      expect(t).toBe('action');
    }
  });

  it('every element has a transition for every key', () => {
    for (const t of ELEMENT_TYPES) {
      expect(ELEMENT_TYPES).toContain(nextOnEnter(t, false));
      expect(ELEMENT_TYPES).toContain(nextOnEnter(t, true));
      expect(ELEMENT_TYPES).toContain(nextOnTab(t));
      expect(ELEMENT_TYPES).toContain(nextOnShiftTab(t));
    }
  });
});

describe('dual dialogue geometry (normas-de-formatacao.md 5.8)', () => {
  it('matches inches from the page edge', () => {
    const edge = (cols: number) => PAGE.marginLeftIn + cols / CPI;
    const { left, right } = DUAL_DIALOGUE_BOX;
    expect(edge(left.character.indent)).toBeCloseTo(2.75);
    expect(edge(right.character.indent)).toBeCloseTo(5.75);
    expect(edge(left.parenthetical.indent)).toBeCloseTo(2.25);
    expect(edge(left.parenthetical.indent + left.parenthetical.width)).toBeCloseTo(4.0);
    expect(edge(right.parenthetical.indent)).toBeCloseTo(5.25);
    expect(edge(right.parenthetical.indent + right.parenthetical.width)).toBeCloseTo(7.25);
    expect(edge(left.dialogue.indent)).toBeCloseTo(2.0);
    expect(edge(left.dialogue.indent + left.dialogue.width)).toBeCloseTo(4.5);
    expect(edge(right.dialogue.indent)).toBeCloseTo(5.0);
    expect(edge(right.dialogue.indent + right.dialogue.width)).toBeCloseTo(7.5);
  });
});

describe('scene heading parser', () => {
  it('splits prefix, location and time on the last separator', () => {
    const h = parseSceneHeading('INT. ESCOLA - CORREDOR - MANHÃ');
    expect(h).toMatchObject({ prefix: 'INT.', location: 'ESCOLA - CORREDOR', time: 'MANHÃ' });
  });

  it('prefers the longest prefix and is case-insensitive', () => {
    expect(parseSceneHeading('INT./EXT. CARRO - CONTINUOUS').prefix).toBe('INT./EXT.');
    expect(parseSceneHeading('i/e. carro - dia').prefix).toBe('I/E.');
    expect(parseSceneHeading('int. sala - dia').prefix).toBe('INT.');
  });

  it('reports missing pieces', () => {
    expect(parseSceneHeading('INT COZINHA - NOITE').prefix).toBeNull();
    expect(parseSceneHeading('INT. COZINHA').time).toBeNull();
    expect(parseSceneHeading('INT. COZINHA - NOITE.').endsWithPeriod).toBe(true);
  });

  it('extracts trailing modifiers', () => {
    const h = parseSceneHeading('INT. COZINHA - DAY (FLASHBACK)');
    expect(h.time).toBe('DAY');
    expect(h.modifiers).toEqual(['FLASHBACK']);
  });
});

describe('character cue parser', () => {
  it('separates name and extensions', () => {
    expect(parseCharacterCue("ANA (V.O.) (CONT'D)")).toEqual({
      name: 'ANA',
      extensions: ['V.O.', "CONT'D"],
      continued: true,
    });
    expect(parseCharacterCue('JOÃO').extensions).toEqual([]);
  });

  it('key ignores extensions and case', () => {
    expect(characterKey("ana (o.s.)")).toBe('ANA');
  });
});

describe('transitions', () => {
  it('recognises both vocabularies and generic TO: forms', () => {
    expect(classifyTransition('CUT TO:')?.kind).toBe('cut');
    expect(classifyTransition('corta para:')?.kind).toBe('cut');
    expect(classifyTransition('FADE OUT.')?.kind).toBe('fade-out');
    expect(classifyTransition('FADE TO BLACK.')?.align).toBe('right');
    expect(classifyTransition('HARD CUT TO:')?.kind).toBe('cut');
    expect(classifyTransition('Ana sai.')).toBeNull();
  });

  it('FADE IN: is the only left-aligned transition', () => {
    expect(classifyTransition('FADE IN:')).toEqual({ kind: 'fade-in', align: 'left' });
    expect(classifyTransition('CUT TO:')?.align).toBe('right');
  });
});

describe('vocabulary autocomplete', () => {
  it('uses the script locale', () => {
    expect(suggestTimes('no', 'pt-BR')).toEqual(['NOITE']);
    expect(suggestTimes('no', 'en')).toEqual([]);
    expect(suggestTransitions('cu', 'en')).toEqual(['CUT TO:']);
    expect(suggestTransitions('cor', 'pt-BR')).toEqual(['CORTA PARA:']);
  });
});

describe('normalisation (8.3)', () => {
  it('fixes spacing without touching words', () => {
    expect(normalizeText('action', '  Ana\t entra  ,  sai .  ')).toBe('Ana entra, sai.');
  });

  it('upper-cases heading, character and transition only', () => {
    expect(normalizeText('scene-heading', 'int. sala - dia')).toBe('INT. SALA - DIA');
    expect(normalizeText('character', 'ana (v.o.)')).toBe('ANA (V.O.)');
    expect(normalizeText('transition', 'cut to :')).toBe('CUT TO:');
    expect(normalizeText('dialogue', 'Oi,  Ana')).toBe('Oi, Ana');
  });

  it('drops blank blocks at both ends and keeps untouched blocks as-is', () => {
    const keep: Block = { type: 'action', text: 'Ana entra.' };
    const out = autoFixBlocks([
      { type: 'action', text: '  ' },
      keep,
      { type: 'character', text: 'ana' },
      { type: 'action', text: '' },
    ]);
    expect(out).toEqual([keep, { type: 'character', text: 'ANA' }]);
    expect(out[0]).toBe(keep);
  });
});

describe('plain text', () => {
  const SRC = `INT. SALA - DIA

Maria entra e olha
em volta.

MARIA
(baixo)
Tem alguém
aqui?

CORTA PARA:`;

  it('infers element types', () => {
    expect(parsePlainText(SRC)).toEqual([
      { type: 'scene-heading', text: 'INT. SALA - DIA' },
      { type: 'action', text: 'Maria entra e olha em volta.' },
      { type: 'character', text: 'MARIA' },
      { type: 'parenthetical', text: '(baixo)' },
      { type: 'dialogue', text: 'Tem alguém aqui?' },
      { type: 'transition', text: 'CORTA PARA:' },
    ]);
  });

  it('does not turn a lone upper-case paragraph into a character', () => {
    expect(parsePlainText('MOMENTS LATER')).toEqual([{ type: 'action', text: 'MOMENTS LATER' }]);
    expect(parsePlainText('UM TIRO ECOA.\nAna corre.')[0]?.type).toBe('action');
  });

  it('recognises shots and handles CRLF', () => {
    expect(parsePlainText('CLOSE ON: a chave.\r\n')).toEqual([
      { type: 'shot', text: 'CLOSE ON: a chave.' },
    ]);
  });

  it('round-trips', () => {
    const blocks = parsePlainText(SRC);
    expect(parsePlainText(serializePlainText(blocks))).toEqual(blocks);
  });

  it('empty input', () => {
    expect(parsePlainText('  \n\n')).toEqual([]);
    expect(serializePlainText([])).toBe('');
  });
});

describe('validation', () => {
  const speech = (cue: string, text: string): Block[] => [
    { type: 'character', text: cue },
    { type: 'dialogue', text },
  ];

  it('a well-formed scene has no issues', () => {
    const blocks: Block[] = [
      { type: 'transition', text: 'FADE IN:' },
      { type: 'scene-heading', text: 'INT. COZINHA - NOITE' },
      { type: 'action', text: 'ANA (30s) abre a geladeira.' },
      ...speech('ANA', 'Você comeu?'),
      { type: 'parenthetical', text: '(beat)' },
      { type: 'dialogue', text: 'Eu avisei.' },
      { type: 'transition', text: 'FADE OUT.' },
    ];
    expect(validateBlocks(blocks)).toEqual([]);
  });

  it('blocking errors', () => {
    expect(codes([{ type: 'scene-heading', text: ' ' }])).toEqual(['FMT006']);
    expect(codes([{ type: 'character', text: '' }])).toContain('FMT007');
    expect(codes([{ type: 'character', text: 'ANA' }, { type: 'action', text: 'x.' }])).toContain(
      'FMT004',
    );
    expect(
      codes([...speech('ANA', 'Oi.').slice(0, 1), { type: 'parenthetical', text: '(rindo)' }]),
    ).toContain('FMT005');
    expect(codes([{ type: 'dialogue', text: 'Solta.' }])).toEqual(['FMT008']);
    expect(codes([{ type: 'action', text: `${'x'.repeat(61)} fim` }])).toContain('FMT003');
    const issues = validateBlocks([{ type: 'dialogue', text: 'Solta.' }]);
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it('scene heading warnings', () => {
    const c = (text: string) => codes([{ type: 'scene-heading', text }]);
    expect(c('INT COZINHA - NOITE')).toContain('FMT103');
    expect(c('INT. COZINHA')).toContain('FMT102');
    expect(c('INT. COZINHA - NOITE.')).toContain('FMT116');
    expect(c(`INT. ${'A'.repeat(60)} - DIA`)).toContain('FMT101');
    expect(c('Int. Cozinha - Noite')).toContain('FMT113');
    expect(c('INT. COZINHA - NOITE')).toEqual([]);
  });

  it('speech warnings', () => {
    expect(codes(speech('A'.repeat(23), 'Oi.'))).toContain('FMT104');
    expect(codes(speech('ANA:', 'Oi.'))).toContain('FMT118');
    expect(codes(speech('Ana', 'Oi.'))).toContain('FMT113');
    expect(codes(speech('ANA', '"Oi."'))).toContain('FMT120');
    expect(codes(speech('ANA', 'Ele disse “não”.'))).toContain('FMT114');
    expect(codes(speech('ANA', 'palavra '.repeat(50).trim()))).toContain('FMT107');
    const par = (text: string) => codes([{ type: 'character', text: 'ANA' }, { type: 'parenthetical', text }, { type: 'dialogue', text: 'Oi.' }]);
    expect(par('(muito triste e cansada)')).toContain('FMT105');
    expect(par('sem olhar')).toContain('FMT117');
    expect(par('(sem olhar.)')).toContain('FMT117');
    expect(par('(sem olhar)')).toEqual([]);
  });

  it('action warnings and the spec profile', () => {
    expect(codes([{ type: 'action', text: 'palavra '.repeat(40).trim() }])).toContain('FMT106');
    expect(codes([{ type: 'action', text: 'We see Ana.' }])).toContain('FMT108');
    expect(codes([{ type: 'action', text: 'Nós vemos Ana.' }])).toContain('FMT108');
    const cam: Block[] = [{ type: 'action', text: 'CLOSE ON: a chave.' }];
    expect(codes(cam)).toContain('FMT109');
    expect(codes(cam, 'production')).not.toContain('FMT109');
    expect(codes([{ type: 'shot', text: 'ANGLE ON: a porta.' }])).toContain('FMT109');
    expect(codes([{ type: 'shot', text: 'ANGLE ON: a porta.' }], 'production')).toEqual([]);
  });

  it('FMT121: first mention of a speaking character must be upper case', () => {
    const talk: Block[] = [
      { type: 'character', text: 'ANA' },
      { type: 'dialogue', text: 'Oi.' },
    ];
    const issues = (action: string[]) =>
      validateBlocks([...action.map((text) => ({ type: 'action' as const, text })), ...talk])
        .filter((i) => i.code === 'FMT121')
        .map((i) => i.blockIndex);
    expect(issues(['Ana (30s) entra.'])).toEqual([0]);
    expect(issues(['ANA (30s) entra.', 'Ana sai.'])).toEqual([]);
    expect(issues(['Chega a Banana.', 'ANA entra.'])).toEqual([]);
    expect(issues(['Ninguém entra.'])).toEqual([]);
    expect(issues(['Maria vê Ana.'])).toEqual([0]);
  });

  it('transition warnings', () => {
    expect(codes([{ type: 'transition', text: 'CORTE' }])).toContain('FMT119');
    expect(
      codes([
        { type: 'transition', text: 'CUT TO:' },
        { type: 'action', text: 'Ana corre.' },
      ]),
    ).toContain('FMT115');
    expect(
      codes([
        { type: 'transition', text: 'CUT TO:' },
        { type: 'scene-heading', text: 'EXT. RUA - DIA' },
      ]),
    ).toEqual([]);
  });

  it('whitespace', () => {
    expect(codes([{ type: 'action', text: 'Ana  entra.' }])).toEqual(['FMT112']);
    expect(codes([{ type: 'action', text: 'Ana\tentra.' }])).toEqual(['FMT112']);
  });

  it('is deterministic and ordered by block', () => {
    const blocks: Block[] = [
      { type: 'dialogue', text: 'a' },
      { type: 'scene-heading', text: '' },
    ];
    const a = validateBlocks(blocks);
    expect(validateBlocks(blocks)).toEqual(a);
    expect(a.map((i) => i.blockIndex)).toEqual([...a.map((i) => i.blockIndex)].sort((x, y) => x - y));
  });

  it('messages never contain script text', () => {
    const secret = 'SEGREDO-DO-ROTEIRO';
    const issues = validateBlocks([{ type: 'scene-heading', text: `${secret} ${'x'.repeat(70)}` }]);
    expect(issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(issues)).not.toContain(secret);
  });
});

describe('document-level checks', () => {
  it('FMT110 page range', () => {
    expect(checkPageRange('feature', 100)).toBeNull();
    expect(checkPageRange('feature', 130)?.code).toBe('FMT110');
    expect(checkPageRange('short', 4)?.severity).toBe('warning');
    expect(checkPageRange('tv-hour', 65)).toBeNull();
  });

  it('FMT111 title page', () => {
    expect(checkTitlePage({ title: 'Casa', authors: ['Ana'] })).toBeNull();
    expect(checkTitlePage({ title: '', authors: ['Ana'] })?.code).toBe('FMT111');
    expect(checkTitlePage({ title: 'Casa', authors: [' '] })?.code).toBe('FMT111');
  });
});

describe('outline', () => {
  const blocks: Block[] = [
    { type: 'character', text: 'ANA' },
    { type: 'dialogue', text: 'Oi.' },
    { type: 'scene-heading', text: 'INT. SALA - DIA' },
    { type: 'character', text: 'JOÃO' },
    { type: 'dialogue', text: 'Oi.' },
    { type: 'scene-heading', text: 'EXT. RUA - NOITE' },
    { type: 'character', text: "ANA (V.O.)" },
    { type: 'dialogue', text: 'Tchau.' },
    { type: 'character', text: "ANA (CONT'D)" },
    { type: 'dialogue', text: 'Mesmo assim.' },
  ];

  it('lists scenes in reading order', () => {
    const scenes = listScenes(blocks);
    expect(scenes.map((s) => [s.position, s.blockIndex])).toEqual([
      [1, 2],
      [2, 5],
    ]);
    expect(scenes[1]?.heading.time).toBe('NOITE');
  });

  it('lists characters with first scene and speech count', () => {
    expect(listCharacters(blocks)).toEqual([
      { name: 'ANA', firstSceneIndex: -1, firstBlockIndex: 0, speeches: 3 },
      { name: 'JOÃO', firstSceneIndex: 0, firstBlockIndex: 3, speeches: 1 },
    ]);
  });

  it('suggests used characters by frequency', () => {
    expect(suggestCharacters(blocks, 'a')).toEqual(['ANA']);
    expect(suggestCharacters(blocks, 'ana')).toEqual([]);
    expect(suggestCharacters(blocks, '')).toEqual(['ANA', 'JOÃO']);
  });

  it('counts words and characters', () => {
    expect(countText([{ type: 'action', text: ' Ana entra. ' }, { type: 'action', text: '' }])).toEqual({
      words: 2,
      characters: 10,
    });
  });
});

describe('wrap', () => {
  it('is shared with the layout engine', () => {
    expect(wrap('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc']);
    expect(wrap('', 10)).toEqual(['']);
  });
});
