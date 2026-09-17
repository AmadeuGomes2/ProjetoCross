import Link from 'next/link';

import { formataBr, somaDias } from '../../../../../shared/date/dia';
import { Trilha } from '../../../../_componentes/casca';
import { CabecalhoDoDia } from '../../../_componentes/cabecalho';
import { carregaDadosDaTelaProtegida } from '../../../_dados';
import estilos from '../../../estilos.module.css';

/**
 * Um bloco do dia, com quantos lançamentos ele tem.
 *
 * O zero recua em vez de competir. Antes `Produção 0` saía com o mesmo peso de
 * `Atividades 1`, e o olho lia dois números iguais. Agora zero vira "nenhum",
 * em tinta fraca.
 *
 * **Zero não é pendência**, e por isso não leva cor de alerta: um dia pode
 * legitimamente não ter produção, e marcar isso como falta seria inventar regra
 * que ninguém escreveu (CLAUDE.md). O que a tela faz é deixar a ausência
 * legível, não julgá-la.
 *
 * A seta existe porque, sem ela, o cartão parecia um painel de leitura. É a
 * única indicação de que dá para tocar.
 */
function CartaoDeSecao({
  href,
  titulo,
  quantidade,
}: {
  readonly href: string;
  readonly titulo: string;
  readonly quantidade: number;
}) {
  return (
    <Link className={estilos.cartao} href={href}>
      <span>{titulo}</span>
      <span className={estilos.cartaoDireita}>
        <span
          className={
            quantidade === 0
              ? `${estilos.cartaoContagem} ${estilos.cartaoContagemVazia}`
              : estilos.cartaoContagem
          }
        >
          {quantidade === 0 ? 'nenhum' : quantidade}
        </span>
        <span className={estilos.cartaoSeta} aria-hidden="true">
          ›
        </span>
      </span>
    </Link>
  );
}

/**
 * O dia, em cartões.
 *
 * "Nada de exigir o dia inteiro numa tela só": cada bloco tem a sua tela, e
 * esta aqui é o índice. O caminho do dia comum é o primeiro botão — confirmar o
 * estado e os turnos de ontem — e ele resolve o dia em dois toques.
 */
export default async function PaginaDoDia({
  params,
}: {
  params: Promise<{ obraId: string; data: string }>;
}) {
  const { obraId, data } = await params;
  const dados = await carregaDadosDaTelaProtegida(obraId, data);

  if (!dados.dataValida) {
    return (
      <main>
        <Trilha
          degraus={[
            { texto: 'Obras', href: '/obras' },
            { texto: 'Obra', href: `/obras/${obraId}` },
            { texto: 'Lançamento' },
          ]}
        />
        <h1 className={estilos.data}>Data inválida</h1>
        <p className={estilos.recadoErro}>{dados.recado}</p>
      </main>
    );
  }

  const base = `/lancamento/${obraId}`;

  return (
    <main>
      <Trilha
        degraus={[
          { texto: 'Obras', href: '/obras' },
          { texto: 'Obra', href: `/obras/${obraId}` },
          { texto: formataBr(data) },
        ]}
      />
      <CabecalhoDoDia data={data} estado={dados.estado} fechado={dados.diaFechado} />

      {dados.recado === null ? null : <p className={estilos.recado}>{dados.recado}</p>}

      <div className={estilos.pilha}>
        <Link className={estilos.botao} href={`${base}/${data}/dia`}>
          Confirmar o dia
        </Link>
        <CartaoDeSecao
          href={`${base}/${data}/atividades`}
          titulo="Atividades"
          quantidade={dados.atividades.length}
        />
        <CartaoDeSecao
          href={`${base}/${data}/producao`}
          titulo="Produção"
          quantidade={dados.quantidadeDeProducao}
        />
        <CartaoDeSecao
          href={`${base}/${data}/observacoes`}
          titulo="Observações"
          quantidade={dados.observacoes.length}
        />
      </div>

      <div className={estilos.secao}>
        <div className={estilos.grupoDeEscolha}>
          <Link
            className={estilos.botaoSecundario}
            href={`${base}/${somaDias(data, -1)}`}
          >
            ← Dia anterior
          </Link>
          <Link className={estilos.botaoSecundario} href={`${base}/${somaDias(data, 1)}`}>
            Dia seguinte →
          </Link>
        </div>
      </div>
    </main>
  );
}
