/**
 * Produção controlada do consolidado — bloco 7.
 *
 *   EXEC. = executado nos dias DO CONJUNTO
 *   ACUM. = acumulado da obra até o ÚLTIMO dia do conjunto, inclusive
 *   %     = acumulado / quantidade de projeto
 *
 * **A regra do dia não é reescrita.** `calculaProducaoControlada`
 * (`../producao.ts`) é chamada uma vez por dia do conjunto, e o `executado` de
 * cada chamada é somado; `acumulado`, `projeto`, `fracao` e
 * `lancamentosDoAcumulado` vêm da chamada do **último dia**. Uma regra, uma
 * função, dois relatórios.
 *
 * O ponto em que um tipo de intervalo teria mentido (DP1): para `{02, 05, 09}`,
 * o `EXEC.` **não** soma o dia 03 e o `ACUM.` **soma**. São coisas diferentes e
 * o teste prova as duas.
 *
 * R5 continua inteiro: o acumulado é recalculado do zero a cada consulta, e
 * corrigir um lançamento de março corrige setembro sozinho.
 */

import type { DiaPuro } from '../../../shared/date/dia';
import {
  formataBrDuasCasasOuTraco,
  type Quantidade,
  soma,
  zero,
} from '../../../shared/decimal';
import type { LancamentoDeProducao, ServicoControladoComProjeto } from '../portas';
import { calculaProducaoControlada } from '../producao';
import type { LinhaDeProducaoDoPeriodo } from './tipos';

export function calculaProducaoDoPeriodo(
  servicos: readonly ServicoControladoComProjeto[],
  lancamentosAteOUltimoDia: readonly LancamentoDeProducao[],
  dias: readonly DiaPuro[],
  ultimoDia: DiaPuro,
): readonly LinhaDeProducaoDoPeriodo[] {
  // Casamento por `servicoId`, nunca por posição na lista: o bloco 7 tem
  // posições fixas hoje, e amarrar a soma do período à ordem do array faria a
  // conta depender de layout. O casamento por referência ao cadastro é a
  // mesma regra do diário (`../producao.ts`).
  const executadoPorDia = dias.map((dia) => {
    const doDia = calculaProducaoControlada(servicos, lancamentosAteOUltimoDia, dia);
    return new Map<string, Quantidade>(doDia.map((l) => [l.servicoId, l.executado]));
  });

  // O último dia é o corte do ACUM. (DP6). A chamada é separada para que a
  // regra continue sendo a do diário, mesmo que o conjunto mude de forma.
  const noUltimoDia = calculaProducaoControlada(
    servicos,
    lancamentosAteOUltimoDia,
    ultimoDia,
  );

  const diasDoConjunto = new Set<string>(dias);

  return noUltimoDia.map((linhaDoUltimoDia) => {
    const executadoNoPeriodo: Quantidade = soma(
      executadoPorDia.map((doDia) => doDia.get(linhaDoUltimoDia.servicoId) ?? zero()),
    );

    // Rastreabilidade, não uma segunda implementação da soma: quais lançamentos
    // compõem o EXEC. do período. A soma acima é a de `calculaProducaoControlada`.
    const lancamentosDoExecutado = lancamentosAteOUltimoDia
      .filter(
        (l) => l.servicoId === linhaDoUltimoDia.servicoId && diasDoConjunto.has(l.data),
      )
      .sort((a, b) =>
        a.data === b.data
          ? a.lancamentoId.localeCompare(b.lancamentoId)
          : a.data.localeCompare(b.data),
      )
      .map((l) => l.lancamentoId);

    return {
      servicoId: linhaDoUltimoDia.servicoId,
      nome: linhaDoUltimoDia.nome,
      executadoNoPeriodo,
      executadoTexto: formataBrDuasCasasOuTraco(executadoNoPeriodo),
      acumulado: linhaDoUltimoDia.acumulado,
      acumuladoTexto: linhaDoUltimoDia.acumuladoTexto,
      projeto: linhaDoUltimoDia.projeto,
      projetoTexto: linhaDoUltimoDia.projetoTexto,
      percentualTexto: linhaDoUltimoDia.percentualTexto,
      fracaoDoProjeto: linhaDoUltimoDia.fracaoDoProjeto,
      acumuladoAcimaDoProjeto: linhaDoUltimoDia.acumuladoAcimaDoProjeto,
      lancamentosDoExecutado,
      lancamentosDoAcumulado: linhaDoUltimoDia.lancamentosDoAcumulado,
    };
  });
}
