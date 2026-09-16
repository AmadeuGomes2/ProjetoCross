import { CabecalhoDoDia, Voltar } from '../../../../_componentes/cabecalho';
import { FormularioDeProducao } from '../../../../_componentes/formulario-de-producao';
import { carregaDadosDaTela } from '../../../../_dados';
import estilos from '../../../../estilos.module.css';

/** Produção por serviço controlado. */
export default async function PaginaDeProducao({
  params,
}: {
  params: Promise<{ obraId: string; data: string }>;
}) {
  const { obraId, data } = await params;
  const dados = await carregaDadosDaTela(obraId, data);

  if (!dados.dataValida) {
    return (
      <main>
        <h1 className={estilos.data}>Data inválida</h1>
        <p className={estilos.recadoErro}>{dados.recado}</p>
      </main>
    );
  }

  return (
    <main>
      <Voltar para={`/lancamento/${obraId}/${data}`} texto="Voltar ao dia" />
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
