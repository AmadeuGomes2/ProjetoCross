/**
 * Tipos do módulo `lancamento` — o coração da inversão central.
 *
 * CLAUDE.md, Modelo: "Lançamento é atômico. Uma atividade, uma medição de
 * produção, uma leitura de pluviômetro, uma observação. Cada um com data a que
 * se refere, autor e hora de registro."
 *
 * Os três campos são DIFERENTES de propósito:
 *  - `data` é dia puro da obra, escolhido por quem lança;
 *  - `autorId` é quem lançou;
 *  - `registradoEm` é o instante do SERVIDOR, metadado de auditoria.
 * Juntar data e hora num campo só é como o fuso vaza para a data e o dia
 * inteiro anda para a frente (caso de teste obrigatório 15).
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type { Quantidade } from '../../shared/decimal';
import type {
  LancamentoId,
  ObraId,
  ServicoControladoId,
  StatusAtividadeId,
  UsuarioId,
} from '../../shared/id';
import type { EstadoDoDia, LetraDeTurno } from '../../shared/taxonomia';

/** Perfil na obra. Fronteira de confiança, verificada no servidor. */
export type Perfil = 'engenheiro' | 'encarregado';

/** Quem fez a requisição. Id, nunca nome (CLAUDE.md, Segurança). */
export interface Ator {
  readonly usuarioId: UsuarioId;
}

/** Ator já resolvido contra uma obra, devolvido por `exigeAcessoNaObra`. */
export interface AtorNaObra extends Ator {
  readonly obraId: ObraId;
  readonly perfil: Perfil;
}

/**
 * Estado do dia como a tela o vê (decisão 4.2). São TRÊS, e `nao_lancado` é a
 * AUSÊNCIA de registro: ninguém ter lançado é diferente de ter lançado que não
 * houve trabalho.
 */
export type EstadoNaTela = 'nao_lancado' | EstadoDoDia;

export interface DiaDeObra {
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly estado: EstadoDoDia;
  /** Texto livre obrigatório quando parado; nulo quando trabalhado (20.1). */
  readonly motivoParada: string | null;
  readonly registradoPor: UsuarioId;
  readonly registradoEm: Instante;
  readonly atualizadoPor: UsuarioId | null;
  readonly atualizadoEm: Instante | null;
  /** Nulo = dia aberto. Só o engenheiro fecha (9.1). */
  readonly fechadoPor: UsuarioId | null;
  readonly fechadoEm: Instante | null;
  /** Congelado no fechamento (6.2). Único valor derivado do RDO que se grava. */
  readonly numeroRdoCongelado: number | null;
}

/** Colunas que todo lançamento tem, nas quatro tabelas. */
export interface LinhaComum {
  readonly id: LancamentoId;
  readonly obraId: ObraId;
  readonly data: DiaPuro;
  readonly autorId: UsuarioId;
  readonly registradoEm: Instante;
  readonly atualizadoPor: UsuarioId | null;
  readonly atualizadoEm: Instante | null;
  /** Id da cadeia: no original, o próprio `id`. Gravado no insert, nunca muda. */
  readonly raizId: LancamentoId;
  /** Nulo no original. Preenchido só por retificação de dia fechado (22.1). */
  readonly retificaId: LancamentoId | null;
  /** Idempotência do envio offline: reenviar o mesmo rascunho não duplica. */
  readonly chaveDeRascunho: string | null;
}

export interface LinhaDeAtividade extends LinhaComum {
  readonly tipo: 'atividade';
  readonly descricao: string;
  readonly statusId: StatusAtividadeId;
}

export interface LinhaDeProducao extends LinhaComum {
  readonly tipo: 'producao';
  readonly servicoId: ServicoControladoId;
  readonly quantidade: Quantidade;
}

export interface LinhaDePluviometria extends LinhaComum {
  readonly tipo: 'pluviometria';
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  readonly indiceMm: Quantidade;
}

export interface LinhaDeObservacao extends LinhaComum {
  readonly tipo: 'observacao';
  /** Decisão 10.1: na v1 só existe o lado da contratada. */
  readonly lado: 'CROS';
  readonly texto: string;
}

export type LinhaDeLancamento =
  LinhaDeAtividade | LinhaDeProducao | LinhaDePluviometria | LinhaDeObservacao;

export type TipoDeLancamento = LinhaDeLancamento['tipo'];

/**
 * Atividade como o RDO a lê. **Não tem campo de autor**: o bloco 8 do documento
 * não mostra quem lançou, e o que não existe no tipo não vaza para o papel.
 */
export interface AtividadeDoDia {
  readonly id: LancamentoId;
  readonly data: DiaPuro;
  readonly descricao: string;
  readonly statusId: StatusAtividadeId;
  /** Grafia oficial do cadastro, erros herdados inclusive. */
  readonly statusTermo: string;
}

export interface PluviometriaDoDia {
  readonly id: LancamentoId;
  readonly data: DiaPuro;
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
  readonly indiceMm: Quantidade;
}

export interface ObservacaoDoDia {
  readonly id: LancamentoId;
  readonly data: DiaPuro;
  readonly lado: 'CROS';
  readonly texto: string;
}

export interface ProducaoPorServico {
  readonly servicoId: ServicoControladoId;
  readonly quantidade: Quantidade;
}

/**
 * Uma versão da cadeia de retificação. Carrega autoria, e por isso só o
 * engenheiro a lê (14.0).
 */
export interface VersaoDeLancamento {
  readonly id: LancamentoId;
  readonly retificaId: LancamentoId | null;
  readonly autorId: UsuarioId;
  readonly registradoEm: Instante;
  readonly vigente: boolean;
  readonly conteudo: LinhaDeLancamento;
}

export type NumeroDoRdo = number;

/**
 * Aviso é resultado, não erro: o lançamento é aceito e o problema é dito
 * (decisão 12.1 e caso obrigatório 6). A planilha legada não avisava nada.
 */
export type CodigoDeAviso =
  'PRODUCAO_EM_DIA_PARADO' | 'PRODUCAO_SEM_ATIVIDADE' | 'ACUMULADO_ACIMA_DO_PROJETO';

export interface AvisoDeLancamento {
  readonly codigo: CodigoDeAviso;
  readonly mensagem: string;
}

export interface LancamentoAceito {
  readonly id: LancamentoId;
  readonly avisos: readonly AvisoDeLancamento[];
}

/**
 * O que a tela do dia recebe ao abrir (decisão 15.1).
 *
 * Pré-preenchimento é SUGESTÃO DE TELA, nunca lançamento: nada é gravado até
 * o encarregado confirmar. Gravar ao abrir recriaria as 31 abas preenchidas
 * por antecipação da planilha.
 */
export interface PreenchimentoInicial {
  readonly data: DiaPuro;
  readonly estadoNaTela: EstadoNaTela;
  /** Estado do dia anterior, para confirmar em vez de digitar. */
  readonly estadoSugerido: EstadoDoDia | null;
  readonly turnosSugeridos: {
    readonly noiteAnterior: LetraDeTurno | null;
    readonly manha: LetraDeTurno | null;
    readonly tarde: LetraDeTurno | null;
  } | null;
  /**
   * Sempre vazio: o índice é medição, não hábito. Herdado, entraria 4 mm num
   * dia seco e o resumo do dia sairia errado (CT-162).
   */
  readonly indiceMm: null;
  /**
   * Sempre vazio: atividade não se repete. Confirmar sem ler produziria
   * atividade repetida e falsa (CT-161).
   */
  readonly atividadesSugeridas: readonly [];
  readonly eDiaFechado: boolean;
}
