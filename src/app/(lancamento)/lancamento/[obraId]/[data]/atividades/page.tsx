import { Trilha } from '../../../../../_componentes/casca';
import { CabecalhoDoDia } from '../../../../_componentes/cabecalho';
import { formataBr } from '../../../../../../shared/date/dia';
import { FormularioDeAtividade } from '../../../../_componentes/formulario-de-atividade';
import { carregaDadosDaTelaProtegida } from '../../../../_dados';
import estilos from '../../../../estilos.module.css';

/** Atividades do dia. Uma por vez, com o status escolhido de lista. */
export default async function PaginaDeAtividades({
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

  return (
    <main>
      <Trilha
        degraus={[
          { texto: 'Obras', href: '/obras' },
          { texto: 'Obra', href: `/obras/${obraId}` },
          { texto: formataBr(data), href: `/lancamento/${obraId}/${data}` },
          { texto: 'Atividades' },
        ]}
      />
      <CabecalhoDoDia data={data} estado={dados.estado} fechado={dados.diaFechado} />
      {dados.recado === null ? null : <p className={estilos.recado}>{dados.recado}</p>}
      <FormularioDeAtividade
        obraId={obraId}
        data={data}
        status={dados.status}
        jaLancadas={dados.atividades}
        diaParado={dados.estado === 'parado'}
        diaFechado={dados.diaFechado}
      />
    </main>
  );
}
