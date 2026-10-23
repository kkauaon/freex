import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DOC_ID_PATTERN } from './tokens';

/** Where the state of each shared script lives. Postgres replaces this when the database exists. */
export interface ShareStore {
  exists(docId: string): Promise<boolean>;
  load(docId: string): Promise<Uint8Array | null>;
  save(docId: string, state: Uint8Array): Promise<void>;
  /** When the document was last saved (epoch ms), or null if it does not exist. */
  modifiedAt(docId: string): Promise<number | null>;
}

function assertDocId(docId: string): void {
  // the id becomes a file name: only 64 hex characters can ever reach the file system
  if (!DOC_ID_PATTERN.test(docId)) throw new Error('invalid document id');
}

export class FileShareStore implements ShareStore {
  /** Saves of one document run one after the other: the last one wins and none collides. */
  private readonly saving = new Map<string, Promise<void>>();

  constructor(private readonly dir: string) {}

  private file(docId: string): string {
    assertDocId(docId);
    return join(this.dir, `${docId}.ydoc`);
  }

  async exists(docId: string): Promise<boolean> {
    try {
      return (await stat(this.file(docId))).isFile();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
      throw error;
    }
  }

  async modifiedAt(docId: string): Promise<number | null> {
    try {
      return Math.round((await stat(this.file(docId))).mtimeMs);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  async load(docId: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.file(docId)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw error;
    }
  }

  /** Writes to a temporary file and renames it, so a crash never leaves half a document. */
  async save(docId: string, state: Uint8Array): Promise<void> {
    const file = this.file(docId);
    const previous = this.saving.get(docId) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(async () => {
        await mkdir(this.dir, { recursive: true });
        const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(tmp, state);
        await rename(tmp, file);
      });
    this.saving.set(docId, run);
    return run.finally(() => {
      if (this.saving.get(docId) === run) this.saving.delete(docId);
    });
  }
}
