/**
 * `GET /rdo/<obra>/<AAAA-MM-DD>/pdf` — o caminho pelo qual o fiscal recebe o
 * documento.
 *
 * Até aqui o PDF só existia dentro do teste do módulo: não havia rota nenhuma
 * no repositório (CRÍTICO 3 do laudo de fidelidade de 16/09/2026). Esta é ela.
 *
 * Rota é borda: autoriza e delega. Nenhuma regra de negócio mora aqui — número
 * do RDO, efetivo, acumulado, transbordo e a trilha de exportação estão nos
 * módulos. O embrulho `comAtorNaObra` é obrigatório (arquitetura, 5.2) e é o
 * que `rotas-protegidas.test.ts` varre.
 *
 * Perfil mínimo `engenheiro`: **só o engenheiro exporta** (R19). O módulo
 * `export` verifica o perfil de novo, e é de propósito — esconder o botão não é
 * controle de acesso, e uma rota nova pode esquecer a primeira camada.
 */

import { comAtorNaObra } from '../../../../../../modules/acesso';
import { ambienteDaComposicao } from '../../../../../_composicao/ambiente';
import { paraAcesso } from '../../../../../_composicao/ambiente-de-cadastro';
import { respondeComOPdfDoRdo } from '../../../../../_composicao/exportacao-rdo';
import { atorDaRota } from '../../../../../_composicao/sessao';

export const dynamic = 'force-dynamic';

export const GET = comAtorNaObra(
  'engenheiro',
  async (ator, _requisicao, params) =>
    respondeComOPdfDoRdo(
      { usuarioId: ator.usuarioId, perfil: ator.perfil },
      ator.obraId,
      params['dia'],
    ),
  {
    // As duas dependências são resolvidas **por requisição**, não no import: o
    // banco abre na primeira chamada, e o cookie é lido a cada pedido.
    autentica: (requisicao) => atorDaRota(requisicao),
    amb: () => paraAcesso(ambienteDaComposicao().cadastro),
  },
);
