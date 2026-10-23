'use client';

import { chainCommands, deleteSelection, selectAll } from 'prosemirror-commands';
import { history, redo, redoDepth, undo, undoDepth } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import type { MarkType } from 'prosemirror-model';
import { EditorState, Plugin, Selection, type Command } from 'prosemirror-state';
import { Decoration, DecorationSet, EditorView } from 'prosemirror-view';
import 'prosemirror-view/style/prosemirror.css';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';
import {
  redoCommand,
  undoCommand,
  yCursorPlugin,
  ySyncPlugin,
  ySyncPluginKey,
  yUndoPlugin,
  yUndoPluginKey,
} from 'y-prosemirror';
import type * as Y from 'yjs';
import { COLLAB_TYPES } from '@freex/contracts';
import { paginate, type Page } from '@freex/layout';
import {
  blocksToDocument,
  documentToBlocks,
  nodeToScriptDocument,
  scriptDocumentToNode,
  scriptSchema,
  type Block,
  type ElementType,
  type TitlePage,
} from '@freex/screenplay';
import {
  backspace,
  deleteForward,
  enter,
  insertSceneAfter,
  pastePlainText,
  positionOfBlock,
  selectionInfo,
  setElement,
  tab,
  toggleBold,
  toggleDualDialogue,
  toggleItalic,
  toggleUnderline,
  type SelectionInfo,
} from './commands';
import { awarenessStateFilter, cursorBuilder, selectionBuilder } from './collabCursors';
import { SHEET_W, buildPageDecorations, pageDecorations, pageDecorationsKey } from './pageBreaks';

/** Below this width the editor drops the page geometry and writes in a single column. */
export const LINEAR_BELOW_PX = 640;
/** On wide windows the sheet grows up to this factor, so the text is easier to read. */
const MAX_ZOOM = 1.25;

/** A script edited by several people at once through Yjs. */
export interface CollabEditing {
  readonly ydoc: Y.Doc;
  readonly awareness: Awareness;
  /** Who is typing here; null until the person has given a name, and then the script is read-only. */
  readonly user: { readonly name: string; readonly color: string } | null;
}

export interface EditorUiState extends SelectionInfo {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly marks: { readonly bold: boolean; readonly italic: boolean; readonly underline: boolean };
}

export interface ScriptEditorApi {
  /** Replaces the whole script; the change can be undone. */
  load(blocks: Block[]): void;
  getBlocks(): Block[];
  jumpToBlock(index: number): void;
  setElement(type: ElementType): void;
  toggleMark(name: 'bold' | 'italic' | 'underline'): void;
  toggleDual(): void;
  insertScene(): void;
  undo(): void;
  redo(): void;
  focus(): void;
}

interface Props {
  initialBlocks: Block[];
  /** Edit through Yjs instead of a local history. Fixed for the life of the editor. */
  collab?: CollabEditing;
  /** False shows the script but takes no edits. Default true. */
  editable?: boolean;
  /** The person at this keyboard changed the script (not a remote change). */
  onLocalEdit?(): void;
  /** The cover is drawn as the first sheet of the script. */
  titlePage: TitlePage | null;
  /** Called a moment after the text stops changing, and right after `load`, with the layout. */
  onBlocks(blocks: Block[], pages: Page[]): void;
  onState(state: EditorUiState): void;
  onOpenCover(): void;
}

const BLOCKS_DELAY_MS = 150;

const ELEMENT_KEYS: readonly ElementType[] = [
  'scene-heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
];

