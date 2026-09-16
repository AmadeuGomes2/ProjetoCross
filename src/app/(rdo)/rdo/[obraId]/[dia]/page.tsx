/**
 * Página do RDO diário: `/rdo/<obra>/<AAAA-MM-DD>`.
 *
 * Página fina, como manda `padroes-codigo`: ela lê os parâmetros, chama o caso
 * de uso e renderiza. Toda regra — número do RDO, efetivo, acumulado, resumo do
 * dia, transbordo — está no módulo `rdo`, que é testado sem banco e sem tela.
 *
 * A data vem da URL e é entrada hostil como qualquer outra: quem a valida é
 * `interpretaPedidoDeRdo`, dentro do caso de uso. `31/09/2026` não passa daqui.
 *
 * Erro nunca vira rastro de pilha na tela: a mensagem diz o que houve e, quando
 * é falha inesperada, traz o identificador de correlação para o suporte.
 */

import type { ReactElement } from 'react';

import { consultaRdoDaObra } from '../../../../_composicao/rdo-diario';
import { RdoDiarioNaTela } from '../../../_componentes/rdo-diario-na-tela';
import estilos from '../../../_componentes/rdo.module.css';

export default async function PaginaDoRdoDiario({
  params,
}: {
  params: Promise<{ obraId: string; dia: string }>;
}): Promise<ReactElement> {
  const { obraId, dia } = await params;
  const resultado = await consultaRdoDaObra({ obraId, dia });

  if (!resultado.ok) {
    return (
      <main className={estilos.pagina}>
        <p className={estilos.erro}>{resultado.erro.mensagem}</p>
      </main>
    );
  }

  return <RdoDiarioNaTela rdo={resultado.valor} />;
}
