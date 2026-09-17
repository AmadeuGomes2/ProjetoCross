import { diaDaSemana, formataBr } from '../../../shared/date/dia';
import type { EstadoNaTela } from '../../../modules/lancamento';
import estilos from '../estilos.module.css';

const ROTULO_DO_ESTADO: Readonly<Record<EstadoNaTela, string>> = {
  nao_lancado: 'Não lançado',
  trabalhado: 'Trabalhado',
  parado: 'Parado',
};

/**
 * Cabeçalho da tela de lançamento.
 *
 * Data grande e em pt-BR, dia da semana por extenso e o estado do dia à vista.
 * `não lançado` aparece com todas as letras: ninguém ter lançado é diferente de
 * ter lançado que não houve trabalho (decisão 4.2).
 */
export function CabecalhoDoDia({
  data,
  estado,
  fechado,
}: {
  readonly data: string;
  readonly estado: EstadoNaTela;
  readonly fechado: boolean;
}) {
  return (
    <header className={estilos.cabecalho}>
      <h1 className={estilos.data}>{formataBr(data)}</h1>
      <p className={estilos.diaDaSemana}>{diaDaSemana(data)}</p>
      <span className={estilos.estado}>
        {ROTULO_DO_ESTADO[estado]}
        {fechado ? ' · dia fechado' : ''}
      </span>
    </header>
  );
}
