/**
 * Portas de que o módulo `lancamento` precisa — e que ele NÃO implementa.
 *
 * docs/arquitetura/v1.md, 4.1: "o módulo consumidor declara a porta de que
 * precisa (um tipo de função). O módulo produtor exporta uma função com a mesma
 * forma, escrita contra `shared`, sem saber que a porta existe. A tipagem
 * estrutural do TypeScript faz a conferência."
 *
 * Tudo aqui é do domínio da **frente A** (`acesso`, `obra`, `taxonomia`).
 * Nenhuma linha deste módulo importa daqueles; a ligação acontece em
 * `src/app/_composicao/`. Enquanto A não entrega, o módulo roda contra as
 * duplas de `teste/duplas.ts`.
 */

import type { DiaPuro } from '../../shared/date/dia';
import type { Quantidade } from '../../shared/decimal';
import type { ErroDeAcesso, Result } from '../../shared/result';
import type { ObraId, ServicoControladoId, StatusAtividadeId } from '../../shared/id';
import type { Ator, AtorNaObra } from './tipos';

/**
 * Ações protegidas que este módulo pede a `acesso`.
 *
 * A frente A precisa aceitar estes quatro nomes. Se o vocabulário dela for
 * outro, a mudança é em `docs/arquitetura/v1.md` primeiro, e depois aqui.
 */
export type AcaoProtegida =
  'lancar' | 'corrigir_lancamento' | 'fechar_dia' | 'retificar_lancamento';

/**
 * Verificação de perfil, em TODA requisição, sem cache (arquitetura 5.2).
 *
 * Obra inexistente e obra sem acesso devolvem o MESMO erro, para não revelar
 * existência.
 */
export type ExigeAcessoNaObra = (
  ator: Ator,
  obraId: ObraId,
  acao: AcaoProtegida,
) => Promise<Result<AtorNaObra, ErroDeAcesso>>;

/** Período contratual da obra. Base das validações 13.1 e do número do RDO. */
export interface PeriodoDaObra {
  readonly dataInicio: DiaPuro;
  readonly dataTermino: DiaPuro;
}

export type ObtemPeriodoDaObra = (obraId: ObraId) => Promise<PeriodoDaObra | null>;

export interface StatusDeAtividade {
  readonly id: StatusAtividadeId;
  /** Grafia oficial do cadastro. Exibida como está, erros herdados inclusive. */
  readonly termo: string;
}

/**
 * Taxonomia de status.
 *
 * `porTermo` compara sem diferenciar caixa e sem os espaços das pontas (R13,
 * caso obrigatório 13) e **nunca cria termo novo**: lançamento que cria termo
 * por efeito colateral é como a lista de status ganha gêmeos (CT-101).
 */
export interface PortaDeStatusDeAtividade {
  porId(id: StatusAtividadeId): Promise<StatusDeAtividade | null>;
  porTermo(termo: string): Promise<StatusDeAtividade | null>;
  /** Lista de escolha da tela: status é escolhido de lista, nunca digitado. */
  ativos(): Promise<readonly StatusDeAtividade[]>;
}

export interface ServicoControlado {
  readonly id: ServicoControladoId;
  readonly obraId: ObraId;
  readonly nome: string;
  /** Quantidade de projeto vigente; nula quando nunca foi definida. */
  readonly quantidadeProjeto: Quantidade | null;
}

/**
 * Serviços controlados da obra.
 *
 * `porNome` existe para o caso obrigatório do serviço inexistente: espaço
 * INTERNO não é espaço nas pontas, e a normalização do R13 não pode
 * transformar `REC. (FRESA+CAPA)` em `REC.(FRESA+CAPA)` (CT-125).
 */
export interface PortaDeServicosControlados {
  porId(obraId: ObraId, id: ServicoControladoId): Promise<ServicoControlado | null>;
  porNome(obraId: ObraId, nome: string): Promise<ServicoControlado | null>;
  /** Os quatro serviços controlados da obra, na ordem fixa do bloco 7. */
  daObra(obraId: ObraId): Promise<readonly ServicoControlado[]>;
}

/** As 8 sugestões tocáveis do motivo de parada. NÃO é lista fechada (20.1). */
export type ListaSugestoesDeMotivo = () => Promise<readonly string[]>;

export interface PortasDoLancamento {
  readonly exigeAcessoNaObra: ExigeAcessoNaObra;
  readonly periodoDaObra: ObtemPeriodoDaObra;
  readonly status: PortaDeStatusDeAtividade;
  readonly servicos: PortaDeServicosControlados;
  readonly sugestoesDeMotivo: ListaSugestoesDeMotivo;
}
