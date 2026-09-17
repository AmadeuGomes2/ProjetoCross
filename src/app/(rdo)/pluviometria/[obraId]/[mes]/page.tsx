/**
 * Controle pluviométrico do mês: `/pluviometria/<obra>/<AAAA-MM>`.
 *
 * **Autentica e autoriza antes de qualquer leitura**, como toda superfície
 * deste projeto: não existe `middleware.ts`, cada rota se protege sozinha. A
 * autorização acontece dentro de `leControlePluviometricoProtegido`, que exige
 * engenheiro na obra.
 *
 * Página fina: lê os parâmetros, chama o caso de uso e renderiza. O mês vem da
 * URL e é entrada hostil como qualquer outra — quem o valida é
 * `leMesDoControle`, dentro do caso de uso, e `2026-13` não passa daqui.
 */

import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';

import { leControlePluviometricoProtegido } from '../../../../_composicao/controle-pluviometrico';
import { atorDaRequisicao } from '../../../../_composicao/sessao';
import { ControlePluviometricoNaTela } from '../../../_componentes/controle-pluviometrico-na-tela';
import { Trilha } from '../../../../_componentes/casca';
import estilos from '../../../_componentes/rdo.module.css';

export const dynamic = 'force-dynamic';

const NOME_DO_MES = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
] as const;

/**
 * O título que a célula `A1` da planilha monta por fórmula, e que resolve para
 * `Controle pluviométrico - JULHO/2026`. A grafia é a de lá.
 */
function tituloDoMes(mes: string): string {
  const [ano, numero] = mes.split('-');
  const nome = NOME_DO_MES[Number(numero) - 1];
  if (nome === undefined || ano === undefined) return 'Controle pluviométrico';
  return `Controle pluviométrico - ${nome}/${ano}`;
}

export default async function PaginaDoControlePluviometrico({
  params,
}: {
  params: Promise<{ obraId: string; mes: string }>;
}): Promise<ReactElement> {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const { obraId, mes } = await params;
  const resultado = await leControlePluviometricoProtegido(ator, { obraId, mes });

  const trilha = (
    <Trilha
      degraus={[
        { texto: 'Obras', href: '/obras' },
        { texto: 'Obra', href: `/obras/${obraId}` },
        { texto: 'Pluviometria' },
      ]}
    />
  );

  if (!resultado.ok) {
    return (
      <main className={estilos.pagina}>
        {trilha}
        <p className={estilos.erro}>{resultado.erro.mensagem}</p>
      </main>
    );
  }

  return (
    <>
      <nav className={`${estilos.barraDeAcoes} naoImprime`}>{trilha}</nav>
      <ControlePluviometricoNaTela controle={resultado.valor} titulo={tituloDoMes(mes)} />
    </>
  );
}
