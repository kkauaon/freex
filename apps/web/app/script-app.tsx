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
import { parseSavedNotice, sanitizeParticipantName } from '@freex/contracts';
import { savedLabel } from './saved';
import { NameDialog, PeoplePanel, ShareDialog } from './collab/dialogs';
import {
  colorFor,
  initials,
  peopleFrom,
  readContributors,
  recordEdit,
  type Contributor,
  type Person,
} from './collab/people';
import {
  ShareError,
  coverFromMap,
  createShare,
  openSession,
  writeCover,
  type CollabSession,
} from './collab/session';
import { shareLink } from './collab/token';
import { PagePreview } from './editor/PagePreview';
import { ScriptEditor, type EditorUiState, type ScriptEditorApi } from './editor/ScriptEditor';

type Side = 'preview' | 'people' | 'issues' | 'cover' | 'help';
type View = 'write' | Side;

/** A shared script: the secret token of its link and the name of its room. */
export interface ShareTarget {
  readonly token: string;
  readonly docId: string;
}

const NAME_KEY = 'freex:name';
const INTRO_KEY = 'freex:share-intro';
/** Edits are noted for "who edited" at most this often. */
const EDIT_NOTE_MS = 5_000;

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

function shareErrorText(error: unknown): string {
  const reason = error instanceof ShareError ? error.reason : 'failed';
  switch (reason) {
    case 'network':
      return 'Não foi possível falar com o serviço de colaboração. Ele está no ar?';
    case 'rate-limited':
      return 'Muitos links criados em pouco tempo. Tente de novo em um minuto.';
    case 'too-large':
      return 'O roteiro é grande demais para compartilhar.';
    default:
      return 'Não foi possível criar o link de compartilhamento.';
  }
}

/**
 * The editor. On its own it writes a script that lives in this browser; with `share` it joins a
 * shared script, where everyone with the link edits the same text at the same time.
 */
