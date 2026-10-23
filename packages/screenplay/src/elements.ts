import type { ElementType } from './constants';

/**
 * The elements in the order `Tab` walks them and the element picker lists them. `Shift+Tab`
 * walks the same order backwards; both wrap around.
 */
export const ELEMENT_TYPES: readonly ElementType[] = [
  'scene-heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
];

interface EnterTransitions {
  readonly enter: ElementType;
  readonly enterEmpty: ElementType;
}

/** `Enter` column of the state machine in docs/04-design/ux-e-interface.md section 5.2. */
const ENTER: Readonly<Record<ElementType, EnterTransitions>> = {
  'scene-heading': { enter: 'action', enterEmpty: 'action' },
  action: { enter: 'action', enterEmpty: 'scene-heading' },
  character: { enter: 'dialogue', enterEmpty: 'action' },
  parenthetical: { enter: 'dialogue', enterEmpty: 'dialogue' },
  dialogue: { enter: 'action', enterEmpty: 'character' },
  transition: { enter: 'scene-heading', enterEmpty: 'scene-heading' },
  shot: { enter: 'action', enterEmpty: 'scene-heading' },
};

/** Element created by `Enter`; `empty` is true when the current block has no text. */
export function nextOnEnter(current: ElementType, empty: boolean): ElementType {
  const t = ENTER[current];
  return empty ? t.enterEmpty : t.enter;
}

function step(current: ElementType, by: 1 | -1): ElementType {
  const i = ELEMENT_TYPES.indexOf(current);
  const n = ELEMENT_TYPES.length;
  return ELEMENT_TYPES[(i + by + n) % n] ?? current;
}

/** `Tab`: the next element in `ELEMENT_TYPES`, wrapping around. */
export function nextOnTab(current: ElementType): ElementType {
  return step(current, 1);
}

/** `Shift+Tab`: the previous element in `ELEMENT_TYPES`, wrapping around. */
export function nextOnShiftTab(current: ElementType): ElementType {
  return step(current, -1);
}
