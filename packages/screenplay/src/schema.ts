import { Node as PmNodeClass, Schema, type NodeSpec } from 'prosemirror-model';
import { SCHEMA_VERSION, type PmNode, type ScriptDocument } from './canonical';

const text = (element: string, extra: Partial<NodeSpec> = {}): NodeSpec => ({
  content: 'inline*',
  marks: 'bold italic underline',
  defining: true,
  parseDOM: [{ tag: `[data-element="${element}"]`, preserveWhitespace: 'full' }],
  toDOM: () => ['p', { 'data-element': element }, 0],
  ...extra,
});

/**
 * ProseMirror schema of the script (docs/03-arquitetura/modelo-de-dados.md section 5). Shared
 * by the browser editor and, later, the collaboration server. DOM-free apart from `toDOM`.
 *
 * A speech is `character (parenthetical? dialogue)+`: a parenthetical always sits between the
 * cue and a dialogue or between two dialogues, and cue, parenthetical and dialogue can never
 * be separated from the speech they belong to.
 */
export const scriptSchema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    scene_heading: text('scene-heading', {
      group: 'block',
      attrs: { sceneNumber: { default: null }, revisionColor: { default: null } },
    }),
    action: text('action', { group: 'block' }),
    transition: text('transition', { group: 'block' }),
    shot: text('shot', { group: 'block' }),
    speech: {
      group: 'block',
      content: 'character (parenthetical? dialogue)+',
      toDOM: () => ['div', { 'data-element': 'speech' }, 0],
      parseDOM: [{ tag: '[data-element="speech"]' }],
    },
    dual_dialogue: {
      group: 'block',
      content: 'speech speech',
      toDOM: () => ['div', { 'data-element': 'dual-dialogue' }, 0],
      parseDOM: [{ tag: '[data-element="dual-dialogue"]' }],
    },
    character: text('character'),
    parenthetical: text('parenthetical'),
    dialogue: text('dialogue'),
  },
  marks: {
    bold: { toDOM: () => ['strong', 0], parseDOM: [{ tag: 'strong' }, { tag: 'b' }] },
    italic: { toDOM: () => ['em', 0], parseDOM: [{ tag: 'em' }, { tag: 'i' }] },
    underline: { toDOM: () => ['u', 0], parseDOM: [{ tag: 'u' }] },
  },
});

/** Builds the ProseMirror document. Throws if the JSON does not satisfy the schema. */
export function scriptDocumentToNode(doc: ScriptDocument): PmNodeClass {
  const node = PmNodeClass.fromJSON(scriptSchema, { type: 'doc', content: doc.content });
  node.check();
  return node;
}

/** The canonical JSON of a ProseMirror document. */
export function nodeToScriptDocument(node: PmNodeClass): ScriptDocument {
  const json = node.toJSON() as { content?: PmNode[] };
  return { schemaVersion: SCHEMA_VERSION, type: 'doc', content: json.content ?? [] };
}
