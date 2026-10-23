import { layoutHash, layoutTitlePage, paginate, type Page } from '@freex/layout';
import {
  checkTitlePage,
  countText,
  hasBlockingIssues,
  parseFountain,
  validateBlocks,
  type Block,
  type ElementType,
  type FountainIssue,
  type TitlePage,
} from '@freex/screenplay';

export interface PanelItem {
  readonly id: string;
  /** `FMT…` code. */
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  /** Index of the block in the script, or null when the item is about the whole script. */
  readonly blockIndex: number | null;
  readonly message: string;
}

export interface Analysis {
  readonly blocks: Block[];
  readonly titlePage: TitlePage | null;
  readonly pages: Page[];
  /** Pages of the script, title page excluded (FR-EDT-013). */
  readonly scriptPages: number;
  readonly items: PanelItem[];
  /** Syntax a Fountain import could not keep; empty unless the blocks came from `analyze`. */
  readonly importIssues: FountainIssue[];
  readonly errors: number;
  readonly warnings: number;
  /** Errors block the export; warnings only ask for confirmation (FR-EDT-021). */
  readonly blocking: boolean;
  readonly words: number;
  readonly characters: number;
  readonly hash: string;
}

export const ELEMENT_LABEL: Readonly<Record<ElementType, string>> = {
  'scene-heading': 'Cena',
  action: 'Ação',
  character: 'Personagem',
  parenthetical: 'Parêntese',
  dialogue: 'Diálogo',
  transition: 'Transição',
  shot: 'Plano',
};

/**
 * Everything the editor shows is derived from the blocks with the shared engine: the same
 * validator and paginator the API and the PDF use.
 */
export function analyzeBlocks(
  blocks: Block[],
  titlePage: TitlePage | null,
  importIssues: FountainIssue[] = [],
  /** The paginated script, when the editor already computed it: it is not paginated twice. */
  scriptPages?: readonly Page[],
): Analysis {
  const issues = validateBlocks(blocks);
  const items: PanelItem[] = issues.map((issue, i) => ({
    id: `${issue.code}-${i}`,
    code: issue.code,
    severity: issue.severity,
    blockIndex: issue.blockIndex,
    message: issue.message,
  }));
  if (titlePage) {
    const missing = checkTitlePage(titlePage);
    if (missing) {
      items.push({
        id: 'FMT111',
        code: missing.code,
        severity: missing.severity,
        blockIndex: null,
        message: missing.message,
      });
    }
  }
  items.sort((a, b) => (a.blockIndex ?? Infinity) - (b.blockIndex ?? Infinity));

  const pages: Page[] = [
    ...(titlePage ? [layoutTitlePage(titlePage)] : []),
    ...(scriptPages ?? paginate(blocks)),
  ];
  const counts = countText(blocks);
  return {
    blocks,
    titlePage,
    pages,
    scriptPages: pages.filter((p) => p.kind === 'script').length,
    items,
    importIssues,
    errors: items.filter((i) => i.severity === 'error').length,
    warnings: items.filter((i) => i.severity === 'warning').length,
    blocking: hasBlockingIssues(issues),
    words: counts.words,
    characters: counts.characters,
    hash: layoutHash(pages),
  };
}

/** Reads Fountain text and analyses it; used by the import and by tests. */
export function analyze(src: string): Analysis {
  const doc = parseFountain(src);
  return analyzeBlocks(doc.blocks, doc.titlePage, doc.issues);
}

/** Body of `POST /v1/export/pdf` (same shape as the layout request). */
export function exportRequest(a: Analysis) {
  return {
    blocks: a.blocks,
    ...(a.titlePage && { titlePage: a.titlePage }),
  };
}

// ---------------------------------------------------------------- cover

/** The title page as the form edits it: plain strings, one author or contact datum per line. */
export interface CoverForm {
  readonly title: string;
  readonly credit: string;
  readonly authors: string;
  readonly source: string;
  readonly contact: string;
  readonly date: string;
}

export const EMPTY_COVER: CoverForm = {
  title: '',
  credit: '',
  authors: '',
  source: '',
  contact: '',
  date: '',
};

const lines = (s: string) =>
  s
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');

/** Null when every field is empty, so a script without a cover has no title page. */
export function toTitlePage(form: CoverForm): TitlePage | null {
  if (Object.values(form).every((v) => v.trim() === '')) return null;
  const credit = form.credit.trim();
  const source = form.source.trim();
  const contact = lines(form.contact).join('\n');
  const date = form.date.trim();
  return {
    title: form.title.trim(),
    authors: lines(form.authors),
    ...(credit && { credit }),
    ...(source && { source }),
    ...(contact && { contact }),
    ...(date && { date }),
  };
}

export function toCoverForm(page: TitlePage | null): CoverForm {
  if (!page) return EMPTY_COVER;
  return {
    title: page.title,
    credit: page.credit ?? '',
    authors: page.authors.join('\n'),
    source: page.source ?? '',
    contact: page.contact ?? '',
    date: page.date ?? '',
  };
}

// ---------------------------------------------------------------- sample

export const SAMPLE = `Title: Casa Vazia
Credit: Written by
Author: Ana Souza
Draft date: 2026-10-23
Contact: ana@exemplo.com

INT. APARTAMENTO DE ANA - NOITE

ANA (30s), de moletom, encara uma *caixa* aberta. A mão para no ar.

ANA
(baixo)
Eu não estou esperando.

JOÃO (30s), na porta, segura as chaves.

JOÃO
Eu volto amanhã.

> FADE OUT.
`;
