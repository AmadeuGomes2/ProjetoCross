import type { ReactNode } from 'react';

import estilos from './estilos.module.css';

/**
 * Moldura das telas de lançamento.
 *
 * Coluna única, largura de leitura, e espaço no rodapé para o polegar. Toda
 * tela daqui é desenhada primeiro para celular em pé (CLAUDE.md, Mobile);
 * desktop é o caso fácil que sai de graça.
 */
export default function LayoutDeLancamento({ children }: { children: ReactNode }) {
  return <div className={estilos.tela}>{children}</div>;
}
