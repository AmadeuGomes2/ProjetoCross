import Link from 'next/link';

import { somaDias } from '../../../../../shared/date/dia';
import { CabecalhoDoDia } from '../../../_componentes/cabecalho';
import { carregaDadosDaTelaProtegida } from '../../../_dados';
import estilos from '../../../estilos.module.css';

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
        <h1 className={estilos.data}>Data inválida</h1>
        <p className={estilos.recadoErro}>{dados.recado}</p>
      </main>
    );
  }

  const base = `/lancamento/${obraId}`;

  return (
    <main>
      <CabecalhoDoDia data={data} estado={dados.estado} fechado={dados.diaFechado} />

      {dados.recado === null ? null : <p className={estilos.recado}>{dados.recado}</p>}

      <div className={estilos.pilha}>
        <Link className={estilos.botao} href={`${base}/${data}/dia`}>
          Confirmar o dia
        </Link>
        <Link className={estilos.cartao} href={`${base}/${data}/atividades`}>
          <span>Atividades</span>
          <span className={estilos.cartaoContagem}>{dados.atividades.length}</span>
        </Link>
        <Link className={estilos.cartao} href={`${base}/${data}/producao`}>
          <span>Produção</span>
          <span className={estilos.cartaoContagem}>{dados.quantidadeDeProducao}</span>
        </Link>
        <Link className={estilos.cartao} href={`${base}/${data}/observacoes`}>
          <span>Observações</span>
          <span className={estilos.cartaoContagem}>{dados.observacoes.length}</span>
        </Link>
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