function markActive(state: EditorState, type: MarkType): boolean {
  const { from, to, empty, $from } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

function uiState(state: EditorState, collab: boolean): EditorUiState {
  const m = scriptSchema.marks;
  const yUndo = collab ? yUndoPluginKey.getState(state)?.undoManager : undefined;
  return {
    ...selectionInfo(state),
    canUndo: collab ? !!yUndo?.canUndo() : undoDepth(state) > 0,
    canRedo: collab ? !!yUndo?.canRedo() : redoDepth(state) > 0,
    marks: {
      bold: !!m.bold && markActive(state, m.bold),
      italic: !!m.italic && markActive(state, m.italic),
      underline: !!m.underline && markActive(state, m.underline),
    },
  };
}

/** Marks the block with the caret, so the CSS can show which element is being edited. */
const currentBlock = new Plugin({
  props: {
    decorations(state) {
      const { $from } = state.selection;
      if (!$from.parent.isTextblock) return null;
      return DecorationSet.create(state.doc, [
        Decoration.node($from.before(), $from.after(), { class: 'is-current' }),
      ]);
    },
  },
});

function buildState(blocks: Block[], onPlainPaste: Plugin, collab?: CollabEditing): EditorState {
  const bindings: Record<string, Command> = {
    Enter: enter,
    'Mod-Enter': insertSceneAfter,
    Tab: tab(false),
    'Shift-Tab': tab(true),
    Backspace: chainCommands(deleteSelection, backspace),
    Delete: chainCommands(deleteSelection, deleteForward),
    'Shift-Enter': () => true,
    'Mod-b': toggleBold,
    'Mod-i': toggleItalic,
    'Mod-u': toggleUnderline,
    // with other people in the script, undo only takes back what this person wrote
    'Mod-z': collab ? undoCommand : undo,
    'Mod-y': collab ? redoCommand : redo,
    'Mod-Shift-z': collab ? redoCommand : redo,
    'Mod-a': selectAll,
  };
  ELEMENT_KEYS.forEach((type, i) => {
    bindings[`Alt-Shift-${i + 1}`] = setElement(type);
  });
  const common = [keymap(bindings), currentBlock, pageDecorations, onPlainPaste];
  if (collab) {
    // the document comes from the room: the first sync fills it in
    return EditorState.create({
      schema: scriptSchema,
      plugins: [
        ySyncPlugin(collab.ydoc.getXmlFragment(COLLAB_TYPES.content)),
        yCursorPlugin(collab.awareness, { awarenessStateFilter, cursorBuilder, selectionBuilder }),
        yUndoPlugin(),
        ...common,
      ],
    });
  }
  return EditorState.create({
    doc: scriptDocumentToNode(blocksToDocument(blocks)),
    plugins: [history(), ...common],
  });
}

export const ScriptEditor = forwardRef<ScriptEditorApi, Props>(function ScriptEditor(
  { initialBlocks, collab, editable = true, onLocalEdit, titlePage, onBlocks, onState, onOpenCover },
  ref,
) {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // callbacks change on every render; the view is created once and reads the latest
  const callbacks = useRef({ onBlocks, onState, onOpenCover, onLocalEdit });
  callbacks.current = { onBlocks, onState, onOpenCover, onLocalEdit };
  const editableRef = useRef(editable);
  editableRef.current = editable;
  const collabRef = useRef(collab);
  const isCollab = collabRef.current !== undefined;
  const cover = useRef(titlePage);
  cover.current = titlePage;
  const layout = useRef<Page[]>([]);
  const refresh = useRef<() => void>(() => undefined);
  const emitNow = useRef<() => void>(() => undefined);
  const [fit, setFit] = useState({ zoom: 1, linear: false });

  // the sheet is 8.5 in wide: narrower areas scale it down, and phones write in one column
  useEffect(() => {
    const parent = wrap.current?.parentElement;
    if (!parent) return;
    const measure = () => {
      const w = parent.clientWidth;
      setFit(
        w < LINEAR_BELOW_PX
          ? { zoom: 1, linear: true }
          : { zoom: Math.min(MAX_ZOOM, w / SHEET_W), linear: false },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let timer: number | undefined;
    // draws the sheets: the page furniture comes from the same paginator as the PDF
    const decorate = (v: EditorView) => {
      v.dispatch(
        v.state.tr
          .setMeta(
            pageDecorationsKey,
            buildPageDecorations(v.state.doc, {
              pages: layout.current,
              titlePage: cover.current,
              onOpenCover: () => callbacks.current.onOpenCover(),
            }),
          )
          .setMeta('addToHistory', false),
      );
    };
    const emitBlocks = (v: EditorView) => {
      const blocks = documentToBlocks(nodeToScriptDocument(v.state.doc));
      layout.current = paginate(blocks);
      decorate(v);
      callbacks.current.onBlocks(blocks, layout.current);
    };
    refresh.current = () => {
      if (view.current) decorate(view.current);
    };

    // Only plain text is ever pasted, so the schema cannot be broken by rich clipboard content.
    const plainPaste = new Plugin({
      props: {
        handlePaste(v, event) {
          event.preventDefault();
          const text = event.clipboardData?.getData('text/plain') ?? '';
          return pastePlainText(v.state, v.dispatch.bind(v), text);
        },
        handleDrop: () => true,
      },
    });

    const v = new EditorView(el, {
      state: buildState(initialBlocks, plainPaste, collabRef.current),
      editable: () => editableRef.current,
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Roteiro',
        spellcheck: 'true',
        lang: 'pt-BR',
        autocapitalize: 'sentences',
      },
      // `this` is the view: the Yjs plugin dispatches while the view is still being built, before `v` exists
      dispatchTransaction(this: EditorView, tr) {
        const view = this;
        // y-prosemirror schedules metadata for a view with a timer: it may arrive after unmount
        if (view.isDestroyed) return;
        const next = view.state.apply(tr);
        view.updateState(next);
        if (tr.docChanged) {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => emitBlocks(view), BLOCKS_DELAY_MS);
          // remote changes come from the room; only what this person typed counts as their edit
          if (isCollab && !tr.getMeta(ySyncPluginKey)?.isChangeOrigin) callbacks.current.onLocalEdit?.();
        }
        if (tr.docChanged || tr.selectionSet || tr.storedMarksSet) {
          callbacks.current.onState(uiState(next, isCollab));
        }
      },
    });
    view.current = v;
    emitNow.current = () => emitBlocks(v);
    emitBlocks(v);
    callbacks.current.onState(uiState(v.state, isCollab));
    return () => {
      window.clearTimeout(timer);
      v.destroy();
      view.current = null;
    };
    // the editor is created once; later content comes through `load`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a new cover redraws the first sheet without paginating again
  useEffect(() => {
    refresh.current();
  }, [titlePage]);

  // read-only until the person has a name; the toolbar and the keyboard both stop
  useEffect(() => {
    view.current?.setProps({ editable: () => editable });
  }, [editable]);

  // who the others see: a name and a colour, or nothing while the person has no name
  const user = collab?.user;
  useEffect(() => {
    const c = collabRef.current;
    if (!c) return;
    c.awareness.setLocalStateField('user', user ? { name: user.name, color: user.color } : null);
  }, [user?.name, user?.color]); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(
    ref,
    (): ScriptEditorApi => {
      const run = (cmd: Command) => {
        const v = view.current;
        if (!v || !editableRef.current) return;
        cmd(v.state, v.dispatch.bind(v), v);
        v.focus();
      };
      return {
        load(blocks) {
          const v = view.current;
          if (!v || !editableRef.current) return;
          const node = scriptDocumentToNode(blocksToDocument(blocks));
          const tr = v.state.tr.replaceWith(0, v.state.doc.content.size, node.content);
          v.dispatch(tr.setSelection(Selection.atStart(tr.doc)).scrollIntoView());
          emitNow.current();
        },
        getBlocks: () =>
          view.current ? documentToBlocks(nodeToScriptDocument(view.current.state.doc)) : [],
        jumpToBlock(index) {
          const v = view.current;
          const pos = v ? positionOfBlock(v.state.doc, index) : null;
          if (!v || pos === null) return;
          v.dispatch(v.state.tr.setSelection(Selection.near(v.state.doc.resolve(pos))).scrollIntoView());
          v.focus();
        },
        setElement: (type) => run(setElement(type)),
        toggleMark(name) {
          run(name === 'bold' ? toggleBold : name === 'italic' ? toggleItalic : toggleUnderline);
        },
        toggleDual: () => run(toggleDualDialogue),
        insertScene: () => run(insertSceneAfter),
        undo: () => run(isCollab ? undoCommand : undo),
        redo: () => run(isCollab ? redoCommand : redo),
        focus: () => view.current?.focus(),
      };
    },
    [],
  );

  return (
    <div
      ref={wrap}
      className="script-zoom"
      data-linear={fit.linear}
      style={fit.linear ? undefined : { zoom: fit.zoom }}
    >
      <div ref={host} className="script-editor" />
    </div>
  );
});
