import Link from 'next/link';

import { hojeNaObra } from '../../../../shared/date/fuso';

/**
 * Navegação entre as telas de cadastro de uma obra.
 *
 * Na captura de 16/09 estes cinco destinos eram cinco botões brancos idênticos:
 * navegação desenhada como ação, sem nenhum indicar em qual deles se estava.
 * Aqui viram abas, com o atual marcado por cor, peso e `aria-current`, e não só
 * por cor — quem não distingue as duas ainda precisa saber onde está.
 *
 * "Visão geral" entrou na frente porque a obra passa a abrir em estado, e não
 * em formulário; as outras cinco são configuração, que se mexe uma vez.
 */

export type AbaDaObra =
  | 'visao'
  | 'pessoal'
  | 'equipamento'
  | 'servicos'
  | 'taxonomia'
  | 'pluviometria'
  | 'acesso';

/**
 * O destino é uma função, e não um sufixo de `/obras/<id>`.
 *
 * Cinco destas abas vivem sob a obra; a pluviometria vive sob `/pluviometria`,
 * no grupo de rotas do RDO, porque é leitura de documento e não cadastro. Com
 * sufixo o link saía `/obras/<id>/pluviometria`, que não é rota nenhuma.
 *
 * A pluviometria ainda leva o mês corrente no endereço. Houve uma rota
 * `/pluviometria/<id>` sem mês que redirecionava para cá, e ela foi removida:
 * era uma página recebendo `obraId` **sem verificar acesso**, apontada pelo
 * guarda em `rotas-protegidas.test.ts`. Como este é componente de servidor, ele
 * pergunta a data direto e a rota extra deixa de existir — uma superfície a
 * menos vale mais que um endereço mais curto.
 */
const ABAS: ReadonlyArray<
  readonly [AbaDaObra, (obraId: string, mes: string) => string, string]
> = [
  ['visao', (id) => `/obras/${id}`, 'Visão geral'],
  ['pessoal', (id) => `/obras/${id}/pessoal`, 'Pessoal'],
  ['equipamento', (id) => `/obras/${id}/equipamento`, 'Equipamentos'],
  ['servicos', (id) => `/obras/${id}/servicos`, 'Serviços controlados'],
  ['taxonomia', (id) => `/obras/${id}/taxonomia`, 'Listas'],
  ['pluviometria', (id, mes) => `/pluviometria/${id}/${mes}`, 'Pluviometria'],
  ['acesso', (id) => `/obras/${id}/acesso`, 'Acesso'],
];

export function AbasDaObra({
  obraId,
  atual,
  ehEngenheiro = true,
}: {
  readonly obraId: string;
  readonly atual: AbaDaObra;
  /**
   * Acesso e pluviometria são do engenheiro; para o encarregado as abas nem
   * aparecem (17/09/2026). Esconder não é controle de acesso — os dois destinos
   * recusam no servidor —, é só não oferecer o que terminaria em 403.
   */
  readonly ehEngenheiro?: boolean;
}) {
  // O mês corrente **no fuso da obra**, nunca no do servidor: às 23h de São
  // Paulo na virada do mês, um servidor em UTC mandaria para o mês seguinte.
  const mes = hojeNaObra().slice(0, 7);

  return (
    <nav className="abas" aria-label="Seções da obra">
      {ABAS.filter(
        ([chave]) => ehEngenheiro || (chave !== 'acesso' && chave !== 'pluviometria'),
      ).map(([chave, destino, rotulo]) => {
        const ativa = chave === atual;
        return (
          <Link
            key={chave}
            className={ativa ? 'aba aba--ativa' : 'aba'}
            href={destino(obraId, mes)}
            aria-current={ativa ? 'page' : undefined}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
