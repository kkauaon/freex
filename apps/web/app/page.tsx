'use client';

import { useEffect, useState } from 'react';
import { timeAgo } from './collab/people';
import { DRAFT_KEY, parseDraft } from './draft';
import { type HomeItem, type Recents, EMPTY_RECENTS, changeRecents, forgetShared, homeItems, readRecents } from './recents';

function Icon({ kind }: { kind: HomeItem['kind'] }) {
  return kind === 'shared' ? (
    <svg className="home-icon shared" viewBox="0 0 24 24" role="img" aria-label="Roteiro compartilhado" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 20c.4-3.4 3-5.4 6.2-5.4s5.8 2 6.2 5.4" />
      <circle cx="17.2" cy="9.2" r="2.4" />
      <path d="M17.6 14.2c2.2.2 3.6 1.8 3.8 4.2" />
    </svg>
  ) : (
    <svg className="home-icon" viewBox="0 0 24 24" role="img" aria-label="Rascunho neste navegador" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

/** `/`: the scripts opened lately in this browser, the local draft among them. */
export default function Home() {
  const [recents, setRecents] = useState<Recents>(EMPTY_RECENTS);
  const [draft, setDraft] = useState<{ title: string; savedAt?: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRecents(readRecents());
    try {
      const d = parseDraft(window.localStorage.getItem(DRAFT_KEY));
      if (d) setDraft({ title: d.cover.title.trim(), ...(d.savedAt !== undefined && { savedAt: d.savedAt }) });
    } catch {
      // storage blocked: the draft opens as a new script
    }
    setNow(Date.now());
    setReady(true);
  }, []);

  const forget = (docId: string) => {
    changeRecents((r) => forgetShared(r, docId));
    setRecents(readRecents());
  };

  const items = homeItems(recents, draft);

  return (
    <main className="home">
      <header className="home-head">
        <span className="brand">FREEX</span>
      </header>
      <h1>Recentes</h1>
      {!ready ? (
        <p className="loading">Carregando…</p>
      ) : (
        <ul className="home-list">
          {items.map((item) => {
            const href = item.kind === 'draft' ? '/draft' : `/s#${item.token}`;
            const title = item.title || (item.kind === 'draft' ? (item.saved ? 'Sem título' : 'Novo roteiro') : 'Sem título');
            const sub =
              item.kind === 'draft'
                ? `Rascunho neste navegador${item.at > 0 ? ` · ${timeAgo(item.at, now)}` : ''}`
                : `Compartilhado · aberto ${timeAgo(item.at, now)}`;
            return (
              <li key={item.kind === 'draft' ? 'draft' : item.docId} className="home-item">
                <a className="home-link" href={href}>
                  <Icon kind={item.kind} />
                  <span className="home-text">
                    <strong>{title}</strong>
                    <span>{sub}</span>
                  </span>
                </a>
                {item.kind === 'shared' && (
                  <button type="button" className="btn" onClick={() => forget(item.docId)} aria-label={`Tirar “${title}” da lista`}>
                    Tirar da lista
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="home-note">
        A lista fica só neste navegador. Tirar um roteiro compartilhado dela não o apaga: quem tem o link continua editando.
      </p>
    </main>
  );
}
