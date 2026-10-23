'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ELEMENT_TYPES,
  autoFixBlocks,
  parseFountain,
  toFountain,
  type Block,
  type ElementType,
  type FountainIssue,
} from '@freex/screenplay';
import type { Page } from '@freex/layout';
import { DRAFT_KEY, LEGACY_DRAFT_KEY, parseDraft, serializeDraft } from './draft';
import {
  ELEMENT_LABEL,
  EMPTY_COVER,
  SAMPLE,
  analyzeBlocks,
  exportRequest,
  toCoverForm,
  toTitlePage,
  type CoverForm,
} from './editor-model';
import { PagePreview } from './editor/PagePreview';
import { ScriptEditor, type EditorUiState, type ScriptEditorApi } from './editor/ScriptEditor';

type Side = 'preview' | 'issues' | 'cover';
type View = 'write' | Side;

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const NOTICE_MS = 8000;

const SEVERITY_LABEL = { error: 'Erro', warning: 'Aviso', info: 'Info' } as const;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/** Toolbar buttons must not take the focus: the caret and the keyboard stay in the script. */
const keepFocus = (e: MouseEvent) => e.preventDefault();

const SHORTCUTS: readonly [string, string][] = [
  ['Enter', 'Cria o próximo elemento'],
  ['Tab / Shift+Tab', 'Avança ou retrocede o elemento'],
  ['Alt+Shift+1…7', 'Escolhe o elemento'],
  ['Ctrl+Enter', 'Nova cena depois do bloco'],
  ['Ctrl+B / I / U', 'Negrito, itálico, sublinhado'],
  ['Ctrl+Z / Ctrl+Y', 'Desfazer e refazer'],
  ['Backspace no início', 'Volta a ação, depois junta com o bloco acima'],
];

