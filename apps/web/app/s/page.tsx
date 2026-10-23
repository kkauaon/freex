'use client';

import { useEffect, useState } from 'react';
import { docIdOf, tokenFromHash } from '../collab/token';
import ScriptApp, { type ShareTarget } from '../script-app';

/**
 * `/s#<token>`: the secret is in the fragment, which the browser never sends to any server, so
 * it does not reach logs or other sites through the Referer.
 */
export default function SharedScript() {
  const [target, setTarget] = useState<ShareTarget | 'invalid' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      const token = tokenFromHash(window.location.hash);
      if (!token) return setTarget('invalid');
      const docId = await docIdOf(token);
      if (!cancelled) setTarget({ token, docId });
    };
    void read();
    window.addEventListener('hashchange', read);
    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', read);
    };
  }, []);

  if (target === null) return <p className="loading">Abrindo o roteiro…</p>;
  if (target === 'invalid') {
    return (
      <main className="denied">
        <h1>Link inválido</h1>
        <p>Este endereço não tem a chave de um roteiro. Confira se o link foi copiado por inteiro.</p>
        <a className="btn primary" href="/">
          Ir para os recentes
        </a>
      </main>
    );
  }
  return <ScriptApp key={target.docId} share={target} />;
}
