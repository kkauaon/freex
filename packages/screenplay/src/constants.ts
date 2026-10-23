/**
 * Canonical FREEX Standard page profile.
 * Source of truth: docs/02-roteiro/normas-de-formatacao.md (mirrored in AGENTS.md section 3).
 * Changing any value here requires the process in AGENTS.md section 3.1.
 */
export const PROFILE_VERSION = 1;

/** 10 characters per inch (Courier Prime 12 pt). */
export const CPI = 10;
/** 6 lines per inch. */
export const LPI = 6;

export const PAGE = {
  widthIn: 8.5,
  heightIn: 11,
  marginLeftIn: 1.5,
  marginRightIn: 1,
  marginTopIn: 1,
  marginBottomIn: 1,
} as const;

/** Text area: 6.0 x 9.0 in, i.e. 60 columns by 54 body lines. */
export const GRID = {
  columns: 60,
  bodyLines: 54,
} as const;

export type ElementType =
  | 'scene-heading'
  | 'action'
  | 'character'
  | 'parenthetical'
  | 'dialogue'
  | 'transition';

export interface ElementBox {
  /** Offset from the left edge of the text area, in columns. */
  readonly indent: number;
  /** Width in columns. */
  readonly width: number;
  readonly align: 'left' | 'right';
}

/** Offsets are relative to the text area (left margin 1.5 in). */
export const ELEMENT_BOX: Readonly<Record<ElementType, ElementBox>> = {
  'scene-heading': { indent: 0, width: 60, align: 'left' },
  action: { indent: 0, width: 60, align: 'left' },
  // 3.7 in from page edge => 2.2 in from margin, 2.2 in wide
  character: { indent: 22, width: 22, align: 'left' },
  // 3.1 in => 1.6 in from margin, 2.0 in wide
  parenthetical: { indent: 16, width: 20, align: 'left' },
  // 2.5 in => 1.0 in from margin, 3.5 in wide
  dialogue: { indent: 10, width: 35, align: 'left' },
  // right aligned at 7.5 in => right edge of the 6.0 in text area
  transition: { indent: 0, width: 60, align: 'right' },
};

export const BLANK_LINES_BETWEEN_BLOCKS = 1;
