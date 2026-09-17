import type { ReactElement } from 'react';

import type {
  ControlePluviometrico,
  LinhaDoControle,
} from '../../../modules/rdo/controle-pluviometrico';
import type { LetraDeTurno } from '../../../shared/taxonomia';
import estilos from './pluviometria.module.css';

/**
 * Os rótulos da aba `PLUVIOMETRIA`, com a grafia dela.
 *
 * **Não são os do RDO.** O documento diário abrevia `NOITE ANTER`; esta aba
 * escreve por extenso. E `INDICE ACUMUALDO` é erro de digitação da planilha
 * original, herdado de propósito: é o rótulo que o fiscal reconhece, e a regra
 * do projeto é herdar a grafia exata, inclusive os erros
 * (`docs/dominio/mapa-planilha.md`, seção `PLUVIOMETRIA`).
 */
const ROTULO = {
  DATA: 'DATA',
  DIA_DA_SEMANA: 'D. DA SEMANA',
  NOITE_ANTERIOR: 'NOITE ANTERIOR',
  MANHA: 'MANHÃ',
  TARDE: 'TARDE',
  RESUMO: 'RESUMO DO DIA',
  INDICE: 'INDICE',
  ACUMULADO: 'INDICE ACUMUALDO',
} as const;

/** Nome por extenso da letra, para quem lê com leitor de tela. */
const NOME_DA_LETRA: Record<LetraDeTurno, string> = {
  B: 'Bom',
  C: 'Chuva',
  I: 'Impraticável',
};

function Turno({ letra }: { readonly letra: LetraDeTurno | null }): ReactElement {
  if (letra === null) return <span className={estilos.semLetra}>—</span>;
  return (
    <span className={`${estilos.letra} ${estilos[`letra${letra}`]}`}>
      <abbr title={NOME_DA_LETRA[letra]}>{letra}</abbr>
    </span>
  );
}

function Linha({ linha }: { readonly linha: LinhaDoControle }): ReactElement {
  return (
    <tr className={linha.leituraAusente ? estilos.linhaSemLeitura : undefined}>
      <td data-rotulo={ROTULO.DATA} className={estilos.data}>
        {linha.dataBr}
      </td>
      <td data-rotulo={ROTULO.DIA_DA_SEMANA} className={estilos.semana}>
        {linha.diaDaSemana}
      </td>
      <td data-rotulo={ROTULO.NOITE_ANTERIOR} className={estilos.turno}>
        <Turno letra={linha.noiteAnterior} />
      </td>
      <td data-rotulo={ROTULO.MANHA} className={estilos.turno}>
        <Turno letra={linha.manha} />
      </td>
      <td data-rotulo={ROTULO.TARDE} className={estilos.turno}>
        <Turno letra={linha.tarde} />
      </td>
      <td data-rotulo={ROTULO.RESUMO} className={estilos.resumo}>
        {linha.resumo ?? <span className={estilos.semLetra}>não lançado</span>}
      </td>
      <td data-rotulo={ROTULO.INDICE} className={estilos.numero}>
        {linha.indiceTexto === '' ? (
          <span className={estilos.semLetra}>—</span>
        ) : (
          linha.indiceTexto
        )}
      </td>
      <td data-rotulo={ROTULO.ACUMULADO} className={estilos.numero}>
        {linha.acumuladoTexto}
      </td>
    </tr>
  );
}

/**
 * O controle pluviométrico do mês, na tela.
 *
 * É uma `<table>` de verdade, e não uma lista de cartões como o RDO diário: o
 * dado aqui É tabular, a comparação entre dias é o próprio uso da tela, e o
 * gabarito da planilha imprime uma tabela. No celular ela vira um cartão por
 * dia — cada célula carrega o rótulo em `data-rotulo` e o CSS o mostra —, o que
 * atende a regra de nunca ter rolagem horizontal sem mentir sobre a estrutura
 * para quem usa leitor de tela.
 *
 * O painel do mês vem ANTES da tabela. Quem abre esta tela quer primeiro o
 * número do mês; a linha do dia 14 é consulta, não resposta.
 */
export function ControlePluviometricoNaTela({
  controle,
  titulo,
}: {
  readonly controle: ControlePluviometrico;
  readonly titulo: string;
}): ReactElement {
  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>{titulo}</h1>

      <section className={estilos.painel} aria-label="Resumo do mês">
        <div className={estilos.medida}>
          <span className={estilos.rotuloDaMedida}>Total no mês</span>
          <strong className={estilos.valorDaMedida}>{controle.totalMmTexto}</strong>
        </div>
        <div className={estilos.medida}>
          <span className={estilos.rotuloDaMedida}>Trabalhado</span>
          <strong className={estilos.valorDaMedida}>{controle.diasTrabalhado}</strong>
        </div>
        <div className={estilos.medida}>
          <span className={estilos.rotuloDaMedida}>Perca de produção</span>
          <strong className={estilos.valorDaMedida}>{controle.diasPerca}</strong>
        </div>
        <div className={estilos.medida}>
          <span className={estilos.rotuloDaMedida}>Impraticavél</span>
          <strong className={estilos.valorDaMedida}>{controle.diasImpraticavel}</strong>
        </div>
        <div className={estilos.medida}>
          <span className={estilos.rotuloDaMedida}>Sem lançamento</span>
          <strong className={estilos.valorDaMedida}>{controle.diasSemLeitura}</strong>
        </div>
      </section>

      <table className={estilos.tabela}>
        <thead>
          <tr>
            <th scope="col">{ROTULO.DATA}</th>
            <th scope="col">{ROTULO.DIA_DA_SEMANA}</th>
            <th scope="col">{ROTULO.NOITE_ANTERIOR}</th>
            <th scope="col">{ROTULO.MANHA}</th>
            <th scope="col">{ROTULO.TARDE}</th>
            <th scope="col">{ROTULO.RESUMO}</th>
            <th scope="col">{ROTULO.INDICE}</th>
            <th scope="col">{ROTULO.ACUMULADO}</th>
          </tr>
        </thead>
        <tbody>
          {controle.linhas.map((linha) => (
            <Linha key={linha.data} linha={linha} />
          ))}
        </tbody>
      </table>

      <p className={estilos.nota}>
        Dia sem lançamento aparece com o índice vazio, e não com zero: ninguém mediu é
        diferente de não choveu. O acumulado segue somando.
      </p>
    </main>
  );
}
