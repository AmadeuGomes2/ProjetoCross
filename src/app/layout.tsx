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

/**
 * `suppressHydrationWarning` em `<html>` e `<body>`, e em nenhum outro lugar.
 *
 * Extensão de navegador escreve atributo nesses dois elementos antes de o React
 * hidratar — em 17/09/2026 foi `data-xt-extension-active` em `<html>`. O React
 * compara o DOM com o que veio do servidor, vê um atributo que o servidor não
 * mandou e reclama. Não é defeito do sistema: quem não tem a extensão não vê o
 * erro, e a página funciona nos dois casos.
 *
 * É seguro **aqui e só aqui** porque a marca vale para o próprio elemento, não
 * para a árvore abaixo dele (`next/dist/docs/01-app/02-guides/`,
 * "Understanding suppressHydrationWarning"): divergência dentro das telas
 * continua aparecendo. E porque estes dois elementos não recebem nenhum
 * atributo calculado pela aplicação — não há nada nosso para a marca esconder.
 *
 * Se aparecer vontade de repetir isto num componente de tela, pare: lá a marca
 * esconde defeito de verdade.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
