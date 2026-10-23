import type { ElementType } from './constants';

export type MarkType = 'bold' | 'italic' | 'underline';

/** Inline emphasis over `[from, to)` UTF-16 offsets of the block text. Never affects width. */
export interface Mark {
  readonly type: MarkType;
  readonly from: number;
  readonly to: number;
}

export interface Block {
  readonly type: ElementType;
  readonly text: string;
  readonly marks?: readonly Mark[];
  /**
   * Dual dialogue: a speech whose character cue has `column: 'left'`, directly followed by
   * a speech whose cue has `column: 'right'`, is laid out side by side. The column of a
   * parenthetical or dialogue block is the column of its cue and is ignored.
   */
  readonly column?: 'left' | 'right';
}
