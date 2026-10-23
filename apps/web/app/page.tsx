'use client';

import { useMemo, useState } from 'react';
import { pageRows, paginate } from '@freex/layout';
import { parsePlainText, type Block } from '@freex/screenplay';

const SAMPLE = `INT. SALA - DIA

Maria entra e olha em volta.

MARIA
(baixo)
Tem alguém aqui?

CORTA PARA:`;

// Foundation editor: plain text with inferred element types. Not the ProseMirror editor yet.
const parse = (src: string): Block[] => parsePlainText(src);

export default function Home() {
  const [src, setSrc] = useState(SAMPLE);
  const pages = useMemo(() => paginate(parse(src)), [src]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${api}/v1/export/pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ blocks: parse(src) }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roteiro.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Não foi possível exportar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      <section>
        <h1>FREEX</h1>
        <label htmlFor="editor">Roteiro</label>
        <textarea
          id="editor"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          style={{ width: '100%', height: 360, fontFamily: 'monospace' }}
        />
      </section>
      <section aria-label="Prévia paginada">
        <h2>Prévia ({pages.length} pág.)</h2>
        <button type="button" onClick={exportPdf} disabled={busy}>
          {busy ? 'Exportando…' : 'Exportar PDF'}
        </button>
        {error && <p role="alert">{error}</p>}
        {pages.map((p) => (
          <pre key={p.number} style={{ background: '#fff', border: '1px solid #ccc', padding: 12, overflowX: 'auto' }}>
            {p.lines.map((l) => ' '.repeat(l.col) + l.text).join('\n')}
          </pre>
        ))}
      </section>
    </main>
  );
}