export default function Home() {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState<Block[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [scriptPages, setScriptPages] = useState<Page[]>([]);
  const [cover, setCover] = useState<CoverForm>(EMPTY_COVER);
  const [ui, setUi] = useState<EditorUiState | null>(null);
  const [view, setView] = useState<View>('write');
  const [lastSide, setLastSide] = useState<Side>('issues');
  const [notice, setNotice] = useState<{ text: string; error: boolean; undo: boolean } | null>(null);
  const [importIssues, setImportIssues] = useState<FountainIssue[]>([]);
  const [busy, setBusy] = useState(false);
  const editor = useRef<ScriptEditorApi>(null);
  const exportMenu = useRef<HTMLDetailsElement>(null);
  // phones write in one column and read the pages in their own tab; larger screens write
  // directly on the pages
  const phone = useMediaQuery('(max-width: 639px)');
  const wide = useMediaQuery('(min-width: 1100px)');

  // ---- start: the saved draft, the old Fountain draft, or the sample
  useEffect(() => {
    let draft = null;
    let legacy: string | null = null;
    try {
      draft = parseDraft(window.localStorage.getItem(DRAFT_KEY));
      if (!draft) legacy = window.localStorage.getItem(LEGACY_DRAFT_KEY);
    } catch {
      // storage can be blocked; the editor works without it
    }
    const parsed = parseFountain(legacy ?? SAMPLE);
    const start = draft ?? { blocks: parsed.blocks, cover: toCoverForm(parsed.titlePage) };
    setInitial(start.blocks);
    setBlocks(start.blocks);
    setCover(start.cover);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, serializeDraft(blocks, cover));
      } catch {
        // ignore
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [blocks, cover, ready]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // ---- analysis runs on deferred values so typing stays responsive on long scripts
  const titlePage = useMemo(() => toTitlePage(cover), [cover]);
  const deferredBlocks = useDeferredValue(blocks);
  const deferredPages = useDeferredValue(scriptPages);
  const deferredTitle = useDeferredValue(titlePage);
  const analysis = useMemo(
    () => analyzeBlocks(deferredBlocks, deferredTitle, importIssues, deferredPages),
    [deferredBlocks, deferredPages, deferredTitle, importIssues],
  );

  // the page view only exists for phones
  const current: View = view === 'preview' && !phone ? 'write' : view;
  const sideView: Side = current === 'write' ? (lastSide === 'preview' && !phone ? 'issues' : lastSide) : current;
  const openSide = (side: Side) => {
    setView(side);
    setLastSide(side);
  };
  const previewVisible = phone && current === 'preview';
  const empty = analysis.blocks.length === 0;

  // ---- actions
  function inform(text: string, undo = false) {
    setNotice({ text, error: false, undo });
  }

  function jumpTo(index: number | null) {
    if (index === null) return;
    setView('write');
    // the writing pane may have been hidden: wait for it to be laid out
    requestAnimationFrame(() => requestAnimationFrame(() => editor.current?.jumpToBlock(index)));
  }

  function autoFix() {
    const api = editor.current;
    if (!api) return;
    const current = api.getBlocks();
    const fixed = autoFixBlocks(current);
    if (JSON.stringify(fixed) === JSON.stringify(current)) {
      inform('Nada para corrigir.');
      return;
    }
    api.load(fixed);
    inform('Espaços e caixa corrigidos. As palavras não foram alteradas.', true);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setNotice({ text: 'Arquivo grande demais (máximo 2 MB).', error: true, undo: false });
      return;
    }
    const doc = parseFountain(await file.text());
    editor.current?.load(doc.blocks);
    setCover(toCoverForm(doc.titlePage));
    setImportIssues(doc.issues);
    inform(
      doc.issues.length > 0
        ? `Importado, com ${doc.issues.length} item(ns) que o formato não mantém. Veja em Problemas.`
        : `Importado: ${doc.blocks.length} elementos.`,
      true,
    );
    if (doc.issues.length > 0) openSide('issues');
  }

  function exportFountain() {
    exportMenu.current?.removeAttribute('open');
    const text = toFountain(editor.current?.getBlocks() ?? blocks, titlePage);
    download(new Blob([text], { type: 'text/plain;charset=utf-8' }), 'roteiro.fountain');
  }

  async function exportPdf() {
    exportMenu.current?.removeAttribute('open');
    // the analysis on screen can be a moment behind the keyboard: check the current text
    const fresh = analyzeBlocks(editor.current?.getBlocks() ?? blocks, titlePage);
    if (fresh.blocking) {
      setNotice({ text: 'Corrija os erros em Problemas antes de exportar.', error: true, undo: false });
      openSide('issues');
      return;
    }
    if (fresh.warnings > 0 && !window.confirm(`O roteiro tem ${fresh.warnings} aviso(s). Exportar mesmo assim?`)) {
      return;
    }
    setBusy(true);
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
      const res = await fetch(`${api}/v1/export/pdf`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(exportRequest(fresh)),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      download(await res.blob(), 'roteiro.pdf');
    } catch {
      setNotice({ text: 'Não foi possível exportar o PDF.', error: true, undo: false });
    } finally {
      setBusy(false);
    }
  }

  const inSpeech =
    ui?.element === 'character' || ui?.element === 'parenthetical' || ui?.element === 'dialogue';
  const announce = ui?.element
    ? `${ELEMENT_LABEL[ui.element]}${ui.inDual ? ', diálogo duplo' : ''}`
    : '';
  const problems = analysis.errors + analysis.warnings + analysis.importIssues.length;
  const title = cover.title.trim();

  const tool = (onClick: () => void) => ({ onMouseDown: keepFocus, onClick });

  return (
    <div className="shell" data-view={current}>
      <header className="topbar">
        <span className="brand">FREEX</span>
        <button type="button" className="doc-title" onClick={() => openSide('cover')}>
          <strong>{title || 'Sem título'}</strong>
          <span className="sr-only"> — editar a capa</span>
        </button>
        <div className="top-actions">
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
          <label htmlFor="import" className="btn">
            Importar
          </label>
          <details className="menu" ref={exportMenu}>
            <summary className="btn primary" role="button">
              Exportar
            </summary>
            <div className="menu-list">
              <button type="button" className="btn" onClick={exportPdf} disabled={busy || empty}>
                {busy ? 'Gerando PDF…' : 'PDF (formato padrão)'}
              </button>
              <button type="button" className="btn" onClick={exportFountain} disabled={empty}>
                Fountain (.fountain)
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="workspace">
        <section className="pane pane-write" aria-label="Escrever">
          <div className="toolbar" role="toolbar" aria-label="Formatação do roteiro">
            <div className="segmented" role="group" aria-label="Elemento">
              {ELEMENT_TYPES.map((type: ElementType, i) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={ui?.element === type}
                  title={`${ELEMENT_LABEL[type]} (Alt+Shift+${i + 1})`}
                  disabled={!ui}
                  {...tool(() => editor.current?.setElement(type))}
                >
                  {ELEMENT_LABEL[type]}
                </button>
              ))}
            </div>
            <div className="segmented" role="group" aria-label="Ênfase">
              <button
                type="button"
                aria-pressed={ui?.marks.bold ?? false}
                aria-label="Negrito"
                title="Negrito (Ctrl+B)"
                {...tool(() => editor.current?.toggleMark('bold'))}
              >
                <span className="mark-b">B</span>
              </button>
              <button
                type="button"
                aria-pressed={ui?.marks.italic ?? false}
                aria-label="Itálico"
                title="Itálico (Ctrl+I)"
                {...tool(() => editor.current?.toggleMark('italic'))}
              >
                <span className="mark-i">I</span>
              </button>
              <button
                type="button"
                aria-pressed={ui?.marks.underline ?? false}
                aria-label="Sublinhado"
                title="Sublinhado (Ctrl+U)"
                {...tool(() => editor.current?.toggleMark('underline'))}
              >
                <span className="mark-u">U</span>
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Estrutura">
              <button
                type="button"
                aria-pressed={ui?.inDual ?? false}
                disabled={!inSpeech}
                title="Põe esta fala ao lado da seguinte"
                {...tool(() => editor.current?.toggleDual())}
              >
                Diálogo duplo
              </button>
              <button type="button" title="Nova cena (Ctrl+Enter)" disabled={!ui} {...tool(() => editor.current?.insertScene())}>
                + Cena
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Histórico">
              <button
                type="button"
                aria-label="Desfazer"
                title="Desfazer (Ctrl+Z)"
                disabled={!ui?.canUndo}
                {...tool(() => editor.current?.undo())}
              >
                ↶
              </button>
              <button
                type="button"
                aria-label="Refazer"
                title="Refazer (Ctrl+Y)"
                disabled={!ui?.canRedo}
                {...tool(() => editor.current?.redo())}
              >
                ↷
              </button>
            </div>
          </div>

          {notice && (
            <div className={`toast${notice.error ? ' error' : ''}`} role={notice.error ? 'alert' : 'status'}>
              <p>{notice.text}</p>
              {notice.undo && (
                <button
                  type="button"
                  className="btn small"
                  {...tool(() => {
                    editor.current?.undo();
                    setNotice(null);
                  })}
                >
                  Desfazer
                </button>
              )}
              <button type="button" className="btn small" aria-label="Fechar aviso" onClick={() => setNotice(null)}>
                ×
              </button>
            </div>
          )}

          <div className="editor-scroll">
            <div className="editor-paper">
              {ready ? (
                <ScriptEditor
                  ref={editor}
                  initialBlocks={initial}
                  titlePage={titlePage}
                  onBlocks={(next, pages) => {
                    setBlocks(next);
                    setScriptPages(pages);
                  }}
                  onState={setUi}
                  onNotice={(text) => inform(text, true)}
                  onOpenCover={() => openSide('cover')}
                />
              ) : (
                <p className="loading">Carregando o roteiro…</p>
              )}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {announce}
          </p>

          <div className="statusbar">
            <span className="chip">{analysis.scriptPages} pág.</span>
            <span className="chip">{analysis.words} palavras</span>
            <span className="chip">{analysis.characters} caracteres</span>
            {analysis.errors > 0 && (
              <button type="button" className="chip danger" onClick={() => openSide('issues')}>
                {analysis.errors} erro(s)
              </button>
            )}
            {analysis.warnings > 0 && (
              <button type="button" className="chip warn" onClick={() => openSide('issues')}>
                {analysis.warnings} aviso(s)
              </button>
            )}
            {problems === 0 && !empty && <span className="chip ok">Sem problemas</span>}
          </div>

          <details className="help">
            <summary>Atalhos de teclado</summary>
            <dl>
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} style={{ display: 'contents' }}>
                  <dt>{keys}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <aside className="pane pane-side" aria-label="Prévia e revisão">
          <div className="side-tabs" role="tablist" aria-label="Seções">
            {(
              [
                ['issues', 'Problemas'],
                ['cover', 'Capa'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={sideView === id}
                aria-controls={`panel-${id}`}
                onClick={() => openSide(id)}
              >
                {label}
                {id === 'issues' && problems > 0 && (
                  <span className={`badge${analysis.errors === 0 ? ' warn' : ''}`}>{problems}</span>
                )}
              </button>
            ))}
          </div>

          <div id="panel-preview" role="tabpanel" aria-label="Páginas" className="panel" hidden={sideView !== 'preview'}>
            {previewVisible && (
              <>
                <p className="panel-note">
                  As páginas como saem no PDF: {analysis.scriptPages} do roteiro
                  {analysis.titlePage ? ' e a capa' : ''}. Em telas maiores o texto é escrito
                  direto nelas.
                </p>
                <PagePreview pages={analysis.pages} />
              </>
            )}
          </div>

          <div id="panel-issues" role="tabpanel" aria-labelledby="tab-issues" className="panel" hidden={sideView !== 'issues'}>
            <h2>Problemas</h2>
            <p className="panel-note">
              Erros impedem a exportação. Avisos pedem confirmação.
            </p>
            <div className="toolbar-inline" style={{ marginBottom: 12 }}>
              <button type="button" className="btn small" onClick={autoFix} disabled={empty}>
                Corrigir espaços e caixa
              </button>
            </div>
            {analysis.items.length === 0 ? (
              <div className="empty-state">
                <strong>Tudo certo</strong>
                Nenhum problema de formato encontrado.
              </div>
            ) : (
              <ul className="issues" aria-label="Problemas do roteiro">
                {analysis.items.map((item) => (
                  <li key={item.id} className="issue">
                    <span className={`issue-sev ${item.severity}`}>{SEVERITY_LABEL[item.severity]}</span>
                    <span>
                      <span className="issue-code">{item.code}</span>
                      {item.message}
                    </span>
                    {item.blockIndex !== null && (
                      <button type="button" className="btn small" onClick={() => jumpTo(item.blockIndex)}>
                        Ir ao trecho
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {importIssues.length > 0 && (
              <section className="import-report" aria-label="Relatório da importação">
                <h3>Importação</h3>
                <ul className="issues">
                  {importIssues.map((issue, i) => (
                    <li key={i} className="issue">
                      <span className={`issue-sev ${issue.severity}`}>{SEVERITY_LABEL[issue.severity]}</span>
                      <span>
                        <span className="issue-code">linha {issue.line}</span>
                        {issue.message}
                      </span>
                      <span />
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={() => setImportIssues([])}>
                  Dispensar
                </button>
              </section>
            )}
          </div>

          <div id="panel-cover" role="tabpanel" aria-labelledby="tab-cover" className="panel" hidden={sideView !== 'cover'}>
            <h2>Capa</h2>
            <p className="panel-note">A página de título não é numerada e não conta nas páginas do roteiro.</p>
            <form className="form" onSubmit={(e) => e.preventDefault()}>
              <div className="field">
                <label htmlFor="cover-title">Título</label>
                <input
                  id="cover-title"
                  value={cover.title}
                  onChange={(e) => setCover({ ...cover, title: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-credit">Crédito</label>
                <input
                  id="cover-credit"
                  value={cover.credit}
                  placeholder="Written by"
                  onChange={(e) => setCover({ ...cover, credit: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-authors">Autoria</label>
                <textarea
                  id="cover-authors"
                  value={cover.authors}
                  onChange={(e) => setCover({ ...cover, authors: e.target.value })}
                  rows={2}
                />
                <small>Um nome por linha.</small>
              </div>
              <div className="field">
                <label htmlFor="cover-source">Baseado em</label>
                <input
                  id="cover-source"
                  value={cover.source}
                  onChange={(e) => setCover({ ...cover, source: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-contact">Contato</label>
                <textarea
                  id="cover-contact"
                  value={cover.contact}
                  onChange={(e) => setCover({ ...cover, contact: e.target.value })}
                  rows={3}
                />
                <small>Nome, e-mail e telefone, um por linha.</small>
              </div>
              <div className="field">
                <label htmlFor="cover-date">Data do rascunho</label>
                <input
                  id="cover-date"
                  value={cover.date}
                  placeholder="2026-10-23"
                  onChange={(e) => setCover({ ...cover, date: e.target.value })}
                  autoComplete="off"
                />
              </div>
            </form>
          </div>
        </aside>
      </div>

      <nav className="bottom-nav" aria-label="Seções">
        {(
          [
            ['write', 'Escrever'],
            ['preview', 'Páginas'],
            ['issues', 'Problemas'],
            ['cover', 'Capa'],
          ] as const
        )
          .filter(([id]) => id !== 'preview' || phone)
          .map(([id, label]) => (
          <button key={id} type="button" aria-current={current === id} onClick={() => (id === 'write' ? setView('write') : openSide(id))}>
            {label}
            {id === 'issues' && problems > 0 && (
              <span className={`badge${analysis.errors === 0 ? ' warn' : ''}`}>{problems}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
