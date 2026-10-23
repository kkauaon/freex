import { sanitizeParticipantName } from '@freex/contracts';

const HEX = /^#[0-9a-f]{6}$/i;
const FALLBACK = '#6b7280';

interface RemoteUser {
  readonly name?: unknown;
  readonly color?: unknown;
}

/** A colour that is safe to put in a style: only `#rrggbb` gets through. */
function safeColor(color: unknown): string {
  return typeof color === 'string' && HEX.test(color) ? color : FALLBACK;
}

/** The caret of another person, with their name. Everything they sent is cleaned first. */
export function cursorBuilder(user: RemoteUser): HTMLElement {
  const cursor = document.createElement('span');
  cursor.className = 'remote-cursor';
  cursor.style.setProperty('--cursor', safeColor(user.color));
  const label = document.createElement('span');
  label.className = 'remote-cursor-label';
  label.textContent = sanitizeParticipantName(user.name);
  cursor.append(label);
  return cursor;
}

/** The text another person has selected. */
export function selectionBuilder(user: RemoteUser): { class: string; style: string } {
  return { class: 'remote-selection', style: `background-color: ${safeColor(user.color)}33` };
}

/**
 * Only people who gave a name are shown, and never yourself. The plugin hands over the whole
 * awareness state of the other person (`{ user, cursor }`), not just `user`.
 */
export function awarenessStateFilter(
  currentClientId: number,
  userClientId: number,
  state: { user?: RemoteUser } | null | undefined,
): boolean {
  return currentClientId !== userClientId && sanitizeParticipantName(state?.user?.name) !== '';
}
