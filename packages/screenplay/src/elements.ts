import type { ElementType } from './constants';

/** Canonical cycle order for the element picker. */
export const ELEMENT_TYPES: readonly ElementType[] = [
  'scene-heading',
  'action',
  'character',
  'parenthetical',
  'dialogue',
  'transition',
  'shot',
];

interface Transitions {
  readonly enter: ElementType;
  readonly enterEmpty: ElementType;
  readonly tab: ElementType;
  readonly shiftTab: ElementType;
}

/** State machine from docs/04-design/ux-e-interface.md section 5.2. */
const STATE_MACHINE: Readonly<Record<ElementType, Transitions>> = {
  'scene-heading': { enter: 'action', enterEmpty: 'action', tab: 'action', shiftTab: 'transition' },
  action: {
    enter: 'action',
    enterEmpty: 'scene-heading',
    tab: 'scene-heading',
    shiftTab: 'scene-heading',
  },
  character: { enter: 'dialogue', enterEmpty: 'action', tab: 'dialogue', shiftTab: 'action' },
  parenthetical: {
    enter: 'dialogue',
    enterEmpty: 'dialogue',
    tab: 'dialogue',
    shiftTab: 'character',
  },
  dialogue: { enter: 'action', enterEmpty: 'character', tab: 'character', shiftTab: 'parenthetical' },
  transition: {
    enter: 'scene-heading',
    enterEmpty: 'scene-heading',
    tab: 'scene-heading',
    shiftTab: 'action',
  },
  shot: { enter: 'action', enterEmpty: 'scene-heading', tab: 'action', shiftTab: 'scene-heading' },
};

/** Element created by `Enter`; `empty` is true when the current block has no text. */
export function nextOnEnter(current: ElementType, empty: boolean): ElementType {
  const t = STATE_MACHINE[current];
  return empty ? t.enterEmpty : t.enter;
}

export function nextOnTab(current: ElementType): ElementType {
  return STATE_MACHINE[current].tab;
}

export function nextOnShiftTab(current: ElementType): ElementType {
  return STATE_MACHINE[current].shiftTab;
}
