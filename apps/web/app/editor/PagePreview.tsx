'use client';

import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Line, Page } from '@freex/layout';
import { CPI, LPI, PAGE } from '@freex/screenplay';

// 96 CSS px per inch: Courier Prime 12 pt is 16 px, so a column is 9.6 px and a row is 16 px.
const PX_PER_IN = 96;
const SHEET_W = PAGE.widthIn * PX_PER_IN;
// measuring before the first paint avoids a flash of sheets at the wrong size
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const SHEET_H = PAGE.heightIn * PX_PER_IN;

function runs(line: Line) {
  const marks = line.marks ?? [];
  if (marks.length === 0) return line.text;
  const cuts = new Set([0, line.text.length]);
  for (const m of marks) {
    cuts.add(m.from);
    cuts.add(m.to);
  }
  const points = [...cuts].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i] ?? 0;
    const to = points[i + 1] ?? from;
    if (to <= from) continue;
    const on = (t: string) => marks.some((m) => m.type === t && m.from <= from && to <= m.to);
    const style = {
      fontWeight: on('bold') ? 700 : undefined,
      fontStyle: on('italic') ? 'italic' : undefined,
      textDecoration: on('underline') ? 'underline' : undefined,
    };
    out.push(
      <span key={from} style={style}>
        {line.text.slice(from, to)}
      </span>,
    );
  }
  return out;
}

function label(p: Page): string {
  return p.kind === 'title' ? 'Página de título' : `Página ${p.number}`;
}

interface SheetProps {
  page: Page;
  scale: number;
  /** Cheap identity of the page content, so unchanged pages do not render again. */
  signature: string;
}

const Sheet = memo(
  function Sheet({ page, scale }: SheetProps) {
    return (
      <figure
        className="sheet"
        aria-label={label(page)}
        style={{ width: SHEET_W * scale, height: SHEET_H * scale }}
      >
        <div className="sheet-paper" style={{ transform: `scale(${scale})` }}>
          {page.printedNumber !== null && (
            <div
              className="sheet-line sheet-number"
              style={{ top: 0.5 * PX_PER_IN, right: PAGE.marginRightIn * PX_PER_IN }}
            >
              {page.printedNumber}.
            </div>
          )}
          {page.lines.map((l, i) =>
            l.text === '' ? null : (
              <div
                key={i}
                className="sheet-line"
                style={{
                  top: (PAGE.marginTopIn + l.row / LPI) * PX_PER_IN,
                  left: (PAGE.marginLeftIn + l.col / CPI) * PX_PER_IN,
                }}
              >
                {runs(l)}
              </div>
            ),
          )}
        </div>
      </figure>
    );
  },
  (a, b) => a.signature === b.signature && a.scale === b.scale,
);

/**
 * The pages exactly as the PDF draws them: the same rows and columns, Courier Prime 12 pt,
 * scaled to the width available. Nothing is reflowed.
 */
export function PagePreview({ pages }: { pages: readonly Page[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useBeforePaint(() => {
    const el = box.current;
    if (!el) return;
    // the box has 16 px of padding on each side
    const fit = () => setScale(Math.max(0.3, Math.min(1.1, (el.clientWidth - 32) / SHEET_W)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const signatures = useMemo(
    () => pages.map((p) => `${p.kind}|${p.printedNumber}|${JSON.stringify(p.lines)}`),
    [pages],
  );

  return (
    <div ref={box} className="sheets">
      {scale !== null && pages.map((p, i) => (
        <Sheet
          key={`${p.kind}-${p.number}`}
          page={p}
          scale={scale}
          signature={signatures[i] ?? ''}
        />
      ))}
    </div>
  );
}
