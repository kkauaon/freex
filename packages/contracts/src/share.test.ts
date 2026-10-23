import { describe, expect, it } from 'vitest';
import {
  CreateShareRequest,
  CreateShareResponse,
  PARTICIPANT_NAME_MAX,
  encodeSavedNotice,
  parseSavedNotice,
  SHARE_TOKEN_PATTERN,
  sanitizeParticipantName,
} from './index';

describe('sanitizeParticipantName', () => {
  it('keeps an ordinary name', () => {
    expect(sanitizeParticipantName('Ana')).toBe('Ana');
    expect(sanitizeParticipantName('  João  da   Silva ')).toBe('João da Silva');
  });

  it('removes control, zero-width and bidi override characters', () => {
    expect(sanitizeParticipantName('A\u0000n\u0007a')).toBe('Ana');
    expect(sanitizeParticipantName('A​n‍a')).toBe('Ana');
    // an RTL override cannot be used to make a name read backwards
    expect(sanitizeParticipantName('‮anA')).toBe('anA');
    expect(sanitizeParticipantName('Ana\nBia\r\nCaio')).toBe('Ana Bia Caio');
  });

  it('normalises the Unicode form, so the same name has one spelling', () => {
    expect(sanitizeParticipantName('José')).toBe('José');
  });

  it('cuts long names by characters, not by UTF-16 units', () => {
    const long = '😀'.repeat(100);
    const out = sanitizeParticipantName(long);
    expect(Array.from(out)).toHaveLength(PARTICIPANT_NAME_MAX);
    expect(out.endsWith('\uD83D')).toBe(false);
  });

  it('gives an empty string when nothing usable is left, and never throws', () => {
    for (const bad of ['', '   ', '​​', null, undefined, 42, {}, ['Ana']]) {
      expect(sanitizeParticipantName(bad)).toBe('');
    }
  });

  it('does not interpret markup: it is plain text for the UI to escape', () => {
    expect(sanitizeParticipantName('<img src=x onerror=1>')).toBe('<img src=x onerror=1>');
  });
});

describe('sharing contracts', () => {
  it('accepts the script and the cover the editor sends', () => {
    const ok = CreateShareRequest.safeParse({
      blocks: [{ type: 'action', text: 'Ana entra.', marks: [{ type: 'bold', from: 0, to: 3 }] }],
      cover: { title: 'Casa', credit: '', authors: 'Ana', source: '', contact: '', date: '' },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects unknown elements, huge texts and too many blocks', () => {
    expect(CreateShareRequest.safeParse({ blocks: [{ type: 'script', text: 'x' }] }).success).toBe(false);
    expect(CreateShareRequest.safeParse({ blocks: [{ type: 'action', text: 'x'.repeat(10_001) }] }).success).toBe(false);
    expect(
      CreateShareRequest.safeParse({ blocks: Array(20_001).fill({ type: 'action', text: 'x' }) }).success,
    ).toBe(false);
    expect(CreateShareRequest.safeParse({}).success).toBe(false);
  });

  it('a token is 43 URL-safe characters (256 bits)', () => {
    expect(SHARE_TOKEN_PATTERN.test('A'.repeat(43))).toBe(true);
    expect(SHARE_TOKEN_PATTERN.test('A'.repeat(42))).toBe(false);
    expect(SHARE_TOKEN_PATTERN.test(`${'A'.repeat(42)}/`)).toBe(false);
    expect(CreateShareResponse.safeParse({ token: 'A'.repeat(43) }).success).toBe(true);
    expect(CreateShareResponse.safeParse({ token: '../etc/passwd' }).success).toBe(false);
  });
});

describe('saved notice', () => {
  it('round-trips the time', () => {
    expect(parseSavedNotice(encodeSavedNotice(1_760_000_000_000))).toBe(1_760_000_000_000);
  });

  it('reads nothing from anything else that arrives in a stateless message', () => {
    for (const bad of [
      '',
      'not json',
      '{}',
      '{"type":"saved"}',
      '{"type":"saved","at":"yesterday"}',
      '{"type":"saved","at":-5}',
      '{"type":"saved","at":1.5}',
      '{"type":"other","at":5}',
      `{"type":"saved","at":5,"x":"${'y'.repeat(300)}"}`,
      null,
      undefined,
      42,
    ]) {
      expect(parseSavedNotice(bad)).toBeNull();
    }
  });
});
