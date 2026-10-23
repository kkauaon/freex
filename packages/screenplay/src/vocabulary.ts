/**
 * Element vocabulary (normas-de-formatacao.md section 10). The locale is script metadata:
 * it drives autocomplete only. User text is never translated, and both vocabularies are
 * always recognised so geometry and validation do not depend on the locale.
 */
export type Locale = 'en' | 'pt-BR';

export const SCENE_TIMES: Readonly<Record<Locale, readonly string[]>> = {
  en: [
    'DAY',
    'NIGHT',
    'DAWN',
    'DUSK',
    'MORNING',
    'AFTERNOON',
    'EVENING',
    'CONTINUOUS',
    'LATER',
    'MOMENTS LATER',
    'SAME TIME',
    'MAGIC HOUR',
  ],
  'pt-BR': ['DIA', 'NOITE', 'MANHÃ', 'TARDE', 'CONTÍNUO', 'DEPOIS', 'MOMENTOS DEPOIS'],
};

export type TransitionKind = 'cut' | 'fade-in' | 'fade-out' | 'other';

export interface TransitionEntry {
  readonly text: string;
  readonly kind: TransitionKind;
}

export const TRANSITIONS: Readonly<Record<Locale, readonly TransitionEntry[]>> = {
  en: [
    { text: 'CUT TO:', kind: 'cut' },
    { text: 'DISSOLVE TO:', kind: 'cut' },
    { text: 'SMASH CUT TO:', kind: 'cut' },
    { text: 'MATCH CUT TO:', kind: 'cut' },
    { text: 'JUMP CUT TO:', kind: 'cut' },
    { text: 'WIPE TO:', kind: 'cut' },
    { text: 'FADE IN:', kind: 'fade-in' },
    { text: 'FADE OUT.', kind: 'fade-out' },
    { text: 'FADE TO BLACK.', kind: 'fade-out' },
  ],
  'pt-BR': [
    { text: 'CORTA PARA:', kind: 'cut' },
    { text: 'DISSOLVE PARA:', kind: 'cut' },
    { text: 'FADE IN:', kind: 'fade-in' },
    { text: 'FADE OUT.', kind: 'fade-out' },
  ],
};

/** Character extensions, always upper case and parenthesised (elementos-e-convencoes.md 4.3). */
export const CHARACTER_EXTENSIONS: readonly string[] = [
  'V.O.',
  'O.S.',
  'O.C.',
  "CONT'D",
  'PRE-LAP',
  'FILTERED',
  'ON TV',
  'ON RADIO',
  'SINGING',
  'SUBTITLED',
];

/** Scene heading prefixes, longest first so `INT./EXT.` wins over `INT.`. */
export const SCENE_PREFIXES: readonly string[] = ['INT./EXT.', 'INT/EXT.', 'I/E.', 'INT.', 'EXT.'];

/** Prefixes that open a shot line (elementos-e-convencoes.md 9.2). */
export const SHOT_PREFIXES: readonly string[] = ['CLOSE ON:', 'WIDE SHOT:', 'ANGLE ON:'];

function suggest(candidates: readonly string[], prefix: string): string[] {
  const p = prefix.trim().toUpperCase();
  if (p === '') return [...candidates];
  return candidates.filter((c) => c.startsWith(p) && c !== p);
}

export function suggestTimes(prefix: string, locale: Locale): string[] {
  return suggest(SCENE_TIMES[locale], prefix);
}

export function suggestTransitions(prefix: string, locale: Locale): string[] {
  return suggest(
    TRANSITIONS[locale].map((t) => t.text),
    prefix,
  );
}
