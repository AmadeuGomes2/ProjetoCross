import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'RDO digital',
  description: 'Relatório Diário de Obras',
};

/**
 * Lançamento é desenhado primeiro para celular. Ver CLAUDE.md, seção Mobile.
 *
 * `viewportFit: 'cover'` mais o `env(safe-area-inset-*)` das folhas de estilo
 * mantêm a barra de ações do lançamento acima do indicador de gesto do iPhone.
 * Sem isso o botão de enviar fica meio escondido justamente no aparelho em que
 * o encarregado mais usa o sistema.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef1f4' },
    { media: '(prefers-color-scheme: dark)', color: '#10151b' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