export default function ScriptApp({ share }: { share?: ShareTarget }) {
  const [localReady, setLocalReady] = useState(false);
  const [initial, setInitial] = useState<Block[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [scriptPages, setScriptPages] = useState<Page[]>([]);
  const [cover, setCoverState] = useState<CoverForm>(EMPTY_COVER);
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

  // ---- shared script: the room, the people in it and the name of this person
  const [session, setSession] = useState<CollabSession | null>(null);
  const [synced, setSynced] = useState(false);
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline' | 'denied'>('connecting');
  const [unsynced, setUnsynced] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [name, setName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);
  const [dialog, setDialog] = useState<'share' | 'name' | null>(null);
  const [sharing, setSharing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastEditNote = useRef(0);
  // the last modification that was saved: by the service for a shared script, by this browser otherwise
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const lastSaved = useRef('');
  const ready = share ? session !== null : localReady;

  // ---- start: the saved draft, the old Fountain draft, or the sample
  useEffect(() => {
    if (share) return;
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
    setCoverState(start.cover);
    setSavedAt(draft?.savedAt ?? null);
    lastSaved.current = draft ? JSON.stringify({ blocks: draft.blocks, cover: draft.cover }) : '';
    setLocalReady(true);
  }, [share]);

  // a shared script is not copied to this browser: the room keeps it
  useEffect(() => {
    if (share || !localReady) return;
    const timer = window.setTimeout(() => {
      // only a real change counts as a modification
      const content = JSON.stringify({ blocks, cover });
      if (content === lastSaved.current) return;
      try {
        const at = Date.now();
        window.localStorage.setItem(DRAFT_KEY, serializeDraft(blocks, cover, at));
        lastSaved.current = content;
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [blocks, cover, localReady, share]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // ---- the room: connect, and follow the people, the cover and who edited
  useEffect(() => {
    if (!share) return;
    const s = openSession({ token: share.token, docId: share.docId });
    setSession(s);
    setSynced(false);
    setConnection('connecting');

    const onStatus = ({ status }: { status: string }) =>
      setConnection(status === 'connected' ? 'online' : status === 'connecting' ? 'connecting' : 'offline');
    const onSynced = () => setSynced(true);
    const onDenied = () => setConnection('denied');
    const onUnsynced = ({ number }: { number: number }) => setUnsynced(number);
    s.provider.on('status', onStatus);
    s.provider.on('synced', onSynced);
    s.provider.on('authenticationFailed', onDenied);
    s.provider.on('unsyncedChanges', onUnsynced);
    // the service says when it saved, and tells whoever arrives the time already on disk
    const onSaved = ({ payload }: { payload: string }) => {
      const at = parseSavedNotice(payload);
      if (at !== null) setSavedAt(at);
    };
    setSavedAt(null);
    s.provider.on('stateless', onSaved);

    const awareness = s.provider.awareness;
    const readPeople = () =>
      awareness && setPeople(peopleFrom(awareness.getStates() as Map<number, Record<string, unknown>>, s.ydoc.clientID));
    awareness?.on('change', readPeople);
    readPeople();

    const readCover = () => setCoverState(coverFromMap(s.cover));
    const readContrib = () => setContributors(readContributors(s.contributors));
    s.cover.observe(readCover);
    s.contributors.observe(readContrib);
    readCover();
    readContrib();

    return () => {
      s.provider.off('status', onStatus);
      s.provider.off('synced', onSynced);
      s.provider.off('authenticationFailed', onDenied);
      s.provider.off('unsyncedChanges', onUnsynced);
      s.provider.off('stateless', onSaved);
      awareness?.off('change', readPeople);
      s.cover.unobserve(readCover);
      s.contributors.unobserve(readContrib);
      s.destroy();
      setSession(null);
    };
  }, [share]);

  // the name given on this device; and the link dialog right after sharing from the local editor
  useEffect(() => {
    if (!share) return;
    try {
      setName(sanitizeParticipantName(window.localStorage.getItem(NAME_KEY)));
      if (window.sessionStorage.getItem(INTRO_KEY)) {
        window.sessionStorage.removeItem(INTRO_KEY);
        setDialog('share');
      }
    } catch {
      // storage blocked: the name is asked every time
    }
    setNameLoaded(true);
  }, [share]);

  // "edited 2 min ago" and the saved time move on by themselves
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
  // in a shared script nobody edits before the room has loaded and a name has been given
  const needName = !!share && nameLoaded && name === '';
  const canEdit = !share || (synced && name !== '' && connection !== 'denied');
  const modal = needName ? 'name' : dialog;

  const me = useMemo(() => (name ? { name, color: colorFor(name) } : null), [name]);
  const collab = useMemo(
    () =>
      session && session.provider.awareness
        ? { ydoc: session.ydoc, awareness: session.provider.awareness, user: me }
        : undefined,
    [session, me],
  );

  function updateCover(next: CoverForm) {
    if (!share) setCoverState(next);
    else if (session && canEdit) writeCover(session.cover, next, cover);
  }

  function confirmName(next: string) {
    const clean = sanitizeParticipantName(next);
    if (clean === '') return;
    setName(clean);
    // only the name dialog closes: the link dialog may be waiting behind it
    setDialog((d) => (d === 'name' ? null : d));
    try {
      window.localStorage.setItem(NAME_KEY, clean);
    } catch {
      // ignore
    }
  }

  /** Notes that this person edited, not more than once in a few seconds. */
  function noteEdit() {
    const t = Date.now();
    if (!session || name === '' || t - lastEditNote.current < EDIT_NOTE_MS) return;
    lastEditNote.current = t;
    recordEdit(session.contributors, name, t);
  }

  async function shareScript() {
    if (share) {
      setDialog('share');
      return;
    }
    if (sharing) return;
    setSharing(true);
    try {
      const token = await createShare(editor.current?.getBlocks() ?? blocks, cover);
      try {
        window.sessionStorage.setItem(INTRO_KEY, '1');
      } catch {
        // without it the link dialog is opened from the Share button
      }
      window.location.assign(`/s#${token}`);
    } catch (error) {
      setNotice({ text: shareErrorText(error), error: true, undo: false });
      setSharing(false);
    }
  }
  const toggleSide = (side: Side) => (current === side ? setView('write') : openSide(side));

  // on wide screens the panels are a drawer over the writing area: Escape puts it away
  useEffect(() => {
    if (!wide || current === 'write') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setView('write');
      editor.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wide, current]);

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
    if (!api || !canEdit) return;
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
    if (!file || !canEdit) return;
    if (share && !window.confirm('Importar substitui o roteiro para todas as pessoas que estão nele. Continuar?')) {
      return;
    }
    if (file.size > MAX_IMPORT_BYTES) {
      setNotice({ text: 'Arquivo grande demais (máximo 2 MB).', error: true, undo: false });
      return;
    }
    const doc = parseFountain(await file.text());
    editor.current?.load(doc.blocks);
    updateCover(toCoverForm(doc.titlePage));
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

  const panels: readonly (readonly [Side, string])[] = share
    ? [
        ['people', 'Pessoas'],
        ['issues', 'Problemas'],
        ['cover', 'Capa'],
        ['help', 'Atalhos'],
      ]
    : [
        ['issues', 'Problemas'],
        ['cover', 'Capa'],
        ['help', 'Atalhos'],
      ];

  const connectionLabel =
    connection === 'denied'
      ? 'Link inválido'
      : connection === 'offline'
        ? 'Sem conexão: as alterações seguem quando voltar'
        : connection === 'connecting'
          ? 'Conectando…'
          : unsynced > 0
            ? 'Sincronizando…'
            : 'Sincronizado';

  return (
    <>
    <div className="shell" data-view={current} inert={modal !== null}>
      <header className="topbar">
        <span className="brand">FREEX</span>
        <button type="button" className="doc-title" onClick={() => toggleSide('cover')}>
          <strong>{title || 'Sem título'}</strong>
          <span className="sr-only"> — editar a capa</span>
        </button>
        <div className="top-actions">
          {share && (
            <button
              type="button"
              className="people"
              onClick={() => toggleSide('people')}
              aria-label={`Pessoas no roteiro: ${
                people.map((p) => p.name + (p.self ? ' (você)' : '')).join(', ') || 'ninguém ainda'
              }. ${connectionLabel}.`}
            >
              <span className={`conn conn-${connection}${unsynced > 0 ? ' conn-busy' : ''}`} aria-hidden="true" />
              {people.slice(0, 4).map((p) => (
                <span key={p.name} className="avatar" style={{ background: p.color }} title={p.name} aria-hidden="true">
                  {initials(p.name)}
                </span>
              ))}
              {people.length > 4 && (
                <span className="avatar more" aria-hidden="true">
                  +{people.length - 4}
                </span>
              )}
            </button>
          )}
          <div className="top-panels" role="group" aria-label="Painéis">
            {panels.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="btn ghost"
                aria-pressed={wide && current === id}
                onClick={() => toggleSide(id)}
              >
                {label}
                {id === 'issues' && problems > 0 && (
                  <span className={`badge${analysis.errors === 0 ? ' warn' : ''}`}>{problems}</span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn"
            onClick={shareScript}
            disabled={sharing || (!share && !ready)}
          >
            {sharing ? 'Criando link…' : 'Compartilhar'}
          </button>
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
          <label htmlFor="import" className="btn ghost top-import">
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
              <label htmlFor="import" className="btn menu-import">
                Importar Fountain…
              </label>
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
                  disabled={!ui || !canEdit}
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
                disabled={!canEdit}
                aria-label="Negrito"
                title="Negrito (Ctrl+B)"
                {...tool(() => editor.current?.toggleMark('bold'))}
              >
                <span className="mark-b">B</span>
              </button>
              <button
                type="button"
                aria-pressed={ui?.marks.italic ?? false}
                disabled={!canEdit}
                aria-label="Itálico"
                title="Itálico (Ctrl+I)"
                {...tool(() => editor.current?.toggleMark('italic'))}
              >
                <span className="mark-i">I</span>
              </button>
              <button
                type="button"
                aria-pressed={ui?.marks.underline ?? false}
                disabled={!canEdit}
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
                disabled={!inSpeech || !canEdit}
                title="Põe esta fala ao lado da seguinte"
                {...tool(() => editor.current?.toggleDual())}
              >
                Diálogo duplo
              </button>
              <button type="button" title="Nova cena (Ctrl+Enter)" disabled={!ui || !canEdit} {...tool(() => editor.current?.insertScene())}>
                + Cena
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Histórico">
              <button
                type="button"
                aria-label="Desfazer"
                title="Desfazer (Ctrl+Z)"
                disabled={!ui?.canUndo || !canEdit}
                {...tool(() => editor.current?.undo())}
              >
                ↶
              </button>
              <button
                type="button"
                aria-label="Refazer"
                title="Refazer (Ctrl+Y)"
                disabled={!ui?.canRedo || !canEdit}
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
              {share && connection === 'denied' ? (
                <div className="denied">
                  <h2>Este link não abre nenhum roteiro</h2>
                  <p>Confira se o link foi copiado por inteiro. Quem criou o roteiro pode compartilhar de novo.</p>
                  <a className="btn primary" href="/">
                    Abrir o editor
                  </a>
                </div>
              ) : ready ? (
                <ScriptEditor
                  key={share ? session?.ydoc.guid : 'local'}
                  ref={editor}
                  initialBlocks={initial}
                  collab={collab}
                  editable={canEdit}
                  onLocalEdit={noteEdit}
                  titlePage={titlePage}
                  onBlocks={(next, pages) => {
                    setBlocks(next);
                    setScriptPages(pages);
                  }}
                  onState={setUi}
                  onOpenCover={() => openSide('cover')}
                />
              ) : (
                <p className="loading">{share ? 'Conectando ao roteiro…' : 'Carregando o roteiro…'}</p>
              )}
              {share && ready && !synced && connection !== 'denied' && (
                <p className="loading" role="status">
                  Conectando ao roteiro…
                </p>
              )}
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {announce}
          </p>

          <div className="statusbar">
            <span>{analysis.scriptPages} pág.</span>
            <span>{analysis.words} palavras</span>
            <span>{analysis.characters} caracteres</span>
            {savedAt !== null && (!share || unsynced === 0) && (
              <span className="saved-at" title={new Date(savedAt).toLocaleString('pt-BR')}>
                {savedLabel(savedAt, now, share ? 'server' : 'browser')}
              </span>
            )}
            {share && unsynced > 0 && <span className="saved-at">Salvando…</span>}
            {share && (
              <span className={`conn-text conn-${connection}`} role="status">
                {connectionLabel}
              </span>
            )}
            <span className="status-spacer" />
            {analysis.errors > 0 && (
              <button type="button" className="status-link danger" onClick={() => openSide('issues')}>
                {analysis.errors} erro(s)
              </button>
            )}
            {analysis.warnings > 0 && (
              <button type="button" className="status-link warn" onClick={() => openSide('issues')}>
                {analysis.warnings} aviso(s)
              </button>
            )}
            {problems === 0 && !empty && <span className="status-ok">Sem problemas</span>}
          </div>
        </section>

        <aside className="pane pane-side" aria-label="Painéis">
          <div className="side-head">
            <div className="side-tabs" role="tablist" aria-label="Seções">
              {panels.map(([id, label]) => (
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
            <button
              type="button"
              className="btn ghost drawer-close"
              aria-label="Fechar painel"
              onClick={() => {
                setView('write');
                editor.current?.focus();
              }}
            >
              ×
            </button>
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

          <div id="panel-people" role="tabpanel" aria-labelledby="tab-people" className="panel" hidden={sideView !== 'people'}>
            <PeoplePanel
              people={people}
              contributors={contributors}
              now={now}
              myName={name}
              onChangeName={() => setDialog('name')}
            />
          </div>

          <div id="panel-issues" role="tabpanel" aria-labelledby="tab-issues" className="panel" hidden={sideView !== 'issues'}>
            <h2>Problemas</h2>
            <p className="panel-note">Erros impedem a exportação. Avisos pedem confirmação.</p>
            <div style={{ marginBottom: 12 }}>
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
              <fieldset className="bare" disabled={!canEdit}>
              <div className="field">
                <label htmlFor="cover-title">Título</label>
                <input
                  id="cover-title"
                  value={cover.title}
                  onChange={(e) => updateCover({ ...cover, title: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-credit">Crédito</label>
                <input
                  id="cover-credit"
                  value={cover.credit}
                  placeholder="Written by"
                  onChange={(e) => updateCover({ ...cover, credit: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-authors">Autoria</label>
                <textarea
                  id="cover-authors"
                  value={cover.authors}
                  onChange={(e) => updateCover({ ...cover, authors: e.target.value })}
                  rows={2}
                />
                <small>Um nome por linha.</small>
              </div>
              <div className="field">
                <label htmlFor="cover-source">Baseado em</label>
                <input
                  id="cover-source"
                  value={cover.source}
                  onChange={(e) => updateCover({ ...cover, source: e.target.value })}
                  autoComplete="off"
                />
              </div>
              <div className="field">
                <label htmlFor="cover-contact">Contato</label>
                <textarea
                  id="cover-contact"
                  value={cover.contact}
                  onChange={(e) => updateCover({ ...cover, contact: e.target.value })}
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
                  onChange={(e) => updateCover({ ...cover, date: e.target.value })}
                  autoComplete="off"
                />
              </div>
              </fieldset>
            </form>
          </div>

          <div id="panel-help" role="tabpanel" aria-labelledby="tab-help" className="panel" hidden={sideView !== 'help'}>
            <h2>Atalhos de teclado</h2>
            <dl className="shortcuts">
              {SHORTCUTS.map(([keys, what]) => (
                <div key={keys} style={{ display: 'contents' }}>
                  <dt>{keys}</dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      <nav className="bottom-nav" aria-label="Seções">
        {(
          [
            ['write', 'Escrever'],
            ['people', 'Pessoas'],
            ['preview', 'Páginas'],
            ['issues', 'Problemas'],
            ['cover', 'Capa'],
            ['help', 'Atalhos'],
          ] as const
        )
          .filter(([id]) =>
            id === 'preview' ? phone : id === 'help' ? !phone : id === 'people' ? !!share : true,
          )
          .map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={current === id}
              onClick={() => (id === 'write' ? setView('write') : openSide(id))}
            >
              {label}
              {id === 'issues' && problems > 0 && (
                <span className={`badge${analysis.errors === 0 ? ' warn' : ''}`}>{problems}</span>
              )}
            </button>
          ))}
      </nav>
    </div>
    {modal === 'name' && (
      <NameDialog required={needName} initial={name} onSubmit={confirmName} onCancel={() => setDialog(null)} />
    )}
    {modal === 'share' && share && (
      <ShareDialog link={shareLink(window.location.origin, share.token)} onClose={() => setDialog(null)} />
    )}
    </>
  );
}
