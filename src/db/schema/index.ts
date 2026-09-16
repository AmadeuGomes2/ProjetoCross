/**
 * Esquema físico da v1: 22 tabelas.
 *
 * Fonte única: docs/arquitetura/v1.md, seções 1 e 2. Este arquivo é o ponto de
 * entrada do Drizzle e do `drizzle-kit`; `src/db/migrations/` é gerado a partir
 * daqui e é o que roda em produção.
 *
 * `src/db/schema/**` e `src/db/migrations/**` são compartilhados: mexer exige
 * perguntar antes (CLAUDE.md, Trabalho em paralelo). Cada módulo lê **só** as
 * tabelas que possui, por seu próprio `repositorio.ts`.
 *
 * O que **não** existe aqui, de propósito (arquitetura, "O que não existe"):
 * tabela de RDO diário, semanal ou mensal; coluna de acumulado, de percentual,
 * de total de efetivo, de resumo do dia, de dia da semana ou de número de BMS;
 * tabela de rascunho no servidor; tabela de presença diária; tabela de fiscal;
 * `condicao_tempo`, em nenhuma forma.
 */

export { usuario, colunaAutor, colunaAutorOpcional } from './usuario';
export { obra, periodoBms } from './obra';
export { acesso, convite, sessao, type Perfil } from './acesso';
export {
  funcao,
  tipoEquipamento,
  statusAtividade,
  sugestaoMotivoParada,
} from './taxonomia';
export { pessoa, passagemPessoa } from './pessoal';
export { equipamento, passagemEquipamento } from './equipamento';
export { servicoControlado, quantidadeProjetoVersao } from './servico';
export { diaDeObra } from './dia-de-obra';
export {
  lancamentoAtividade,
  lancamentoProducao,
  lancamentoPluviometria,
  lancamentoObservacao,
} from './lancamento';
export { registroExportacao } from './exportacao';
