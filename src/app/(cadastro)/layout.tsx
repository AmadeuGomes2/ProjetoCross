import type { ReactNode } from 'react';

import { BarraSuperior } from '../_componentes/casca';
import { atorDaRequisicao } from './sessao';

/**
 * Moldura das telas de cadastro.
 *
 * A barra entra aqui, e não em cada página, para que seja de fato persistente:
 * ela não repinta na navegação entre telas do grupo, e nenhuma página nova
 * pode esquecer de incluí-la.
 *
 * O grupo tem tela pública — `/entrar` e `/convite/[token]` — e por isso a
 * barra pergunta se há sessão antes de oferecer "Sair". Oferecer saída a quem
 * não entrou é ruído, e apertar dá erro.
 */
export default async function LayoutDeCadastro({ children }: { children: ReactNode }) {
  const ator = await atorDaRequisicao();
  return (
    <>
      <BarraSuperior autenticado={ator !== null} />
      {children}
    </>
  );
}
