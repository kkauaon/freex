import type { Block } from './block';
import {
  ELEMENT_BOX,
  MAX_ACTION_PARAGRAPH_LINES,
  MAX_CHARACTER_CUE_LENGTH,
  MAX_DIALOGUE_LINES,
  MAX_PARENTHETICAL_LENGTH,
  type ElementType,
  GRID,
} from './constants';
import { characterKey, classifyTransition, isClosingBlock, parseSceneHeading } from './parse';
import { isBlank, UPPERCASE_ELEMENTS, wrap } from './text';

export type Severity = 'error' | 'warning' | 'info';

/** Codes from docs/02-roteiro/normas-de-formatacao.md sections 8.1 and 8.2. */
export type IssueCode =
  | 'FMT003'
  | 'FMT004'
  | 'FMT005'
  | 'FMT006'
  | 'FMT007'
  | 'FMT008'
  | 'FMT101'
  | 'FMT102'
  | 'FMT103'
  | 'FMT104'
  | 'FMT105'
  | 'FMT106'
  | 'FMT107'
  | 'FMT108'
  | 'FMT109'
  | 'FMT110'
  | 'FMT111'
  | 'FMT112'
  | 'FMT113'
  | 'FMT114'
  | 'FMT115'
  | 'FMT116'
  | 'FMT117'
  | 'FMT118'
  | 'FMT119'
  | 'FMT120'
  | 'FMT121';

export interface Issue {
  readonly code: IssueCode;
  readonly severity: Severity;
  /** Index into the validated block list. */
  readonly blockIndex: number;
  /** User-facing message in pt-BR. Never contains script text. */
  readonly message: string;
}

export interface ValidateOptions {
  /** `spec` (default) discourages camera directions; `production` allows them. */
  readonly profile?: 'spec' | 'production';
}

const MESSAGES: Readonly<Record<IssueCode, { severity: Severity; message: string }>> = {
  FMT003: { severity: 'error', message: 'Uma palavra é mais larga que a área do elemento.' },
  FMT004: { severity: 'error', message: 'Personagem sem parêntese ou diálogo em seguida.' },
  FMT005: { severity: 'error', message: 'Parêntese sem diálogo em seguida.' },
  FMT006: { severity: 'error', message: 'Cabeçalho de cena vazio.' },
  FMT007: { severity: 'error', message: 'Personagem vazio.' },
  FMT008: { severity: 'error', message: 'Diálogo ou parêntese fora de um bloco de personagem.' },
  FMT101: { severity: 'warning', message: 'Cabeçalho de cena com mais de 60 caracteres.' },
  FMT102: { severity: 'warning', message: 'Cabeçalho de cena sem " - TEMPO".' },
  FMT103: { severity: 'warning', message: 'Cabeçalho de cena sem INT., EXT., INT./EXT. ou I/E.' },
  FMT104: { severity: 'warning', message: 'Personagem com mais de 22 caracteres.' },
  FMT105: { severity: 'warning', message: 'Parêntese com mais de 20 caracteres.' },
  FMT106: { severity: 'warning', message: 'Parágrafo de ação com mais de 4 linhas.' },
  FMT107: { severity: 'warning', message: 'Fala com mais de 10 linhas.' },
  FMT108: { severity: 'warning', message: 'Evite "nós vemos" / "we see": descreva a imagem.' },
  FMT109: { severity: 'warning', message: 'Direção de câmera no perfil spec.' },
  FMT110: { severity: 'warning', message: 'Número de páginas fora da faixa orientativa.' },
  FMT111: { severity: 'warning', message: 'Título ou autor ausente na página de título.' },
  FMT112: { severity: 'warning', message: 'Espaços duplos, tabs ou espaços nas pontas.' },
  FMT113: { severity: 'warning', message: 'Caixa mista em elemento que deve ser maiúsculo.' },
  FMT114: { severity: 'info', message: 'Aspas tipográficas no diálogo.' },
  FMT115: { severity: 'warning', message: 'Cena sem cabeçalho depois de uma transição.' },
  FMT116: { severity: 'warning', message: 'Cabeçalho de cena termina com ponto.' },
  FMT117: { severity: 'warning', message: 'Parêntese sem parênteses ou terminado em ponto.' },
  FMT118: { severity: 'warning', message: 'Personagem termina com ponto ou dois-pontos.' },
  FMT119: { severity: 'warning', message: 'Transição sem dois-pontos.' },
  FMT120: { severity: 'warning', message: 'Diálogo inteiro entre aspas.' },
  FMT121: {
    severity: 'warning',
    message: 'Primeira aparição de personagem na ação deve estar em maiúsculas.',
  },
};

const WE_SEE = /\b(we (see|hear)|nós (vemos|ouvimos))\b/i;
const CAMERA =
  /\b(close[- ]?up|close on|close no|angle on|wide shot|pan (to|left|right)|zoom (in|out)|tilt (up|down)|(the )?camera|a câmera|panorâmica)\b/i;
