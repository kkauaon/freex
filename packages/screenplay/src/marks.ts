import type { Mark, MarkType } from './block';

const ORDER: Record<MarkType, number> = { bold: 0, italic: 1, underline: 2 };

/** Clamps to the text, drops empty ranges and merges overlapping or touching ranges of a type. */
export function normalizeMarks(marks: readonly Mark[] | undefined, length: number): Mark[] {
  if (!marks) return [];
  const sorted = marks
    .map((m) => ({ type: m.type, from: Math.max(0, m.from), to: Math.min(length, m.to) }))
    .filter((m) => m.to > m.from)
    .sort((a, b) => ORDER[a.type] - ORDER[b.type] || a.from - b.from || a.to - b.to);
  const out: Mark[] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && last.type === m.type && m.from <= last.to) {
      out[out.length - 1] = { type: last.type, from: last.from, to: Math.max(last.to, m.to) };
    } else {
      out.push(m);
    }
  }
  return out;
}

/**
 * Re-targets marks after a text transform. `map[i]` is the source offset of output char `i`.
 * A mark keeps the output chars whose source offset was inside it.
 */
export function remapMarks(marks: readonly Mark[] | undefined, map: readonly number[]): Mark[] {
  if (!marks) return [];
  const toOut = (p: number) => {
    let lo = 0;
    let hi = map.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((map[mid] ?? 0) >= p) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
  return normalizeMarks(
    marks.map((m) => ({ type: m.type, from: toOut(m.from), to: toOut(m.to) })),
    map.length,
  );
}

export function sameMarks(a: readonly Mark[] | undefined, b: readonly Mark[] | undefined): boolean {
  const x = a ?? [];
  const y = b ?? [];
  return x.length === y.length && x.every((m, i) => m.type === y[i]?.type && m.from === y[i]?.from && m.to === y[i]?.to);
}
