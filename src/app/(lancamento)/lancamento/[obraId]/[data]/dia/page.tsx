import { CabecalhoDoDia, Voltar } from '../../../../_componentes/cabecalho';
import { FormularioDoDia } from '../../../../_componentes/formulario-do-dia';
import { carregaDadosDaTelaProtegida } from '../../../../_dados';
import estilos from '../../../../estilos.module.css';

/**
 * Confirmar o dia: estado, turnos e índice, numa tela só.
 *
 * É o caminho do dia comum, e por isso ele vem pré-preenchido do dia anterior
 * (15.1): confirmar custa um toque, que é a comparação com o áudio de WhatsApp.
 */
export default async function PaginaDeEstadoDoDia({
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

  return (
    <main>
      <Voltar para={`/lancamento/${obraId}/${data}`} texto="Voltar ao dia" />
      <CabecalhoDoDia data={data} estado={dados.estado} fechado={dados.diaFechado} />
      {dados.recado === null ? null : <p className={estilos.recado}>{dados.recado}</p>}
      <FormularioDoDia
        obraId={obraId}
        data={data}
        estadoInicial={dados.estadoSugerido}
        turnosIniciais={dados.turnosSugeridos}
        sugestoesDeMotivo={dados.sugestoesDeMotivo}
        diaFechado={dados.diaFechado}
      />
    </main>
  );
}
