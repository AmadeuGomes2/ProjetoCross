/**
 * `POST /rdo/<obra>/periodo` — o RDO de um conjunto de dias.
 *
 * **POST, e não GET.** O conjunto vai no corpo porque uma lista de 30 datas
 * numa URL entra em log de servidor, em histórico de navegador e em `referrer`,
 * e o que se exporta de uma obra é informação sobre ela. O efeito colateral
 * também é real: a exportação **grava trilha** (R20), e método idempotente que
 * escreve é convite a proxy e a pré-carregamento repetirem o registro.
 *
 * Rota é borda: autoriza e delega. Perfil mínimo `engenheiro` — só ele exporta
 * (R19) —, e o módulo verifica de novo, de propósito: esconder o botão não é
 * controle de acesso, e uma rota nova pode esquecer a primeira camada.
 */

import { comAtorNaObra } from '../../../../../modules/acesso';
import { ambienteDaComposicao } from '../../../../_composicao/ambiente';
import { paraAcesso } from '../../../../_composicao/ambiente-de-cadastro';
import { respondeComOPeriodoExportado } from '../../../../_composicao/exportacao-de-periodo';
import { atorDaRota } from '../../../../_composicao/sessao';

export const dynamic = 'force-dynamic';

export const POST = comAtorNaObra(
  'engenheiro',
  async (ator, requisicao) => {
    let corpo: unknown = null;
    try {
      corpo = await requisicao.json();
    } catch {
      // Corpo ilegível é entrada hostil como qualquer outra: recusa com a
      // mensagem de quem vai agir, sem detalhe de analisador.
      return Response.json({ erro: 'O pedido chegou ilegível.' }, { status: 400 });
    }
    return respondeComOPeriodoExportado(
      { usuarioId: ator.usuarioId },
      ator.perfil,
      ator.obraId,
      corpo,
    );
  },
  {
    autentica: (requisicao) => atorDaRota(requisicao),
    amb: () => paraAcesso(ambienteDaComposicao().cadastro),
  },
);
