import { Plugin } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import type { Node as PmNode } from 'prosemirror-model';
import { ELEMENT_BOX, isClosingText } from '@freex/screenplay';

const CLOSING_NODES: ReadonlySet<string> = new Set(['action', 'transition', 'scene_heading']);

/** Column of the closing mark inside the text area; the same rule as `packages/layout`. */
export function closingIndent(text: string): number {
  const { width } = ELEMENT_BOX.action;
  return Math.max(0, Math.floor((width - text.trim().length) / 2));
}

/**
 * Centres the closing mark (`THE END`, `END`, `FIM`) while it is the last block of the script,
 * so the page shows what the layout engine and the PDF will print.
 */
export function closingDecoration(doc: PmNode): DecorationSet {
  const last = doc.lastChild;
  if (!last || !CLOSING_NODES.has(last.type.name)) {
    return DecorationSet.empty;
  }
  if (!isClosingText(last.textContent)) return DecorationSet.empty;
  const indent = closingIndent(last.textContent.replace(/\s+/g, ' '));
  const from = doc.content.size - last.nodeSize;
  return DecorationSet.create(doc, [
    Decoration.node(from, doc.content.size, {
      class: 'is-closing',
      style: `margin-left: ${indent}ch; width: ${ELEMENT_BOX.action.width - indent}ch; text-align: left;`,
    }),
  ]);
}

export const closingMark = new Plugin({
  props: {
    decorations: (state) => closingDecoration(state.doc),
  },
});
