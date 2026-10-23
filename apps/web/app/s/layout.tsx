import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// a shared script is private to whoever has the link: no indexing, and no Referer to other sites
export const metadata: Metadata = {
  title: 'Roteiro compartilhado · FREEX',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function SharedLayout({ children }: { children: ReactNode }) {
  return children;
}
