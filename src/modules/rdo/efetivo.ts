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
 * A **função vem da passagem que cobre o dia**, nunca do cadastro da pessoa
 * (decisão 29.1). É o que faz o efetivo impresso refletir o que era verdade
 * naquele dia: trocar de função encerra a passagem e abre outra, e o RDO de
 * março não muda quando o Motorista vira Operador II em setembro.
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
import { algumaPassagemCobreODia, intervaloCobreODia } from '../../shared/date/intervalo';
import type { FuncaoId } from '../../shared/id';
import type {
  EquipamentoMobilizado,
  FuncaoParaEfetivo,
  PassagemDePessoa,
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

/**
 * A função da pessoa **no dia**, lida da passagem que cobre o dia (29.1).
 *
 * Devolve uma função só, mesmo se duas passagens cobrirem o mesmo dia. O
 * cadastro rejeita passagens sobrepostas da mesma pessoa (`registraPassagem` e
 * `trocaFuncao` usam `conflitaComAlgum`), então o caso não nasce pelo caminho
 * normal; se nascer, vale a passagem que **começou depois**, que é a notícia
 * mais recente sobre aquela pessoa.
 *
 * O que não se admite é contar duas vezes: o `TOTAL` do bloco 5 é o número de
 * pessoas mobilizadas, e é a primeira coisa que o fiscal confere.
 */
function funcaoNoDia(
  passagens: readonly PassagemDePessoa[],
  dia: DiaPuro,
): FuncaoId | null {
  let vigente: PassagemDePessoa | null = null;
  for (const passagem of passagens) {
    if (!intervaloCobreODia(passagem.entrada, passagem.saida, dia)) continue;
    if (vigente === null || passagem.entrada > vigente.entrada) vigente = passagem;
  }
  return vigente === null ? null : vigente.funcaoId;
}

export function calculaEfetivoPessoal(
  funcoes: readonly FuncaoParaEfetivo[],
  pessoas: readonly PessoaMobilizada[],
  dia: DiaPuro,
  eDiaParado: boolean,
): BlocoDeEfetivo {
  const porFuncao = new Map<string, Set<string>>();
  if (!eDiaParado) {
    for (const pessoa of pessoas) {
      const funcaoId = funcaoNoDia(pessoa.passagens, dia);
      if (funcaoId === null) continue;
      const conjunto = porFuncao.get(funcaoId) ?? new Set<string>();
      conjunto.add(pessoa.pessoaId);
      porFuncao.set(funcaoId, conjunto);
    }
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