const CURLY_QUOTES = /[“”‘’]/;
const QUOTED = /^\s*["“«].*["”»]\s*$/s;

const SPEECH_AFTER_CHARACTER: ReadonlySet<ElementType> = new Set(['parenthetical', 'dialogue']);
const SPEECH_TYPES: ReadonlySet<ElementType> = new Set(['character', 'parenthetical', 'dialogue']);

/**
 * Validates the block list against the format rules. Pure and deterministic: the same blocks
 * and options always produce the same issues, in block order.
 * FMT001, FMT002, FMT009 and FMT010 concern export and fonts and are not checked here.
 */
export function validateBlocks(blocks: readonly Block[], options: ValidateOptions = {}): Issue[] {
  const spec = (options.profile ?? 'spec') === 'spec';
  const issues: Issue[] = [];
  const add = (code: IssueCode, blockIndex: number) => {
    const { severity, message } = MESSAGES[code];
    issues.push({ code, severity, blockIndex, message });
  };

  blocks.forEach((block, i) => {
    const { type, text } = block;
    const next = blocks[i + 1];
    const prev = blocks[i - 1];
    const empty = isBlank(text);
    const box = ELEMENT_BOX[type];

    if (!empty && /\t| {2,}|^\s|\s$/.test(text)) add('FMT112', i);
    if (!empty && UPPERCASE_ELEMENTS.has(type) && text !== text.toUpperCase()) add('FMT113', i);
    if (!empty && text.split(/\s+/).some((w) => w.length > box.width)) add('FMT003', i);

    switch (type) {
      case 'scene-heading': {
        if (empty) {
          add('FMT006', i);
          break;
        }
        if (isClosingBlock(blocks, i)) break;
        const h = parseSceneHeading(text);
        if (text.trim().length > GRID.columns) add('FMT101', i);
        if (h.prefix === null) add('FMT103', i);
        if (h.time === null) add('FMT102', i);
        if (h.endsWithPeriod) add('FMT116', i);
        break;
      }
      case 'action': {
        if (wrap(text, box.width).length > MAX_ACTION_PARAGRAPH_LINES) add('FMT106', i);
        if (WE_SEE.test(text)) add('FMT108', i);
        if (spec && CAMERA.test(text)) add('FMT109', i);
        break;
      }
      case 'shot': {
        if (spec) add('FMT109', i);
        break;
      }
      case 'character': {
        if (empty) {
          add('FMT007', i);
          break;
        }
        if (text.trim().length > MAX_CHARACTER_CUE_LENGTH) add('FMT104', i);
        if (/[.:]$/.test(text.trim())) add('FMT118', i);
        if (next === undefined || !SPEECH_AFTER_CHARACTER.has(next.type)) add('FMT004', i);
        break;
      }
      case 'parenthetical': {
        if (prev === undefined || !(prev.type === 'character' || prev.type === 'dialogue')) {
          add('FMT008', i);
        }
        if (text.trim().length > MAX_PARENTHETICAL_LENGTH) add('FMT105', i);
        if (!/^\(.*\)$/.test(text.trim()) || /\.\)$/.test(text.trim())) add('FMT117', i);
        if (next === undefined || next.type !== 'dialogue') add('FMT005', i);
        break;
      }
      case 'dialogue': {
        if (prev === undefined || !SPEECH_TYPES.has(prev.type)) add('FMT008', i);
        if (wrap(text, box.width).length > MAX_DIALOGUE_LINES) add('FMT107', i);
        if (CURLY_QUOTES.test(text)) add('FMT114', i);
        if (QUOTED.test(text)) add('FMT120', i);
        break;
      }
      case 'transition': {
        if (
          !empty &&
          classifyTransition(text) === null &&
          !text.trim().endsWith(':') &&
          !isClosingBlock(blocks, i)
        ) {
          add('FMT119', i);
        }
        if (next !== undefined && next.type !== 'scene-heading') add('FMT115', i);
        break;
      }
    }
  });

  checkFirstAppearances(blocks, add);
  return issues.sort((a, b) => a.blockIndex - b.blockIndex);
}

/** FMT121: a character's first mention in action must be in upper case (elementos 3.4). */
function checkFirstAppearances(
  blocks: readonly Block[],
  add: (code: IssueCode, blockIndex: number) => void,
): void {
  const names = new Set<string>();
  for (const b of blocks) if (b.type === 'character') names.add(characterKey(b.text));
  names.delete('');
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu');
    for (const [i, b] of blocks.entries()) {
      if (b.type !== 'action') continue;
      const m = re.exec(b.text);
      if (m === null) continue;
      if (m[0] !== name) add('FMT121', i);
      break;
    }
  }
}

/** Export is blocked only by errors (FR-EDT-021). */
export function hasBlockingIssues(issues: readonly Issue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
