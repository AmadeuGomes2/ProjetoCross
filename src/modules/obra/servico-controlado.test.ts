/**
 * CT-050 a CT-059 — Serviço controlado e quantidade de projeto
 * (`docs/qa/v1-casos-passos-1-3.md`, F2.3).
 *
 * Origem das expectativas: PRD, Funcionalidade 2.3 e decisões 13.4 e 19.1;
 * R5, R6 e R15. O valor 2210,392 é o valor real do arquivo e está no CT-050;
 * 0,001 é a fronteira do "maior que zero" do CT-056.
 *
 * CT-053 ("o percentual de qualquer RDO passa a usar 2500,000") é montagem de
 * RDO e pertence à frente C. O que se prova aqui é que a **vigente** é a última
 * versão e que não existe cópia dela no serviço — que é a causa do defeito.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';
import {
  defineQuantidadeDeProjetoProtegida,
  listaHistoricoDeQuantidadeProtegido,
  listaServicosProtegida,
} from '../../app/_composicao/cadastro';
import { acesso, servicoControlado } from '../../db/schema';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import {
  geraId,
  type ObraId,
  type ServicoControladoId,
  type UsuarioId,
} from '../../shared/id';
import { listaServicosControlados } from './servico-controlado';

const AGORA = '2026-09-16T12:00:00.000Z';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(async () => {
  cenario = await montaCenario();
  e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = await criaObraDoPrd(e1, cenario.amb);
});

afterEach(async () => {
  await cenario.fecha();
});

async function idDoServico(nome: string): Promise<ServicoControladoId> {
  const lista = await listaServicosControlados(obraId, paraObra(cenario.amb));
  if (!lista.ok) throw new Error('não foi possível listar os serviços');
  const servico = lista.valor.find((s) => s.nome === nome);
  if (servico === undefined) throw new Error(`serviço ausente: ${nome}`);
  return servico.servicoId;
}

async function quantidadeVigente(nome: string): Promise<string | null> {
  const lista = await listaServicosControlados(obraId, paraObra(cenario.amb));
  if (!lista.ok) throw new Error('não foi possível listar os serviços');
  const servico = lista.valor.find((s) => s.nome === nome);
  return servico?.quantidadeDeProjeto?.toString() ?? null;
}

/** Acesso de encarregado gravado direto na tabela, sem passar pelo módulo. */
async function liberaEncarregado(usuarioId: UsuarioId): Promise<void> {
  await cenario.conexao.db.insert(acesso).values({
    id: geraId<'acesso'>(),
    obraId,
    usuarioId,
    perfil: 'encarregado',
    liberadoPor: e1.usuarioId,
    liberadoEm: AGORA,
  });
}

