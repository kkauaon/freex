import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePlainText, validateBlocks } from './index';

// The complete example in elementos-e-convencoes.md section 13 is declared a test fixture.
function loadExample(): string {
  const doc = readFileSync(
    new URL('../../../docs/02-roteiro/elementos-e-convencoes.md', import.meta.url),
    'utf8',
  );
  const section = doc.split('## 13. Exemplo completo')[1] ?? '';
  const m = /```text\n([\s\S]*?)```/.exec(section);
  if (!m?.[1]) throw new Error('example not found');
  return m[1];
}

describe('elementos-e-convencoes.md section 13 example', () => {
  it('parses and validates without errors or warnings', () => {
    const blocks = parsePlainText(loadExample());
    expect(blocks.length).toBeGreaterThan(30);
    expect(validateBlocks(blocks)).toEqual([]);
  });
});
