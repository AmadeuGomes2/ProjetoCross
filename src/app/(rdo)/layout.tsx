import type { ReactNode } from 'react';

import { BarraSuperior } from '../_componentes/casca';

/**
 * Moldura das telas de RDO.
 *
 * A barra some na impressão por CSS (`@media print`), e não por condição em
 * JavaScript: o RDO é documento contratual, e quem manda para a impressora com
 * Ctrl+P tem que receber o documento, não a captura do sistema.
 */
export default function LayoutDeRdo({ children }: { children: ReactNode }) {
  return (
    <>
      <BarraSuperior />
      {children}
    </>
  );
}
