import { describe, expect, it } from 'vitest';
import { formatSavedAt, savedLabel } from './saved';

// local times, so the test does not depend on the machine's time zone
const at = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi, 5).getTime();

describe('formatSavedAt', () => {
  const now = at(2026, 10, 23, 15, 40);

  it('today: only the time, with leading zeros', () => {
    expect(formatSavedAt(at(2026, 10, 23, 14, 32), now)).toBe('às 14:32');
    expect(formatSavedAt(at(2026, 10, 23, 7, 5), now)).toBe('às 07:05');
    expect(formatSavedAt(at(2026, 10, 23, 0, 0), now)).toBe('às 00:00');
  });

  it('yesterday, even across a month or year', () => {
    expect(formatSavedAt(at(2026, 10, 22, 23, 59), now)).toBe('ontem às 23:59');
    expect(formatSavedAt(at(2026, 9, 30, 10, 0), at(2026, 10, 1, 9, 0))).toBe('ontem às 10:00');
    expect(formatSavedAt(at(2025, 12, 31, 22, 15), at(2026, 1, 1, 8, 0))).toBe('ontem às 22:15');
  });

  it('earlier this year: the day and month', () => {
    expect(formatSavedAt(at(2026, 3, 5, 9, 8), now)).toBe('em 05/03 às 09:08');
    expect(formatSavedAt(at(2026, 10, 21, 18, 0), now)).toBe('em 21/10 às 18:00');
  });

  it('another year: the year too', () => {
    expect(formatSavedAt(at(2025, 10, 23, 14, 32), now)).toBe('em 23/10/2025 às 14:32');
  });

  it('a time slightly in the future (clock skew) is still "today"', () => {
    expect(formatSavedAt(now + 30_000, now)).toMatch(/^às \d\d:\d\d$/);
  });
});

describe('savedLabel', () => {
  const now = at(2026, 10, 23, 15, 40);

  it('says what was saved and when, and where for a local draft', () => {
    expect(savedLabel(at(2026, 10, 23, 14, 32), now, 'server')).toBe('Última modificação salva às 14:32');
    expect(savedLabel(at(2026, 10, 23, 14, 32), now, 'browser')).toBe(
      'Última modificação salva às 14:32 (neste navegador)',
    );
  });

  it('says nothing before there is a save', () => {
    expect(savedLabel(null, now, 'server')).toBe('');
  });
});
