/**
 * A borda do RDO de período: onde o conjunto vindo do navegador deixa de ser
 * hostil.
 *
 * Mesma postura de `./esquemas.ts`: `safeParse` e nunca `parse`, falha de
 * entrada é `Result` e não exceção, e o esquema **não devolve `string`** — ele
 * transforma para os tipos de marca de `shared`, e por isso esquecer a
 * validação não compila.
 *
 * **A entrada é um conjunto, não um intervalo** (DP1). `PedidoDeRdoDePeriodo`
 * carrega três propriedades no tipo, garantidas por esta única função:
 * ordenado, sem repetição e não vazio. Quem o recebe não reordena nem
 * deduplica, e não existe um segundo lugar que decida a ordem.
 *
 * A ordem das conferências importa, e é esta:
 *
 * 1. **comprimento, antes de olhar item nenhum.** Um array de cem mil itens não
 *    pode custar cem mil validações de calendário antes de ser recusado;
 * 2. cada item por `criaDiaPuro`, que recusa `2026-09-31` contra o calendário
 *    real (caso obrigatório 10);
 * 3. ordenação crescente e remoção de repetidos. Conjunto é conjunto: dia
 *    repetido dobraria o `EXEC.` e o total de mm.
 *
 * **Dia repetido é removido em silêncio, e isso não é corte silencioso**: tocar
 * duas vezes no mesmo RDO na tela não é mentira do usuário, e o conjunto
 * normalizado volta no resultado para a tela mostrar o que foi de fato usado.
 *
 * O que **não** se decide aqui é dia fora do período do contrato: isso depende
 * do cadastro da obra e mora em `../periodo/monta-rdo-de-periodo.ts`, que
 * recusa o conjunto inteiro (decisão 23.1 aplicada ao conjunto).
 */

import { z } from 'zod';

import { criaDiaPuro, type DiaPuro } from '../../../shared/date/dia';
import { idConfiavel, type ObraId } from '../../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  type ErroDeEntrada,
  ok,
  type Result,
} from '../../../shared/result';
import { DIAS_MAXIMOS_DA_CONSULTA } from './esquemas';

/**
 * Espelha o limite de `./esquemas.ts`, que não o exporta. São o mesmo número
 * pela mesma razão; quem for mexer naquele arquivo suba a constante para um
 * lugar só, que é mudança compartilhada e exige perguntar.
 */
const TAMANHO_MAXIMO_DO_ID = 64;

export interface PedidoDeRdoDePeriodo {
  readonly obraId: ObraId;
  /** Ordenado crescente, sem repetição, não vazio. Garantia do tipo. */
  readonly dias: readonly DiaPuro[];
}

const esquemaDoConjunto = z.object({
  obraId: z.string().trim().min(1).max(TAMANHO_MAXIMO_DO_ID),
  // `unknown` de propósito: o comprimento é conferido ANTES de o item ser
  // olhado. Validar cada item primeiro é o caminho barato de gastar o servidor.
  dias: z.array(z.unknown()),
});

export function interpretaPedidoDeRdoDePeriodo(
  bruto: unknown,
): Result<PedidoDeRdoDePeriodo, ErroDeEntrada> {
  const lido = esquemaDoConjunto.safeParse(bruto);
  if (!lido.success) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.DIA_INVALIDO,
        'Informe a obra e os dias que devem entrar no relatório do período.',
      ),
    );
  }

  const brutos = lido.data.dias;

  if (brutos.length === 0) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.CAMPO_OBRIGATORIO,
        'Escolha ao menos um dia para o relatório do período.',
        'dias',
      ),
    );
  }

  if (brutos.length > DIAS_MAXIMOS_DA_CONSULTA) {
    return erro(
      erroDeEntrada(
        // O número está certo; o pedido é que é grande demais. Quem lê o log
        // precisa reconhecer esta tentativa de longe, e não confundi-la com
        // erro de digitação.
        CODIGO_ERRO.PERIODO_LONGO_DEMAIS,
        `A consulta cobre no máximo ${DIAS_MAXIMOS_DA_CONSULTA} dias, que é a duração do contrato. Este pedido tem ${brutos.length}. Escolha menos dias.`,
        'dias',
      ),
    );
  }

  const validados: DiaPuro[] = [];
  for (const item of brutos) {
    if (typeof item !== 'string') {
      return erro(
        erroDeEntrada(
          CODIGO_ERRO.DIA_INVALIDO,
          'Cada dia precisa vir como texto no formato AAAA-MM-DD.',
          'dias',
        ),
      );
    }
    const dia = criaDiaPuro(item.trim());
    if (!dia.ok) return erro(erroDeEntrada(dia.erro.codigo, dia.erro.mensagem, 'dias'));
    validados.push(dia.valor);
  }

  // `AAAA-MM-DD` ordena como string exatamente como ordena no calendário, o que
  // é o motivo de `DiaPuro` ser esse formato e não um `Date`.
  const dias = [...new Set<DiaPuro>(validados)].sort((a, b) => a.localeCompare(b));

  // Rede: `min(1)` já barrou o vazio, e a normalização nunca esvazia um
  // conjunto não vazio. Se um dia esvaziar, o pedido é recusado, não montado.
  const primeiro = dias[0];
  if (primeiro === undefined) {
    return erro(
      erroDeEntrada(
        CODIGO_ERRO.CAMPO_OBRIGATORIO,
        'Escolha ao menos um dia para o relatório do período.',
        'dias',
      ),
    );
  }

  return ok({ obraId: idConfiavel<'obra'>(lido.data.obraId), dias });
}
