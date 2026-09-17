/**
 * Cenário sintético do passo 1 do PRD, para os testes das frentes de cadastro.
 *
 * Os valores são os do cenário "obra criada com os campos do cabeçalho do RDO"
 * (PRD, F1.1) porque são os que o gabarito imprime. **Nenhum nome de pessoa é
 * real:** "E1", "C1", "P1" são os rótulos do próprio PRD.
 */

import { and, eq, isNull } from 'drizzle-orm';

import type { AmbienteDeCadastro } from '../../src/app/_composicao/ambiente-de-cadastro';
import { criaObraProtegida } from '../../src/app/_composicao/cadastro';
import type { ConexaoRdo } from '../../src/db';
import { acesso } from '../../src/db/schema';
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
  // Decisão 32.1, de 16/09/2026: os três campos do bloco 11 são obrigatórios
  // para criar a obra. "R1" é rótulo do próprio PRD, não nome de pessoa.
  respTecnicoNome: 'R1',
  respTecnicoTitulo: 'Engenheiro Civil',
  respTecnicoCrea: 'CREA - MG 000000/D',
  periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-28' }],
} as const;

export interface Cenario {
  readonly conexao: ConexaoRdo;
  readonly amb: AmbienteDeCadastro;
  fecha(): Promise<void>;
  /** Conta comum: a que nasce na web. Não cria obra (decisão 25.1). */
  novoAtor(email: string): Promise<Ator>;
  /**
   * Conta de engenheiro, como a que `npm run criar-engenheiro` fabrica: a
   * coluna `usuario.e_engenheiro` ligada. É quem cria obra.
   */
  novoEngenheiro(email: string): Promise<Ator>;
  /**
   * Conta comum já liberada como encarregado na obra.
   *
   * A linha de `acesso` é gravada direto na tabela, **sem passar pelo módulo
   * `acesso`**: o que estes casos provam é o que o servidor faz com quem TEM o
   * perfil, e um defeito na liberação não pode ser o motivo de o teste passar.
   * O convite tem teste próprio.
   */
  novoEncarregado(email: string, obraId: ObraId): Promise<Ator>;
}

export async function montaCenario(instante: string = AGORA): Promise<Cenario> {
  const conexao = await criaBancoDeTeste();
  const amb: AmbienteDeCadastro = { db: conexao.db, relogio: relogioFixo(instante) };

  async function novoAtor(email: string): Promise<Ator> {
    const usuarioId = await insereUsuario(conexao, `Pessoa ${email}`, email);
    return { usuarioId, sessaoId: geraId<'sessao'>() };
  }

  /**
   * Quem libera é o engenheiro ativo da obra, e não um id inventado: a coluna
   * `liberado_por` tem chave estrangeira para `usuario`, e um id solto faria a
   * montagem do cenário morrer com erro de integridade em vez de erro de regra.
   */
  async function engenheiroDaObra(obraId: ObraId): Promise<UsuarioId> {
    const linhas = await conexao.db
      .select({ usuarioId: acesso.usuarioId })
      .from(acesso)
      .where(
        and(
          eq(acesso.obraId, obraId),
          eq(acesso.perfil, 'engenheiro'),
          isNull(acesso.revogadoEm),
        ),
      )
      .limit(1);

    const primeiro = linhas[0];
    if (primeiro === undefined) {
      throw new Error('A obra do cenário não tem engenheiro ativo para liberar acesso.');
    }
    return primeiro.usuarioId;
  }

  return {
    conexao,
    amb,
    fecha: () => conexao.fecha(),
    novoAtor,
    async novoEngenheiro(email: string): Promise<Ator> {
      const usuarioId = await insereUsuario(conexao, `Pessoa ${email}`, email, {
        eEngenheiro: true,
      });
      return { usuarioId, sessaoId: geraId<'sessao'>() };
    },
    async novoEncarregado(email: string, obraId: ObraId): Promise<Ator> {
      const ator = await novoAtor(email);
      await conexao.db.insert(acesso).values({
        id: geraId<'acesso'>(),
        obraId,
        usuarioId: ator.usuarioId,
        perfil: 'encarregado',
        liberadoPor: await engenheiroDaObra(obraId),
        liberadoEm: instante,
      });
      return ator;
    },
  };
}

/** Cria a obra do PRD e devolve o id. Falha alto se o cadastro for recusado. */
export async function criaObraDoPrd(
  ator: Ator,
  amb: AmbienteDeCadastro,
  ajustes: Partial<Record<string, unknown>> = {},
): Promise<ObraId> {
  const resultado = await criaObraProtegida(ator, { ...DADOS_DA_OBRA, ...ajustes }, amb);
  if (!resultado.ok) {
    throw new Error(`A montagem do cenário falhou: ${resultado.erro.mensagem}`);
  }
  return resultado.valor;
}

export type { UsuarioId };
