import { CabecalhoDoDia, Voltar } from '../../../../_componentes/cabecalho';
import { FormularioDeObservacao } from '../../../../_componentes/formulario-de-observacao';
import { carregaDadosDaTelaProtegida } from '../../../../_dados';
import estilos from '../../../../estilos.module.css';

/** Observações da contratada. O lado do contratante sai vazio na v1 (10.1). */
export default async function PaginaDeObservacoes({
  params,
}: {
  params: Promise<{ obraId: string; data: string }>;
}) {
  const { obraId, data } = await params;
  const dados = await carregaDadosDaTelaProtegida(obraId, data);

  if (!dados.dataValida) {
    return (
      <main>
        <Voltar para={`/obras/${obraId}`} texto="Voltar à obra" />
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
      <FormularioDeObservacao
        obraId={obraId}
        data={data}
        jaLancadas={dados.observacoes}
        diaFechado={dados.diaFechado}
      />
    </main>
  );
}
