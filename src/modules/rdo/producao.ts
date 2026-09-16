/**
 * Produção controlada, bloco 7.
 *
 *   executado(serviço, dia)  = soma dos lançamentos daquele serviço NAQUELE dia
 *   acumulado(serviço, dia)  = soma dos lançamentos daquele serviço ATÉ o dia,
 *                              inclusive
 *   percentual(serviço, dia) = acumulado / quantidade de projeto
 *
 * R5: o acumulado é **sempre recalculado**, nunca guardado. Corrigir um
 * lançamento de março tem que corrigir o acumulado de setembro sozinho — é o
 * caso CT-201, e é o teste que quebra se alguém gravar o acumulado numa tabela.
 * Por isso a regra `data <= dia` é aplicada aqui, e não delegada a quem lê o
 * banco: o cálculo do RDO é dono dela.
 *
 * O casamento do serviço é por **referência ao cadastro** (`servicoId`), nunca
 * por igualdade de texto: renomear o serviço não pode zerar a coluna (CT-205).
 *
 * Caso obrigatório 6: acumulado acima do projeto **avisa e não bloqueia**, e
 * `igual ao projeto` não é `acima` — um `>=` aqui faria todo serviço concluído
 * nascer marcado como estourado.
 *
 * Decisão 17.2: produção zero sai como `-` em `EXEC.` e `ACUM.`, e **não** no
 * percentual, que continua numérico (leitura literal registrada no PRD).
 */

import type { DiaPuro } from '../../shared/date/dia';
import {
  divideParaPercentual,
  formataBrDuasCasas,
  formataBrDuasCasasOuTraco,
  formataPercentual,
  maiorQue,
  type Quantidade,
  soma,
} from '../../shared/decimal';
import type { LancamentoId, ServicoControladoId } from '../../shared/id';
import type { LancamentoDeProducao, ServicoControladoComProjeto } from './portas';

export interface LinhaDeProducao {
  readonly servicoId: ServicoControladoId;
  readonly nome: string;
  readonly executado: Quantidade;
  readonly acumulado: Quantidade;
  readonly projeto: Quantidade;
  readonly executadoTexto: string;
  readonly acumuladoTexto: string;
  readonly projetoTexto: string;
  readonly percentualTexto: string;
  /** Fração do projeto, para a barra de progresso. 1 é 100%. */
  readonly fracaoDoProjeto: number;
  readonly acumuladoAcimaDoProjeto: boolean;
  /** Rastreabilidade: os lançamentos que compõem o acumulado (CT-232). */
  readonly lancamentosDoAcumulado: readonly LancamentoId[];
}

export function calculaProducaoControlada(
  servicos: readonly ServicoControladoComProjeto[],
  lancamentos: readonly LancamentoDeProducao[],
  dia: DiaPuro,
): readonly LinhaDeProducao[] {
  const ordenados = [...servicos].sort((a, b) => a.ordem - b.ordem);

  return ordenados.map((servico) => {
    const doServico = lancamentos
      .filter((l) => l.servicoId === servico.servicoId && l.data <= dia)
      // Ordem estável para que duas consultas do mesmo dia deem o mesmo
      // documento (CT-241): data e, no empate, id do lançamento.
      .sort((a, b) =>
        a.data === b.data
          ? a.lancamentoId.localeCompare(b.lancamentoId)
          : a.data.localeCompare(b.data),
      );

    const acumulado = soma(doServico.map((l) => l.quantidade));
    const executado = soma(
      doServico.filter((l) => l.data === dia).map((l) => l.quantidade),
    );
    const fracao = divideParaPercentual(acumulado, servico.quantidadeDeProjeto);

    return {
      servicoId: servico.servicoId,
      nome: servico.nome.trim(),
      executado,
      acumulado,
      projeto: servico.quantidadeDeProjeto,
      executadoTexto: formataBrDuasCasasOuTraco(executado),
      acumuladoTexto: formataBrDuasCasasOuTraco(acumulado),
      // A quantidade de projeto é sempre maior que zero (decisão 13.4), então
      // não passa pela regra do traço, que é sobre produção.
      projetoTexto: formataBrDuasCasas(servico.quantidadeDeProjeto),
      percentualTexto: formataPercentual(fracao),
      fracaoDoProjeto: fracao === null ? 0 : fracao.toNumber(),
      acumuladoAcimaDoProjeto: maiorQue(acumulado, servico.quantidadeDeProjeto),
      lancamentosDoAcumulado: doServico.map((l) => l.lancamentoId),
    };
  });
}
