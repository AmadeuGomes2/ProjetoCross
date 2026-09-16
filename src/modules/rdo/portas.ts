/**
 * As portas do módulo `rdo`.
 *
 * docs/arquitetura/v1.md, 4.7: "`rdo` — só cálculo, nenhum banco". O módulo não
 * importa de outro módulo e não lê tabela. Ele declara aqui o **tipo de função**
 * de que precisa; quem produz o dado (frentes A e B) exporta uma função com a
 * mesma forma, sem saber que esta porta existe. A tipagem estrutural do
 * TypeScript faz a conferência, e a ligação acontece em `src/app/_composicao/`.
 *
 * Duas notas sobre o que estes tipos NÃO têm, e é de propósito:
 *
 * 1. **Nenhum campo de nome de trabalhador.** `PessoaMobilizada` tem `pessoaId`
 *    e `funcaoId`; o nome não chega ao `rdo` e por isso não pode vazar para a
 *    tela nem para o PDF (CLAUDE.md, Segurança; caso CT-189, CT-251).
 * 2. **Nenhum campo de autor de lançamento.** A autoria é visível só ao
 *    engenheiro, numa consulta própria (decisão 14.0, caso CT-234). O RDO
 *    identifica o lançamento por id, o que basta para a rastreabilidade.
 *
 * Divergência consciente de `docs/arquitetura/v1.md:733-734`, que previa as
 * portas `efetivoPessoal` e `efetivoEquipamento` já agregadas: aqui o `rdo`
 * recebe a **mobilização** (passagens) e aplica ele mesmo `intervaloCobreODia`.
 * A regra de contagem é do RDO (decisão 5.1 zera em dia parado, e o caso
 * obrigatório 8 conta a pessoa uma vez com duas passagens), e assim ela fica
 * testável sem banco, num lugar só.
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { Quantidade } from '../../shared/decimal';
import type {
  EquipamentoId,
  FuncaoId,
  LancamentoId,
  ObraId,
  PessoaId,
  ServicoControladoId,
} from '../../shared/id';
import type { ErroDeDominio, Result } from '../../shared/result';
import type { EstadoDoDia, LetraDeTurno } from '../../shared/taxonomia';

/** Bloco 11 do gabarito. Nome, titulação e CREA moram na obra (decisão 18.1). */
export interface ResponsavelTecnico {
  readonly nome: string;
  readonly titulo: string;
  readonly registro: string;
}

/** Blocos 3, 4 e 11 do gabarito. Igual em todos os dias: é leitura do cadastro. */
export interface CabecalhoDaObra {
  readonly obraId: ObraId;
  readonly contrato: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly escopo: string;
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
  readonly nomeProjeto: string;
  readonly area: string;
  readonly local: string;
  /** Opcional no cadastro; ver P7 de docs/arquitetura/v1.md. Ausente vira aviso. */
  readonly responsavelTecnico: ResponsavelTecnico | null;
}

/**
 * Uma passagem pela obra. Saída nula é "ainda na obra".
 *
 * A saída é o ÚLTIMO DIA TRABALHADO (decisão 1.1), e quem sabe disso é
 * `intervaloCobreODia`, em `shared/date/`. Aqui é só transporte.
 */
export interface Passagem {
  readonly entrada: DiaPuro;
  readonly saida: DiaPuro | null;
}

/** Uma coluna do bloco 5. Existe mesmo quando ninguém daquela função está na obra. */
export interface FuncaoParaEfetivo {
  readonly funcaoId: FuncaoId;
  readonly termo: string;
  readonly ordem: number;
}

export interface PessoaMobilizada {
  readonly pessoaId: PessoaId;
  readonly funcaoId: FuncaoId;
  readonly passagens: readonly Passagem[];
}

/** Bloco 6 agrega por identificador, não por tipo. Duas granularidades, de propósito. */
export interface EquipamentoMobilizado {
  readonly equipamentoId: EquipamentoId;
  readonly identificador: string;
  readonly ordem: number;
  readonly passagens: readonly Passagem[];
}

export interface ServicoControladoComProjeto {
  readonly servicoId: ServicoControladoId;
  readonly nome: string;
  readonly ordem: number;
  readonly quantidadeDeProjeto: Quantidade;
}

/**
 * Um lançamento de produção já vigente (retificação resolvida pela frente B).
 *
 * A porta entrega os lançamentos até o dia, inclusive, e o `rdo` soma. É assim
 * que o acumulado é recalculado do zero em toda consulta (R5) e que todo número
 * do bloco 7 leva de volta ao lançamento que o compôs (CT-232).
 */
export interface LancamentoDeProducao {
  readonly lancamentoId: LancamentoId;
  readonly servicoId: ServicoControladoId;
  readonly data: DiaPuro;
  readonly quantidade: Quantidade;
}

export interface AtividadeDoDia {
  readonly lancamentoId: LancamentoId;
  readonly descricao: string;
  /** Grafia exata do cadastro de status. Vazio não existe: R21 exige status. */
  readonly status: string;
}

export interface PluviometriaDoDia {
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  readonly indiceMm: Quantidade;
}

export interface ObservacaoDoDia {
  readonly lancamentoId: LancamentoId;
  readonly texto: string;
}

/**
 * O estado do dia. Ausência de registro (`null` na porta) é o terceiro estado,
 * `não lançado`, que não é `parado` (decisão 4.2).
 */
export interface DiaDeObra {
  readonly estado: EstadoDoDia;
  readonly motivoParada: string | null;
  /** Gravado no fechamento e nunca mais alterado (decisão 6.2). */
  readonly numeroRdoCongelado: number | null;
  readonly eDiaFechado: boolean;
}

export interface PortasDoRdo {
  readonly cabecalho: (obraId: ObraId) => Promise<Result<CabecalhoDaObra, ErroDeDominio>>;
  /** `null` sem erro quando nenhum período cobre a data (decisão 21.1). */
  readonly bms: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<number | null, ErroDeDominio>>;
  readonly dia: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<DiaDeObra | null, ErroDeDominio>>;
  readonly funcoes: (
    obraId: ObraId,
  ) => Promise<Result<readonly FuncaoParaEfetivo[], ErroDeDominio>>;
  readonly pessoalMobilizado: (
    obraId: ObraId,
  ) => Promise<Result<readonly PessoaMobilizada[], ErroDeDominio>>;
  readonly equipamentosMobilizados: (
    obraId: ObraId,
  ) => Promise<Result<readonly EquipamentoMobilizado[], ErroDeDominio>>;
  readonly servicos: (
    obraId: ObraId,
  ) => Promise<Result<readonly ServicoControladoComProjeto[], ErroDeDominio>>;
  readonly lancamentosDeProducaoAte: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<readonly LancamentoDeProducao[], ErroDeDominio>>;
  readonly atividades: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<readonly AtividadeDoDia[], ErroDeDominio>>;
  readonly pluviometria: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<PluviometriaDoDia | null, ErroDeDominio>>;
  /**
   * Só o lado CROS existe na v1: `COMENTÁRIO CONTRATANTE` sai sempre vazio
   * (decisão 10.1). Cada bloco lê a SUA fonte — o defeito C10 da planilha, em
   * que o rótulo diz CROS e a fórmula lê a aba do contratante, não se herda.
   */
  readonly observacoesCros: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<readonly ObservacaoDoDia[], ErroDeDominio>>;
}
