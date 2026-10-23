import { describe, expect, it } from 'vitest';
import { SAMPLE, analyze, applyAutoFix, exportRequest, lineRange } from './editor-model';
import { PaginateRequest } from '@freex/contracts';

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

  it('points each validation issue at the line where the element starts', () => {
    const src = 'INT. SALA - DIA\n\nAna entra.\n\nANA\n(baixo)\n';
    const a = analyze(src);
    const dangling = a.items.filter((i) => i.severity === 'error');
    expect(dangling.length).toBeGreaterThan(0);
    expect(a.blocking).toBe(true);
    const lines = src.split('\n');
    for (const item of dangling) expect(lines[item.line ?? -1]).toMatch(/ANA|\(baixo\)/);
  });

  it('warnings do not block the export', () => {
    const a = analyze('INT SALA\n\nAna entra.\n');
    expect(a.warnings).toBeGreaterThan(0);
    expect(a.errors).toBe(0);
    expect(a.blocking).toBe(false);
  });

  it('lists syntax dropped by the Fountain reader', () => {
    const a = analyze('INT. SALA - DIA\n\n===\n\nAna entra.\n');
    const dropped = a.items.find((i) => i.code === 'IMPORT');
    expect(dropped).toMatchObject({ severity: 'error', line: 2 });
    // dropped syntax is reported but does not block the export of the rest
    expect(a.blocking).toBe(false);
  });

  it('asks for a title and an author when the title page is incomplete', () => {
    const a = analyze('Title: Casa\n\nINT. SALA - DIA\n\nAna entra.\n');
    expect(a.items.find((i) => i.code === 'FMT111')).toMatchObject({ line: 0, severity: 'warning' });
  });

  it('keeps the page count stable while the title page changes', () => {
    const a = analyze(SAMPLE);
    const b = analyze(SAMPLE.replace('Casa Vazia', 'Outra Casa'));
    expect(b.scriptPages).toBe(a.scriptPages);
    expect(b.hash).not.toBe(a.hash);
  });

  it('is deterministic', () => {
    expect(analyze(SAMPLE).hash).toBe(analyze(SAMPLE).hash);
  });
});

describe('applyAutoFix', () => {
  it('fixes spacing and case without changing words, and keeps emphasis', () => {
    const fixed = applyAutoFix('int. sala - dia\n\nAna   entra  ,  com *pressa*.\n');
    expect(fixed).toBe('INT. SALA - DIA\n\nAna entra, com *pressa*.\n');
  });

  it('is idempotent', () => {
    const once = applyAutoFix('int. sala - dia\n\nana\noi.\n');
    expect(applyAutoFix(once)).toBe(once);
  });

  it('keeps the title page and removes the matching warnings', () => {
    const src = 'Title: Casa\nAuthor: Ana\n\nint. sala - dia\n\nAna entra.\n';
    expect(analyze(src).items.some((i) => i.code === 'FMT113')).toBe(true);
    expect(analyze(applyAutoFix(src)).items.some((i) => i.code === 'FMT113')).toBe(false);
    expect(applyAutoFix(src).startsWith('Title: Casa\nAuthor: Ana')).toBe(true);
  });
});

describe('lineRange', () => {
  const src = 'abc\n\nde\nf';
  it('selects a line without its line feed', () => {
    expect(lineRange(src, 0)).toEqual([0, 3]);
    expect(lineRange(src, 1)).toEqual([4, 4]);
    expect(lineRange(src, 2)).toEqual([5, 7]);
    expect(lineRange(src, 3)).toEqual([8, 9]);
  });

  it('clamps past the end', () => {
    expect(lineRange(src, 99)).toEqual([9, 9]);
  });
});

describe('exportRequest', () => {
  it('matches the API contract, title page included', () => {
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
