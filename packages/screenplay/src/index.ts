export * from './constants';

export interface Block {
  readonly type: import('./constants').ElementType;
  readonly text: string;
}
