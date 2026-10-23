'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { pageRows } from '@freex/layout';
import { SAMPLE, analyze, applyAutoFix, exportRequest, lineRange } from './editor-model';

const DRAFT_KEY = 'freex:draft';
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const SEVERITY_LABEL = { error: 'Erro', warning: 'Aviso', info: 'Info' } as const;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// Foundation editor: the script is Fountain text, read by the same engine the API and the
// PDF use. It is not the ProseMirror editor yet.
export default function Home() {
  const [src, setSrc] = useState(SAMPLE);
  const [undo, setUndo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);

  // The analysis runs on a deferred copy so typing stays responsive on long scripts.
  const deferred = useDeferredValue(src);
  const analysis = useMemo(() => analyze(deferred), [deferred]);

  // Unsent draft: a per-device convenience, so every access is allowed to fail.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DRAFT_KEY);
      if (saved !== null) setSrc(saved);
    } catch {
      // storage can be blocked; the editor works without it
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, src);
      } catch {
        // ignore
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [src, draftLoaded]);

  function replaceText(next: string, message: string) {
    setUndo(src);
    setSrc(next);
    setNotice(message);
    setError(null);
  }

  function autoFix() {
    const fixed = applyAutoFix(src);
    if (fixed === src) {
      setNotice('Nada para corrigir.');
      return;
    }
    replaceText(fixed, 'Espaços e caixa corrigidos. O texto foi reescrito em Fountain normalizado.');
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError('Arquivo grande demais (máximo 2 MB).');
      return;
    }
    replaceText(await file.text(), 'Arquivo importado. Veja o painel de problemas.');
  }

  function jumpTo(line: number | null) {
    const ta = editor.current;
    if (!ta || line === null) return;
    const [start, end] = lineRange(src, line);
    ta.focus();
    ta.setSelectionRange(start, end);
  }

  async function exportPdf() {
    if (analysis.warnings > 0) {
      const ok = window.confirm(
        `O roteiro tem ${analysis.warnings} aviso(s). Exportar mesmo assim?`,
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${api}/v1/export/pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(exportRequest(analysis)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      download(await res.blob(), 'roteiro.pdf');
    } catch {
      setError('Não foi possível exportar o PDF.');
    } finally {
      setBusy(false);
    }
  }

  const stale = deferred !== src;
  const empty = analysis.blocks.length === 0;
  const pdfDisabled = busy || analysis.blocking || empty;

  return (
    <main className="app">
      <section aria-labelledby="editor-title">
        <h1 id="editor-title">FREEX</h1>
        <div className="toolbar" role="toolbar" aria-label="Ações do roteiro">
          <input
            id="import"
            className="file-input"
            type="file"
            accept=".fountain,.txt,text/plain"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <label htmlFor="import" className="button">
            Importar Fountain
          </label>
          <button
            type="button"
            onClick={() => download(new Blob([src], { type: 'text/plain;charset=utf-8' }), 'roteiro.fountain')}
            disabled={src.trim() === ''}
          >
            Exportar Fountain
          </button>
          <button type="button" onClick={autoFix} disabled={empty}>
            Corrigir espaços e caixa
          </button>
          {undo !== null && (
            <button
              type="button"
              onClick={() => {
                setSrc(undo);
                setUndo(null);
                setNotice('Alteração desfeita.');
              }}
            >
              Desfazer
            </button>
          )}
        </div>

        <label className="field" htmlFor="editor">
          Roteiro (texto Fountain)
        </label>
        <textarea
          id="editor"
          ref={editor}
          className="editor"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          aria-describedby="editor-help status"
        />
        <p id="editor-help" className="status">
          Linha em branco separa os blocos. Personagem em maiúsculas, com a fala nas linhas de baixo.
        </p>
        <p id="status" className="status" aria-live="polite">
          <span>{analysis.scriptPages} pág.</span>
          <span>{analysis.words} palavras</span>
          <span>{analysis.characters} caracteres</span>
          <span>
            {analysis.errors} erro(s), {analysis.warnings} aviso(s)
          </span>
          {stale && <span>atualizando…</span>}
        </p>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
      </section>

      <section aria-labelledby="preview-title">
        <h2 id="preview-title">Prévia paginada</h2>
        <div className="toolbar">
          <button type="button" className="primary" onClick={exportPdf} disabled={pdfDisabled}>
            {busy ? 'Exportando…' : 'Exportar PDF'}
          </button>
        </div>
        {analysis.blocking && (
          <p className="notice error">Corrija os erros do painel para exportar.</p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}

        <h3>Problemas</h3>
        {analysis.items.length === 0 ? (
          <p className="status">Nenhum problema encontrado.</p>
        ) : (
          <ul className="issues" aria-label="Problemas do roteiro">
            {analysis.items.map((item) => (
              <li key={item.id}>
                <span className={`tag ${item.severity}`}>{SEVERITY_LABEL[item.severity]}</span>
                <span className="msg">
                  {item.code !== 'IMPORT' && <strong>{item.code} </strong>}
                  {item.message}
                  {item.line !== null && ` (linha ${item.line + 1})`}
                </span>
                {item.line !== null && (
                  <button type="button" onClick={() => jumpTo(item.line)}>
                    Ir
                    <span className="sr-only"> para a linha {item.line + 1}</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <h3>Páginas</h3>
        <div className="pages">
          {analysis.pages.map((p) => {
            const label =
              p.kind === 'title'
                ? 'Página de título'
                : p.printedNumber === null
                  ? `Página ${p.number}`
                  : `Página ${p.number} (impressa ${p.printedNumber}.)`;
            return (
              <article key={`${p.kind}-${p.number}`} className="page" aria-label={label}>
                <h3>{label}</h3>
                {p.printedNumber !== null && (
                  <pre aria-hidden="true" style={{ textAlign: 'right' }}>
                    {`${p.printedNumber}.`.padStart(60 + 15)}
                  </pre>
                )}
                <pre tabIndex={0} aria-label={`Texto da ${label.toLowerCase()}`}>
                  {pageRows(p)
                    .map((r) => ' '.repeat(15) + r)
                    .join('\n')}
                </pre>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
