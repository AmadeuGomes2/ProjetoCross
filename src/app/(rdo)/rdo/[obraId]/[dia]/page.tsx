/**
 * Página do RDO diário: `/rdo/<obra>/<AAAA-MM-DD>`.
 *
 * **Autentica e autoriza antes de qualquer leitura.** O endereço é adivinhável
 * e o documento carrega o bloco 10 (observação, texto livre onde a planilha
 * real traz nome de fiscal) e o bloco 11 (nome, titulação e CREA do
 * responsável técnico). Sem esta verificação, qualquer pessoa com o id da obra
 * lia o RDO dela — foi o CRÍTICO 1 do laudo de segurança de 16/09/2026. Não
 * existe `middleware.ts` neste projeto: cada superfície se protege sozinha.
 *
 * Página fina, como manda `padroes-codigo`: ela lê os parâmetros, chama o caso
 * de uso protegido e renderiza. Toda regra — número do RDO, efetivo, acumulado,
 * resumo do dia, transbordo — está no módulo `rdo`, testado sem banco e sem
 * tela.
 *
 * A data vem da URL e é entrada hostil como qualquer outra: quem a valida é
 * `interpretaPedidoDeRdo`, dentro do caso de uso. `31/09/2026` não passa daqui.
 *
 * Erro nunca vira rastro de pilha na tela: a mensagem diz o que houve e, quando
 * é falha inesperada, traz o identificador de correlação para o suporte.
 */

import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import {
  consultaRdoProtegida,
  eDiaInexistente,
  perfilNaObraProtegido,
} from '../../../../_composicao/rdo-diario';
import { atorDaRequisicao } from '../../../../_composicao/sessao';
import { ControleDeExportacao } from '../../../_componentes/controle-de-exportacao';
import { RdoDiarioNaTela } from '../../../_componentes/rdo-diario-na-tela';
import { idConfiavel } from '../../../../../shared/id';
import estilos from '../../../_componentes/rdo.module.css';

export const dynamic = 'force-dynamic';

export default async function PaginaDoRdoDiario({
  params,
}: {
  params: Promise<{ obraId: string; dia: string }>;
}): Promise<ReactElement> {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const { obraId, dia } = await params;
  const resultado = await consultaRdoProtegida(ator, { obraId, dia });

  if (!resultado.ok) {
    // Decisão 36.1: o endereço que nomeia um dia inexistente responde **404**,
    // e não 200 com um parágrafo de erro. `notFound()` interrompe aqui e
    // renderiza `not-found.tsx` deste segmento, que repete a mesma frase.
    if (eDiaInexistente(resultado.erro)) notFound();

    return (
      <main className={estilos.pagina}>
        <p className={estilos.erro}>{resultado.erro.mensagem}</p>
      </main>
    );
  }

  // Decisão 27.1: o encarregado não vê o controle de exportação. A recusa do
  // servidor continua onde estava, na rota e no módulo `export`; o que muda é
  // a tela deixar de oferecer o que ia terminar em 403.
  return (
    <>
      <RdoDiarioNaTela rdo={resultado.valor} />
      <ControleDeExportacao
        perfil={perfilNaObraProtegido(ator, obraId)}
        obraId={idConfiavel<'obra'>(obraId)}
        dia={dia}
      />
    </>
  );
}
