import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The web app ships its own copy of Courier Prime so Next can preload it. The PDF package is
// the source of truth for the font: the preview is only faithful while both are identical.
describe('Courier Prime', () => {
  const web = new URL('./fonts/', import.meta.url);
  const pdf = new URL('../../../packages/pdf/fonts/', import.meta.url);

  it('is the same font file as the one embedded in the PDF', () => {
    const files = readdirSync(pdf).filter((f) => f.endsWith('.ttf'));
    expect(files.sort()).toEqual([
      'CourierPrime-Bold.ttf',
      'CourierPrime-BoldItalic.ttf',
      'CourierPrime-Italic.ttf',
      'CourierPrime-Regular.ttf',
    ]);
    for (const f of files) {
      expect(readFileSync(new URL(f, web)).equals(readFileSync(new URL(f, pdf)))).toBe(true);
    }
  });
});
