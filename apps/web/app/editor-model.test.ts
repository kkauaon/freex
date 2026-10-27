import { describe, expect, it } from 'vitest';
import { PaginateRequest } from '@freex/contracts';
import { parseFountain } from '@freex/screenplay';
import {
  EMPTY_COVER,
  SAMPLE,
  analyze,
  analyzeBlocks,
  exportRequest,
  parseProfile,
  toCoverForm,
  toTitlePage,
} from './editor-model';

describe('analyze', () => {
  it('the sample is a clean script with a title page', () => {
    const a = analyze(SAMPLE);
    expect(a.items).toEqual([]);
    expect(a.errors + a.warnings).toBe(0);
    expect(a.blocking).toBe(false);
    expect(a.titlePage?.title).toBe('Casa Vazia');
    expect(a.pages[0]?.kind).toBe('title');
    expect(a.scriptPages).toBe(1);
    expect(a.words).toBeGreaterThan(20);
    expect(a.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('empty text is an empty page without issues', () => {
    const a = analyze('');
    expect(a.blocks).toEqual([]);
    expect(a.items).toEqual([]);
    expect(a.scriptPages).toBe(1);
  });

  it('points each validation issue at the block it is about', () => {
    const a = analyze('INT. SALA - DIA\n\nAna entra.\n\nANA\n(baixo)\n');
    const errors = a.items.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThan(0);
    expect(a.blocking).toBe(true);
    for (const item of errors) {
      expect(['character', 'parenthetical']).toContain(a.blocks[item.blockIndex ?? -1]?.type);
    }
  });

  it('warnings do not block the export', () => {
    const a = analyze('INT SALA\n\nAna entra.\n');
    expect(a.warnings).toBeGreaterThan(0);
    expect(a.errors).toBe(0);
    expect(a.blocking).toBe(false);
  });

  it('keeps the syntax the Fountain reader dropped apart from the script problems', () => {
    const a = analyze('INT. SALA - DIA\n\n===\n\nAna entra.\n');
    expect(a.importIssues).toHaveLength(1);
    expect(a.importIssues[0]).toMatchObject({ severity: 'error', line: 3 });
    expect(a.items).toEqual([]);
    expect(a.blocking).toBe(false);
  });

  it('asks for a title and an author when the cover is incomplete', () => {
    const a = analyze('Title: Casa\n\nINT. SALA - DIA\n\nAna entra.\n');
    expect(a.items.find((i) => i.code === 'FMT111')).toMatchObject({ blockIndex: null, severity: 'warning' });
  });

  it('is deterministic and the cover changes the hash but not the script pages', () => {
    expect(analyze(SAMPLE).hash).toBe(analyze(SAMPLE).hash);
    const a = analyze(SAMPLE);
    const b = analyze(SAMPLE.replace('Casa Vazia', 'Outra Casa'));
    expect(b.scriptPages).toBe(a.scriptPages);
    expect(b.hash).not.toBe(a.hash);
  });
});

describe('analyzeBlocks', () => {
  it('works on blocks straight from the editor', () => {
    const a = analyzeBlocks([{ type: 'action', text: 'Ana entra.' }], null);
    expect(a.pages).toHaveLength(1);
    expect(a.items).toEqual([]);
  });
});

describe('exportRequest', () => {
  it('matches the API contract, cover included', () => {
    const body = exportRequest(analyze(SAMPLE));
    expect(PaginateRequest.safeParse(body).success).toBe(true);
    expect(body.titlePage?.title).toBe('Casa Vazia');
  });

  it('omits the title page when the script has none', () => {
    const body = exportRequest(analyze('INT. SALA - DIA\n\nAna entra.\n'));
    expect('titlePage' in body).toBe(false);
    expect(PaginateRequest.safeParse(body).success).toBe(true);
  });
});

describe('cover form', () => {
  it('an empty form means no title page', () => {
    expect(toTitlePage(EMPTY_COVER)).toBeNull();
    expect(toTitlePage({ ...EMPTY_COVER, title: '   ' })).toBeNull();
    expect(toCoverForm(null)).toEqual(EMPTY_COVER);
  });

  it('splits authors and contact lines and drops blanks', () => {
    const page = toTitlePage({
      ...EMPTY_COVER,
      title: ' Casa ',
      authors: 'Ana\n\n João \n',
      contact: 'ana@exemplo.com\n  +55 11 99999-9999 \n',
      date: ' 2026-10-23 ',
    });
    expect(page).toEqual({
      title: 'Casa',
      authors: ['Ana', 'João'],
      contact: 'ana@exemplo.com\n+55 11 99999-9999',
      date: '2026-10-23',
    });
  });

  it('round-trips with the Fountain title page', () => {
    const page = parseFountain(SAMPLE).titlePage;
    expect(toTitlePage(toCoverForm(page))).toEqual(page);
  });

  it('a form is valid for the API', () => {
    const page = toTitlePage({ ...EMPTY_COVER, title: 'Casa', authors: 'Ana' });
    expect(PaginateRequest.safeParse({ blocks: [], titlePage: page }).success).toBe(true);
  });
});

describe('profile', () => {
  const camera = [{ type: 'action' as const, text: 'CLOSE ON: a chave.' }];

  it('spec warns about camera directions and production does not', () => {
    expect(analyzeBlocks(camera, null).items.map((i) => i.code)).toContain('FMT109');
    expect(analyzeBlocks(camera, null, [], undefined, 'production').items.map((i) => i.code)).not.toContain('FMT109');
  });

  it('reads only known profiles', () => {
    expect(parseProfile('production')).toBe('production');
    expect(parseProfile('spec')).toBe('spec');
    expect(parseProfile('other')).toBe('spec');
    expect(parseProfile(null)).toBe('spec');
  });
});
