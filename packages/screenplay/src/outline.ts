import type { Block } from './block';
import { characterKey, parseSceneHeading, type SceneHeading } from './parse';
import { isBlank } from './text';

export interface SceneEntry {
  readonly blockIndex: number;
  /** 1-based position in reading order. Production scene numbers are a later feature. */
  readonly position: number;
  readonly heading: SceneHeading;
  readonly text: string;
}

/** Scene navigator source (FR-EDT-007). Page numbers come from the layout engine. */
export function listScenes(blocks: readonly Block[]): SceneEntry[] {
  const scenes: SceneEntry[] = [];
  blocks.forEach((b, blockIndex) => {
    if (b.type !== 'scene-heading' || isBlank(b.text)) return;
    scenes.push({
      blockIndex,
      position: scenes.length + 1,
      heading: parseSceneHeading(b.text),
      text: b.text.trim(),
    });
  });
  return scenes;
}

export interface CharacterEntry {
  /** Upper-case name without extensions. */
  readonly name: string;
  /** Index of the scene (0-based in `listScenes`) of the first line, or -1 before any scene. */
  readonly firstSceneIndex: number;
  readonly firstBlockIndex: number;
  /** Number of speeches (character cues), counting `(CONT'D)` cues once per cue. */
  readonly speeches: number;
}

/** Characters in order of first appearance (FR-EDT-008, FR-EXP-006). */
export function listCharacters(blocks: readonly Block[]): CharacterEntry[] {
  const byName = new Map<string, CharacterEntry>();
  let sceneIndex = -1;
  blocks.forEach((b, blockIndex) => {
    if (b.type === 'scene-heading' && !isBlank(b.text)) sceneIndex++;
    if (b.type !== 'character') return;
    const name = characterKey(b.text);
    if (name === '') return;
    const found = byName.get(name);
    byName.set(
      name,
      found
        ? { ...found, speeches: found.speeches + 1 }
        : { name, firstSceneIndex: sceneIndex, firstBlockIndex: blockIndex, speeches: 1 },
    );
  });
  return [...byName.values()];
}

/** Autocomplete for character cues: used names matching the prefix, most frequent first. */
export function suggestCharacters(blocks: readonly Block[], prefix: string): string[] {
  const p = characterKey(prefix);
  return listCharacters(blocks)
    .filter((c) => c.name.startsWith(p) && c.name !== p)
    .sort((a, b) => b.speeches - a.speeches || a.firstBlockIndex - b.firstBlockIndex)
    .map((c) => c.name);
}

export interface TextCounts {
  readonly words: number;
  readonly characters: number;
}

/** FR-EDT-014. Characters exclude the line breaks between blocks. */
export function countText(blocks: readonly Block[]): TextCounts {
  let words = 0;
  let characters = 0;
  for (const b of blocks) {
    const text = b.text.trim();
    if (text === '') continue;
    words += text.split(/\s+/).length;
    characters += text.length;
  }
  return { words, characters };
}
