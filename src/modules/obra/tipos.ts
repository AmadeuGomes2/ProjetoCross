/**
 * Tipos do módulo `obra`: cabeçalho do documento, períodos de BMS e serviços
 * controlados.
 *
 * docs/arquitetura/v1.md, 4.3. Os blocos 3, 4 e 11 do RDO saem daqui, e
 * `data_inicio` é o zero do número do RDO (R4, decisão 6.1).
 */

import type { ComPortas } from '@/shared/contrato/ambiente';
import type { BancoRdo } from '../../db';
import type { DiaPuro } from '../../shared/date/dia';
import type { Instante } from '../../shared/date/fuso';
import type { Quantidade } from '../../shared/decimal';
import type {
  ObraId,
  PeriodoBmsId,
  ServicoControladoId,
  UsuarioId,
} from '../../shared/id';

/**
 * Porta que `obra` declara e `acesso` preenche.
 *
 * Módulo não importa de módulo (arquitetura, 4.1): a ligação acontece em
 * `src/app/_composicao/`. Recebe o banco porque a concessão precisa correr na
 * **mesma transação** da criação da obra — CT-003 diz que quem cria a obra sai
 * dela com acesso de engenheiro, e meia gravação deixaria a obra inacessível.
 */
export type ConcedeAcessoDeEngenheiro = (
  db: BancoRdo,
  obraId: ObraId,
  usuarioId: UsuarioId,
  em: Instante,
) => void;

export type Ambiente = ComPortas<{
  concedeAcessoDeEngenheiro: ConcedeAcessoDeEngenheiro;
}>;

/**
 * O mínimo que este módulo precisa saber de quem age.
 *
 * `AtorNaObra` de `acesso` satisfaz isto por forma, sem que `obra` precise
 * importar o outro módulo. Quem chama já passou por `exigeAcessoNaObra`.
 */
export interface AtorDaObra {
  readonly usuarioId: UsuarioId;
}

export interface ResponsavelTecnico {
  /** **Dado pessoal.** Bloco 11, e só ele. Mora na Obra (decisão 18.1). */
  readonly nome: string;
  readonly titulo: string;
  readonly crea: string;
}

/** Um período de BMS a cadastrar. `numero` é digitado pelo engenheiro (7.1). */
export interface PeriodoBmsNovo {
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
}

/**
 * Os nove campos do cabeçalho mais o responsável técnico.
 *
 * `contrato` é **um campo só** (decisão 8.1): a planilha tem três
 * identificações da mesma obra em lugares diferentes, e não existe campo de
 * código interno (CT-004).
 *
 * `periodosBms` tem ao menos um elemento: cadastrar período é obrigatório ao
 * criar a obra (decisão 21.1). Obra sem período nenhum imprimiria `BM'S` vazio
 * desde o primeiro dia.
 */
export interface ComandoCriarObra {
  readonly contrato: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
  readonly escopo: string;
  readonly nomeProjeto: string;
  readonly area: string;
  readonly local: string;
  /** Opcional no cadastro, exigido na exportação (arquitetura, pergunta P7). */
  readonly respTecnico?: ResponsavelTecnico;
  readonly periodosBms: readonly PeriodoBmsNovo[];
}

export interface ComandoEditarObra {
  readonly obraId: ObraId;
  readonly contrato: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
  readonly escopo: string;
  readonly nomeProjeto: string;
  readonly area: string;
  readonly local: string;
}

export interface CabecalhoDaObra {
  readonly obraId: ObraId;
  readonly contrato: string;
  readonly contratante: string;
  readonly contratada: string;
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
  readonly escopo: string;
  readonly nomeProjeto: string;
  readonly area: string;
  readonly local: string;
  /** Nulo enquanto não informado; o bloco 11 sai incompleto e a tela avisa. */
  readonly respTecnico: ResponsavelTecnico | null;
}

export interface PeriodoBms {
  readonly id: PeriodoBmsId;
  readonly numero: number;
  readonly dataInicial: DiaPuro;
  readonly dataFinal: DiaPuro;
  /** `final − inicial + 1` (regras-extraidas §10). Derivado, nunca gravado. */
  readonly dias: number;
}

export interface ServicoControladoComProjeto {
  readonly servicoId: ServicoControladoId;
  /** Grafia exata: `REC.(FRESA+CAPA)`. É o rótulo do bloco 7. */
  readonly nome: string;
  readonly ordem: number;
  /** Nulo enquanto ninguém definiu. O percentual não é calculável ainda. */
  readonly quantidadeDeProjeto: Quantidade | null;
}

export interface VersaoDeQuantidade {
  readonly quantidade: Quantidade;
  /** Id, nunca nome (CLAUDE.md, Segurança). */
  readonly definidoPor: UsuarioId;
  readonly definidoEm: Instante;
}
