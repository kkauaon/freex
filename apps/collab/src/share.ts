import * as Y from 'yjs';
import { prosemirrorJSONToYDoc } from 'y-prosemirror';
import { COLLAB_TYPES, type CreateShareRequest } from '@freex/contracts';
import { SCHEMA_VERSION, blocksToDocument, scriptSchema, type Block } from '@freex/screenplay';

/** Names of the shared types inside the Y.Doc (docs/03-arquitetura/colaboracao-tempo-real.md 3.1). */
export const CONTENT_FRAGMENT = COLLAB_TYPES.content;
export const COVER_MAP = COLLAB_TYPES.cover;
export const META_MAP = COLLAB_TYPES.meta;

/** The Yjs state a new shared script starts from: the script and the cover of the person who shares. */
export function buildShareState(req: CreateShareRequest): Uint8Array {
  // a script always has at least one block, so the first editor has somewhere to put the caret
  const blocks: Block[] = req.blocks.length > 0 ? (req.blocks as Block[]) : [{ type: 'action', text: '' }];
  const doc = blocksToDocument(blocks);
  const ydoc = prosemirrorJSONToYDoc(scriptSchema, { type: 'doc', content: doc.content }, CONTENT_FRAGMENT);
  const cover = ydoc.getMap<string>(COVER_MAP);
  for (const [key, value] of Object.entries(req.cover ?? {})) cover.set(key, value);
  const meta = ydoc.getMap<number | string>(META_MAP);
  meta.set('schemaVersion', SCHEMA_VERSION);
  if (req.profile) meta.set('profile', req.profile);
  const state = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  return state;
}
