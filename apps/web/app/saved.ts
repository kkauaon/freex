const pad = (n: number) => String(n).padStart(2, '0');

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * When something was saved, in the reader's time zone: "às 14:32" today, "ontem às 14:32",
 * "em 22/10 às 14:32" earlier this year, and the year when it is an older one.
 */
export function formatSavedAt(at: number, now: number): string {
  const d = new Date(at);
  const n = new Date(now);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // a clock that is a little ahead still says "today"
  if (at >= now || sameDay(d, n)) return `às ${time}`;
  if (sameDay(d, new Date(n.getFullYear(), n.getMonth(), n.getDate() - 1))) return `ontem às ${time}`;
  const day = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  return d.getFullYear() === n.getFullYear() ? `em ${day} às ${time}` : `em ${day}/${d.getFullYear()} às ${time}`;
}

/** The sentence of the status bar. `where` says what kind of save it was. */
export function savedLabel(at: number | null, now: number, where: 'server' | 'browser'): string {
  if (at === null) return '';
  const base = `Última modificação salva ${formatSavedAt(at, now)}`;
  return where === 'browser' ? `${base} (neste navegador)` : base;
}
