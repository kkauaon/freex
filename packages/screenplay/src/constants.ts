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
  | 'transition'
  | 'shot';

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
  // normas-de-formatacao.md 5.7: a shot uses the action geometry
  shot: { indent: 0, width: 60, align: 'left' },
};

/**
 * Dual dialogue columns (normas-de-formatacao.md 5.8), offsets from the text area.
 * Character cues sit on half columns (2.75 in and 5.75 in from the page edge).
 */
export const DUAL_DIALOGUE_BOX = {
  left: {
    character: { indent: 12.5 },
    parenthetical: { indent: 7.5, width: 17.5 },
    dialogue: { indent: 5, width: 25 },
  },
  right: {
    character: { indent: 42.5 },
    parenthetical: { indent: 37.5, width: 20 },
    dialogue: { indent: 35, width: 25 },
  },
} as const;

/** Title page (normas-de-formatacao.md 6.2). Distances are from the top of the page. */
export const TITLE_PAGE = {
  /** Top of the title block. */
  titleTopIn: 3.25,
  /** Horizontal centre of the title block; 0.25 in right of the geometric centre. */
  centerIn: 4.5,
  /** Top of the last contact line. */
  contactLastLineIn: 9.5,
  maxTitleLines: 3,
} as const;

export const BLANK_LINES_BETWEEN_BLOCKS = 1;

/** Character cue and parenthetical lengths that trigger warnings (FMT104, FMT105). */
export const MAX_CHARACTER_CUE_LENGTH = 22;
export const MAX_PARENTHETICAL_LENGTH = 20;
/** Line limits that trigger warnings (FMT106, FMT107) and the scene heading width (FMT101). */
export const MAX_ACTION_PARAGRAPH_LINES = 4;
export const MAX_DIALOGUE_LINES = 10;
