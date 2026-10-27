import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePlainText } from '@freex/screenplay';
import { LAYOUT_VERSION, layoutHash, pageRows, paginate } from './index';

// Golden layout of the complete example in elementos-e-convencoes.md section 13, which that
// document declares to fit in two pages of the FREEX Standard profile. If this test fails
// the pagination changed: bump LAYOUT_VERSION (and PROFILE_VERSION when geometry changed),
// review the diff and update the values below in the same commit (AGENTS.md section 3.1).
function example() {
  const doc = readFileSync(
    new URL('../../../docs/02-roteiro/elementos-e-convencoes.md', import.meta.url),
    'utf8',
  );
  const m = /```text\n([\s\S]*?)```/.exec(doc.split('## 13. Exemplo completo')[1] ?? '');
  if (!m?.[1]) throw new Error('example not found');
  return parsePlainText(m[1]);
}

describe('golden: section 13 example', () => {
  const pages = paginate(example());

  it('fits in two pages', () => {
    expect(pages.map((p) => p.rows)).toEqual([53, 21]);
  });

  it('keeps FADE IN: at the left margin and the speech geometry', () => {
    const rows = pageRows(pages[0]!);
    expect(rows[0]).toBe('FADE IN:');
    expect(rows[2]).toBe('INT. APARTAMENTO DE ANA - NOITE');
    expect(rows).toContain(`${' '.repeat(22)}ANA`);
    expect(rows).toContain(`${' '.repeat(10)}Ele está lá.`);
    expect(pageRows(pages[1]!).at(-1)).toBe(`${' '.repeat(60 - 'FADE OUT.'.length)}FADE OUT.`);
  });

  it('has a stable hash', () => {
    expect(LAYOUT_VERSION).toBe(3);
    expect(layoutHash(pages)).toBe(
      'sha256:9f8d7d4fd046b5a1a3d409768e452f6baf66df85ee0a7e95c8cfb5dbb016991b',
    );
  });
});
