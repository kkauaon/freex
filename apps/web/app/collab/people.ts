import type * as Y from 'yjs';
import { sanitizeParticipantName } from '@freex/contracts';

/** Fixed palette; every colour keeps white text at 4.5:1 or better (cursor labels are white on it). */
export const PALETTE = [
  '#1d4ed8',
  '#be185d',
  '#047857',
  '#b45309',
  '#6d28d9',
  '#0e7490',
  '#b91c1c',
  '#4d7c0f',
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

/** The same name always gets the same colour, on every device. */
export function colorFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (Math.imul(h, 31) + (ch.codePointAt(0) ?? 0)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? PALETTE[0];
}

export interface Person {
  readonly name: string;
  readonly color: string;
  /** Open tabs or devices of this person. */
  readonly tabs: number;
  readonly self: boolean;
}

/**
 * Who is in the script now, from the awareness states. States without a usable name are left
 * out, a name seen on several tabs is one person, and the colour is checked before use.
 */
export function peopleFrom(
  states: ReadonlyMap<number, Record<string, unknown>>,
  selfClientId: number,
): Person[] {
  const byName = new Map<string, { color: string; tabs: number; self: boolean }>();
  for (const [clientId, state] of states) {
    const user = state.user;
    if (typeof user !== 'object' || user === null) continue;
    const name = sanitizeParticipantName((user as Record<string, unknown>).name);
    if (name === '') continue;
    const rawColor = (user as Record<string, unknown>).color;
    const color = typeof rawColor === 'string' && HEX.test(rawColor) ? rawColor : colorFor(name);
    const found = byName.get(name);
    byName.set(name, {
      color: found?.color ?? color,
      tabs: (found?.tabs ?? 0) + 1,
      self: (found?.self ?? false) || clientId === selfClientId,
    });
  }
  return [...byName.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name, 'pt-BR'));
}

export function initials(name: string): string {
  const parts = sanitizeParticipantName(name).split(' ').filter(Boolean);
  const first = Array.from(parts[0] ?? '')[0] ?? '?';
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1] ?? '')[0] ?? '') : '';
  return (first + last).toUpperCase();
}

// ------------------------------------------------------------------ who edited

export interface Contributor {
  readonly name: string;
  /** Epoch milliseconds of the last edit. */
  readonly at: number;
}

export const MAX_CONTRIBUTORS = 200;

/** Everyone who edited the script, most recent first. Reads what any participant wrote, so cleans it. */
export function readContributors(map: Y.Map<unknown>): Contributor[] {
  const out: Contributor[] = [];
  map.forEach((value, key) => {
    const name = sanitizeParticipantName(key);
    const at = typeof value === 'object' && value !== null ? (value as Record<string, unknown>).at : undefined;
    if (name !== '' && typeof at === 'number' && Number.isFinite(at)) out.push({ name, at });
  });
  return out.sort((a, b) => b.at - a.at).slice(0, MAX_CONTRIBUTORS);
}

/** Notes that `name` edited at `now`. Does nothing for an empty name or a full list of strangers. */
export function recordEdit(map: Y.Map<unknown>, name: string, now: number): void {
  const clean = sanitizeParticipantName(name);
  if (clean === '') return;
  if (!map.has(clean) && map.size >= MAX_CONTRIBUTORS) return;
  map.set(clean, { at: now });
}

export function timeAgo(from: number, now: number): string {
  const s = Math.max(0, Math.round((now - from) / 1000));
  if (s < 45) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? 'há 1 min' : `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'há 1 h' : `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}