describe('F2.3 — serviço controlado e quantidade de projeto', () => {
  it('CT-050 guarda 2210,392 exatamente, sem arredondar', async () => {
    const definida = await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      await idDoServico('REC.(FRESA+CAPA)'),
      '2210,392',
      cenario.amb,
    );
    expect(definida.ok).toBe(true);
    expect(await quantidadeVigente('REC.(FRESA+CAPA)')).toBe('2210.392');
  });

  it('CT-051 registra quem definiu a quantidade e quando', async () => {
    const servicoId = await idDoServico('REC.(FRESA+CAPA)');
    await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      servicoId,
      '2210,392',
      cenario.amb,
    );

    const historico = await listaHistoricoDeQuantidadeProtegido(
      e1,
      obraId,
      servicoId,
      cenario.amb,
    );
    expect(historico.ok).toBe(true);
    if (!historico.ok) return;

    expect(historico.valor).toHaveLength(1);
    expect(historico.valor[0]?.definidoPor).toBe(e1.usuarioId);
    expect(historico.valor[0]?.definidoEm).toBe(AGORA);
  });

  it('CT-052 guarda a versão anterior e a nova no histórico, com autor e hora', async () => {
    const servicoId = await idDoServico('REC.(FRESA+CAPA)');
    await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      servicoId,
      '2210,392',
      cenario.amb,
    );

    // Uma segunda definição, um instante depois: sem isso as duas versões
    // teriam o mesmo `definido_em` e "a mais recente" não teria resposta.
    const depois = {
      db: cenario.amb.db,
      relogio: () => new Date('2026-09-16T13:00:00.000Z'),
    };
    await defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2500,000', depois);

    const historico = await listaHistoricoDeQuantidadeProtegido(
      e1,
      obraId,
      servicoId,
      cenario.amb,
    );
    expect(historico.ok).toBe(true);
    if (!historico.ok) return;

    expect(historico.valor.map((v) => v.quantidade.toString())).toEqual([
      '2500',
      '2210.392',
    ]);
    expect(historico.valor.every((v) => v.definidoPor === e1.usuarioId)).toBe(true);
  });

  it('CT-053 a quantidade vigente passa a ser a última definida', async () => {
    const servicoId = await idDoServico('REC.(FRESA+CAPA)');
    await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      servicoId,
      '2210,392',
      cenario.amb,
    );
    await defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2500,000', {
      db: cenario.amb.db,
      relogio: () => new Date('2026-09-16T13:00:00.000Z'),
    });

    expect(await quantidadeVigente('REC.(FRESA+CAPA)')).toBe('2500');
  });

  it('CT-053 o serviço não tem coluna de quantidade: não há cópia a divergir', () => {
    // Arquitetura, decisão 7: duas colunas com o mesmo número são duas verdades.
    const colunas = Object.keys(servicoControlado);
    expect(colunas.some((c) => c.toLowerCase().includes('quantidade'))).toBe(false);
  });

  it('CT-054 recusa quantidade de projeto negativa', async () => {
    const resultado = await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      await idDoServico('REC.(FRESA+CAPA)'),
      '-1',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(await quantidadeVigente('REC.(FRESA+CAPA)')).toBeNull();
  });

  it('CT-055 recusa quantidade de projeto zero e diz que precisa ser maior que zero', async () => {
    const resultado = await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      await idDoServico('RECICLAGEM(BASE+CAPA)'),
      '0',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA);
    expect(resultado.erro.mensagem).toBe('A quantidade precisa ser maior que zero.');
  });

  it('CT-056 aceita 0,001, o menor valor do outro lado da fronteira', async () => {
    const definida = await defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      await idDoServico('RECICLAGEM(BASE+CAPA)'),
      '0,001',
      cenario.amb,
    );

    expect(definida.ok).toBe(true);
    expect(await quantidadeVigente('RECICLAGEM(BASE+CAPA)')).toBe('0.001');
  });

  it('CT-057 recusa no servidor a quantidade enviada por um encarregado', async () => {
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await liberaEncarregado(c1.usuarioId);

    const resultado = await defineQuantidadeDeProjetoProtegida(
      c1,
      obraId,
      await idDoServico('REC.(FRESA+CAPA)'),
      '100',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(await quantidadeVigente('REC.(FRESA+CAPA)')).toBeNull();
  });

  it('CT-058 a obra nasce com os quatro serviços, na ordem e na grafia herdadas', async () => {
    const lista = await listaServicosProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    expect(lista.valor.map((s) => s.nome)).toEqual([
      'REC.(FRESA+CAPA)',
      'REC.(FRESA+BINDER+CAPA)',
      'RECICLAGEM(BASE+CAPA)',
      'IM.(SUBLEITO+BASE+CAPA)',
    ]);
    expect(lista.valor.map((s) => s.ordem)).toEqual([1, 2, 3, 4]);
  });

  it('CT-059 o banco recusa quantidade de projeto zero mesmo por SQL cru', async () => {
    // 13.4 impede o zero na borda, mas R5 manda manter a proteção: dado
    // antigo, migração ou outro caminho não podem quebrar a página do RDO.
    // O `INSERT` continua cru — não passa por borda, esquema nem caso de uso —,
    // só mudou de dialeto: quem recusa é `ck_qtd_projeto_positiva`.
    const servicoId = await idDoServico('REC.(FRESA+CAPA)');

    await expect(async () => {
      await cenario.conexao.db.execute(sql`
        INSERT INTO quantidade_projeto_versao
          (id, obra_id, servico_id, quantidade_milesimos, definido_por, definido_em)
        VALUES (
          ${'44444444-4444-4444-8444-444444444444'},
          ${obraId},
          ${servicoId},
          0,
          ${e1.usuarioId},
          ${AGORA}
        )
      `);
    }).rejects.toThrow();
  });
});
