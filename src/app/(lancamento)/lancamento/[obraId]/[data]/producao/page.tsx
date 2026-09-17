import { Trilha } from '../../../../../_componentes/casca';
import { CabecalhoDoDia } from '../../../../_componentes/cabecalho';
import { formataBr } from '../../../../../../shared/date/dia';
import { FormularioDeProducao } from '../../../../_componentes/formulario-de-producao';
import { carregaDadosDaTelaProtegida } from '../../../../_dados';
import estilos from '../../../../estilos.module.css';

/** Produção por serviço controlado. */
export default async function PaginaDeProducao({
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
          { texto: 'Produção' },
        ]}
      />
      <CabecalhoDoDia data={data} estado={dados.estado} fechado={dados.diaFechado} />
      {dados.recado === null ? null : <p className={estilos.recado}>{dados.recado}</p>}
      <FormularioDeProducao
        obraId={obraId}
        data={data}
        servicos={dados.servicos}
        diaFechado={dados.diaFechado}
      />
    </main>
  );
}
