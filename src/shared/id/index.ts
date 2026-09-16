/**
 * Identificadores com tipo de marca.
 *
 * Sem isto, `pessoaId` e `obraId` são o mesmo tipo e trocá-los de posição numa
 * chamada compila. Com marca, o compilador recusa.
 *
 * Também é por aqui que se cumpre "identifique por id, nunca por nome"
 * (CLAUDE.md, Segurança): quando a assinatura pede `PessoaId`, passar o nome
 * não compila.
 */

declare const marca: unique symbol;

type Marcado<N extends string> = string & { readonly [marca]: N };

export type ObraId = Marcado<'obra'>;
export type PeriodoBmsId = Marcado<'periodo_bms'>;
export type UsuarioId = Marcado<'usuario'>;
export type AcessoId = Marcado<'acesso'>;
export type ConviteId = Marcado<'convite'>;
export type SessaoId = Marcado<'sessao'>;
export type PessoaId = Marcado<'pessoa'>;
export type PassagemPessoaId = Marcado<'passagem_pessoa'>;
export type EquipamentoId = Marcado<'equipamento'>;
export type PassagemEquipamentoId = Marcado<'passagem_equipamento'>;
export type ServicoControladoId = Marcado<'servico_controlado'>;
export type DiaDeObraId = Marcado<'dia_de_obra'>;
export type LancamentoId = Marcado<'lancamento'>;
export type FuncaoId = Marcado<'funcao'>;
export type TipoEquipamentoId = Marcado<'tipo_equipamento'>;
export type StatusAtividadeId = Marcado<'status_atividade'>;
export type SugestaoMotivoId = Marcado<'sugestao_motivo_parada'>;
export type QuantidadeProjetoVersaoId = Marcado<'quantidade_projeto_versao'>;
export type RegistroExportacaoId = Marcado<'registro_exportacao'>;

/** Identificador de correlação de um erro, para ligar mensagem e log. */
export type CorrelacaoId = Marcado<'correlacao'>;

/**
 * UUID v4. Não sequencial, de propósito: id sequencial convida enumeração
 * (`/obra/2/...`). O controle de acesso do servidor é a defesa real, mas id não
 * adivinhável remove a classe inteira de tentativa.
 */
export function geraId<T extends string>(): Marcado<T> {
  return crypto.randomUUID() as Marcado<T>;
}

/** Para id vindo do banco, já gravado. Não use com entrada de usuário. */
export function idConfiavel<T extends string>(valor: string): Marcado<T> {
  return valor as Marcado<T>;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ehUuid(valor: string): boolean {
  return UUID_V4.test(valor);
}
