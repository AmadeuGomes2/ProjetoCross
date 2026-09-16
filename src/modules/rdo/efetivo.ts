/**
 * Efetivo de pessoal (bloco 5) e de equipamento (bloco 6).
 *
 * Duas granularidades diferentes, de propósito (R2): pessoal agrega por
 * **função**, equipamento agrega por **identificador**.
 *
 * A regra de quem está na obra no dia é UMA só, e mora em
 * `shared/date/intervalo.ts`: `entrada <= D` e (`saída` nula ou `saída >= D`).
 * Decisão 1.1 para pessoa, 1.2 para equipamento. Aqui ela não é reescrita.
 *
 * A contagem é por **pessoa**, não por passagem: quem sai e volta tem duas
 * passagens e continua sendo uma pessoa (R3, caso obrigatório 8). Contar linhas
 * de cadastro daria dois.
 *
 * Decisão 5.1: o efetivo é o **mobilizado** e sai **zerado quando o dia está
 * parado**. Zerar aqui, e não no cadastro, é o que mantém `pessoal` e
 * `equipamento` sem conhecer o estado do dia.
 *
 * Gabarito, bloco 5: quantidade zero é exibida **em branco**, não como `0`. O
 * `texto` de cada coluna carrega essa convenção para a tela e para o PDF ao
 * mesmo tempo, para que os dois não divirjam.
 */

import type { DiaPuro } from '../../shared/date/dia';
import { algumaPassagemCobreODia } from '../../shared/date/intervalo';
import type {
  EquipamentoMobilizado,
  FuncaoParaEfetivo,
  PessoaMobilizada,
} from './portas';

export interface ColunaDeEfetivo {
  /** Id do cadastro, para a chave de renderização. Nunca um nome. */
  readonly chave: string;
  readonly rotulo: string;
  readonly quantidade: number;
  /** Vazio quando a quantidade é zero: o gabarito mostra célula em branco. */
  readonly texto: string;
}

export interface BlocoDeEfetivo {
  readonly colunas: readonly ColunaDeEfetivo[];
  readonly total: number;
}

function coluna(chave: string, rotulo: string, quantidade: number): ColunaDeEfetivo {
  return {
    chave,
    // Decisão 17.1: espaço no fim de texto fixo é resto de digitação, não
    // vocabulário. O cadastro real tem funções como `Servente `.
    rotulo: rotulo.trim(),
    quantidade,
    texto: quantidade === 0 ? '' : String(quantidade),
  };
}

function montaBloco(colunas: readonly ColunaDeEfetivo[]): BlocoDeEfetivo {
  return {
    colunas,
    // O total soma TODAS as colunas, inclusive as que vão transbordar para a
    // segunda página (CT-265). Somar só o que coube na página 1 é o defeito
    // silencioso mais provável do transbordo.
    total: colunas.reduce((soma, c) => soma + c.quantidade, 0),
  };
}

export function calculaEfetivoPessoal(
  funcoes: readonly FuncaoParaEfetivo[],
  pessoas: readonly PessoaMobilizada[],
  dia: DiaPuro,
  eDiaParado: boolean,
): BlocoDeEfetivo {
  const naObra = eDiaParado
    ? []
    : pessoas.filter((p) => algumaPassagemCobreODia(p.passagens, dia));

  const porFuncao = new Map<string, Set<string>>();
  for (const pessoa of naObra) {
    const conjunto = porFuncao.get(pessoa.funcaoId) ?? new Set<string>();
    conjunto.add(pessoa.pessoaId);
    porFuncao.set(pessoa.funcaoId, conjunto);
  }

  const ordenadas = [...funcoes].sort((a, b) => a.ordem - b.ordem);
  return montaBloco(
    ordenadas.map((f) =>
      coluna(f.funcaoId, f.termo, porFuncao.get(f.funcaoId)?.size ?? 0),
    ),
  );
}

export function calculaEfetivoDeEquipamento(
  equipamentos: readonly EquipamentoMobilizado[],
  dia: DiaPuro,
  eDiaParado: boolean,
): BlocoDeEfetivo {
  const ordenados = [...equipamentos].sort((a, b) => a.ordem - b.ordem);
  return montaBloco(
    ordenados.map((e) =>
      coluna(
        e.equipamentoId,
        e.identificador,
        !eDiaParado && algumaPassagemCobreODia(e.passagens, dia) ? 1 : 0,
      ),
    ),
  );
}
