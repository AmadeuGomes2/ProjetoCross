/**
 * Cenário sintético do passo 1 do PRD, para os testes das frentes de cadastro.
 *
 * Os valores são os do cenário "obra criada com os campos do cabeçalho do RDO"
 * (PRD, F1.1) porque são os que o gabarito imprime. **Nenhum nome de pessoa é
 * real:** "E1", "C1", "P1" são os rótulos do próprio PRD.
 */

import type { AmbienteDeCadastro } from '../../src/app/_composicao/ambiente-de-cadastro';
import { criaObraProtegida } from '../../src/app/_composicao/cadastro';
import type { ConexaoRdo } from '../../src/db';
import type { Ator } from '../../src/modules/acesso';
import { geraId, type ObraId, type UsuarioId } from '../../src/shared/id';
import { criaBancoDeTeste, insereUsuario, relogioFixo } from './banco-de-teste';

/** Instante de referência de todo teste de cadastro. Relógio parado. */
export const AGORA = '2026-09-16T12:00:00.000Z';

export const DADOS_DA_OBRA = {
  contrato: 'P0476/01-25 - BLOCO 02',
  contratante: 'PREFEITURA MUNICIPAL DE MONTES CLAROS - MG',
  contratada: 'CROS CONSTRUÇÕES S.A.',
  dataInicio: '2026-02-05',
  dataTermino: '2027-02-05',
  escopo: 'EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO',
  // Os espaços duplos no meio existem no original e são reproduzidos
  // (decisão 17.1 normaliza só as pontas).
  nomeProjeto: 'SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02',
  area: 'MONTES CLAROS - MG',
  local: 'VIAS URBANAS  DA CIDADE MONTES CLAROS - MG',
  periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
} as const;

export interface Cenario {
  readonly conexao: ConexaoRdo;
  readonly amb: AmbienteDeCadastro;
  fecha(): void;
  novoAtor(email: string): Ator;
}

export function montaCenario(instante: string = AGORA): Cenario {
  const conexao = criaBancoDeTeste();
  const amb: AmbienteDeCadastro = { db: conexao.db, relogio: relogioFixo(instante) };

  return {
    conexao,
    amb,
    fecha: () => conexao.fecha(),
    novoAtor(email: string): Ator {
      const usuarioId = insereUsuario(conexao, `Pessoa ${email}`, email);
      return { usuarioId, sessaoId: geraId<'sessao'>() };
    },
  };
}

/** Cria a obra do PRD e devolve o id. Falha alto se o cadastro for recusado. */
export function criaObraDoPrd(
  ator: Ator,
  amb: AmbienteDeCadastro,
  ajustes: Partial<Record<string, unknown>> = {},
): ObraId {
  const resultado = criaObraProtegida(ator, { ...DADOS_DA_OBRA, ...ajustes }, amb);
  if (!resultado.ok) {
    throw new Error(`A montagem do cenário falhou: ${resultado.erro.mensagem}`);
  }
  return resultado.valor;
}

export type { UsuarioId };
