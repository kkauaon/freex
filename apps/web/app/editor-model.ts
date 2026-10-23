import { layoutDocument, layoutHash, type Page } from '@freex/layout';
import {
  autoFixBlocks,
  checkTitlePage,
  countText,
  hasBlockingIssues,
  parseFountain,
  toFountain,
  validateBlocks,
  type Block,
  type TitlePage,
} from '@freex/screenplay';

export interface PanelItem {
  readonly id: string;
  /** `FMT…` code, or `IMPORT` for syntax the Fountain reader dropped. */
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  /** 0-based line of the source, or null when the item is about the whole script. */
  readonly line: number | null;
  readonly message: string;
}

export interface Analysis {
  readonly blocks: Block[];
  readonly titlePage: TitlePage | null;
  readonly pages: Page[];
  /** Pages of the script, title page excluded (FR-EDT-013). */
  readonly scriptPages: number;
  readonly items: PanelItem[];
  readonly errors: number;
  readonly warnings: number;
  /** Errors block the export; warnings only ask for confirmation (FR-EDT-021). */
  readonly blocking: boolean;
  readonly words: number;
  readonly characters: number;
  readonly hash: string;
}

/**
 * Everything the editor shows is derived from the Fountain text with the shared engine:
 * the same parser, validator and paginator the API and the PDF use.
 */
export function analyze(src: string): Analysis {
  const doc = parseFountain(src);
  const issues = validateBlocks(doc.blocks);

  const items: PanelItem[] = issues.map((issue, i) => ({
    id: `${issue.code}-${i}`,
    code: issue.code,
    severity: issue.severity,
    line: doc.lines[issue.blockIndex] ?? null,
    message: issue.message,
  }));
  for (const [i, issue] of doc.issues.entries()) {
    items.push({
      id: `IMPORT-${i}`,
      code: 'IMPORT',
      severity: issue.severity,
      line: issue.line - 1,
      message: issue.message,
    });
  }
  if (doc.titlePage) {
    const missing = checkTitlePage(doc.titlePage);
    if (missing) {
      items.push({
        id: 'FMT111',
        code: missing.code,
        severity: missing.severity,
        line: 0,
        message: missing.message,
      });
    }
  }
  items.sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity));

  const pages = layoutDocument(doc.blocks, { titlePage: doc.titlePage });
  const counts = countText(doc.blocks);
  return {
    blocks: doc.blocks,
    titlePage: doc.titlePage,
    pages,
    scriptPages: pages.filter((p) => p.kind === 'script').length,
    items,
    errors: items.filter((i) => i.severity === 'error').length,
    warnings: items.filter((i) => i.severity === 'warning').length,
    blocking: hasBlockingIssues(issues),
    words: counts.words,
    characters: counts.characters,
    hash: layoutHash(pages),
  };
}

/**
 * Applies the automatic fixes allowed by normas-de-formatacao.md 8.3 (spacing and upper
 * case) and rewrites the text as normalised Fountain. Words are never changed; comments,
 * notes and outline lines of the source are not kept.
 */
export function applyAutoFix(src: string): string {
  const doc = parseFountain(src);
  return toFountain(autoFixBlocks(doc.blocks), doc.titlePage);
}

/** Character range of a 0-based line, for selecting it in the text area. */
export function lineRange(src: string, line: number): [start: number, end: number] {
  let start = 0;
  for (let i = 0; i < line; i++) {
    const nl = src.indexOf('\n', start);
    if (nl < 0) return [src.length, src.length];
    start = nl + 1;
  }
  const nl = src.indexOf('\n', start);
  return [start, nl < 0 ? src.length : nl];
}

/** Body of `POST /v1/export/pdf` (same shape as the layout request). */
export function exportRequest(a: Analysis) {
  return {
    blocks: a.blocks,
    ...(a.titlePage && { titlePage: a.titlePage }),
  };
}

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
