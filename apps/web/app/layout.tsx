import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import './globals.css';

// Courier Prime is the font of the script: the editor, the preview and the PDF use the same
// files, so a column is 0.6 em wide everywhere.
const script = localFont({
  src: [
    { path: './fonts/CourierPrime-Regular.ttf', weight: '400', style: 'normal' },
    { path: './fonts/CourierPrime-Italic.ttf', weight: '400', style: 'italic' },
    { path: './fonts/CourierPrime-Bold.ttf', weight: '700', style: 'normal' },
    { path: './fonts/CourierPrime-BoldItalic.ttf', weight: '700', style: 'italic' },
  ],
  variable: '--font-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FREEX',
  description: 'Editor de roteiros gratuito, no formato padrão da indústria.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={script.variable}>
      <body>{children}</body>
    </html>
  );
}
