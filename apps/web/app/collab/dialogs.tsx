'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PARTICIPANT_NAME_MAX, sanitizeParticipantName } from '@freex/contracts';
import { initials, timeAgo, type Contributor, type Person } from './people';

/** Asks for the name that everyone else will see. Without it nobody can edit a shared script. */
export function NameDialog({
  initial,
  required,
  onSubmit,
  onCancel,
}: {
  initial: string;
  /** The first time: there is no way out but giving a name. */
  required: boolean;
  onSubmit(name: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(initial);
  const clean = sanitizeParticipantName(value);

  useEffect(() => {
    if (required) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [required, onCancel]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (clean !== '') onSubmit(clean);
  };

  return (
    <div className="modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="name-title" className="modal">
        <h2 id="name-title">{required ? 'Como você se chama?' : 'Trocar meu nome'}</h2>
        <p className="modal-note">
          Quem está no roteiro vê este nome junto do seu cursor e na lista de quem editou.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="name-input">Seu nome</label>
            <input
              id="name-input"
              value={value}
              maxLength={PARTICIPANT_NAME_MAX}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="nickname"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              aria-describedby="name-help"
            />
            <small id="name-help">Até {PARTICIPANT_NAME_MAX} caracteres, por exemplo: Ana.</small>
          </div>
          <div className="modal-actions">
            {!required && (
              <button type="button" className="btn" onClick={onCancel}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn primary" disabled={clean === ''}>
              {required ? 'Entrar no roteiro' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** The link of a shared script, with what it means to have it. */
export function ShareDialog({ link, onClose }: { link: string; onClose(): void }) {
  const input = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // clipboard blocked: select the text so Ctrl+C works
      input.current?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="modal">
        <h2 id="share-title">Compartilhar o roteiro</h2>
        <p className="modal-note">
          <strong>Qualquer pessoa com este link pode ver e editar o roteiro.</strong> Cada pessoa informa um
          nome ao entrar, para os outros saberem quem está escrevendo.
        </p>
        <div className="field">
          <label htmlFor="share-link">Link para editar</label>
          <input
            id="share-link"
            ref={input}
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
        <p className="modal-note small">
          Guarde o link como uma senha: ele é a única chave do roteiro e ainda não dá para desativá-lo.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn primary" onClick={copy}>
            {copied ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
        <p className="sr-only" role="status">
          {copied ? 'Link copiado para a área de transferência' : ''}
        </p>
      </div>
    </div>
  );
}

/** Who is here now and who edited the script. */
export function PeoplePanel({
  people,
  contributors,
  now,
  myName,
  onChangeName,
}: {
  people: readonly Person[];
  contributors: readonly Contributor[];
  now: number;
  myName: string;
  onChangeName(): void;
}) {
  return (
    <>
      <h2>Pessoas</h2>
      <h3 className="panel-sub">No roteiro agora</h3>
      {people.length === 0 ? (
        <p className="panel-note">Ninguém com nome no momento.</p>
      ) : (
        <ul className="people-list" aria-label="Pessoas no roteiro agora">
          {people.map((p) => (
            <li key={p.name}>
              <span className="avatar" style={{ background: p.color }} aria-hidden="true">
                {initials(p.name)}
              </span>
              <span className="person-name">
                {p.name}
                {p.self && <em> (você)</em>}
              </span>
              {p.tabs > 1 && <span className="person-tabs">{p.tabs} abas</span>}
            </li>
          ))}
        </ul>
      )}

      <h3 className="panel-sub">Quem editou</h3>
      {contributors.length === 0 ? (
        <p className="panel-note">Ainda ninguém editou este roteiro.</p>
      ) : (
        <ul className="people-list" aria-label="Quem editou o roteiro">
          {contributors.map((c) => (
            <li key={c.name}>
              <span className="person-name">
                {c.name}
                {c.name === myName && <em> (você)</em>}
              </span>
              <span className="person-tabs">editou {timeAgo(c.at, now)}</span>
            </li>
          ))}
        </ul>
      )}

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn small" onClick={onChangeName}>
          Trocar meu nome
        </button>
      </div>
    </>
  );
}
