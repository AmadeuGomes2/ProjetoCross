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

import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';
import {
  defineQuantidadeDeProjetoProtegida,
  listaHistoricoDeQuantidadeProtegido,
  listaServicosProtegida,
} from '../../app/_composicao/cadastro';
import { servicoControlado } from '../../db/schema';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import type { ObraId, ServicoControladoId } from '../../shared/id';
import { listaServicosControlados } from './servico-controlado';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(() => {
  cenario = montaCenario();
  e1 = cenario.novoAtor('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb);
});

afterEach(() => {
  cenario.fecha();
});

function idDoServico(nome: string): ServicoControladoId {
  const lista = listaServicosControlados(obraId, paraObra(cenario.amb));
  if (!lista.ok) throw new Error('não foi possível listar os serviços');
  const servico = lista.valor.find((s) => s.nome === nome);
  if (servico === undefined) throw new Error(`serviço ausente: ${nome}`);
  return servico.servicoId;
}

function quantidadeVigente(nome: string): string | null {
  const lista = listaServicosControlados(obraId, paraObra(cenario.amb));
  if (!lista.ok) throw new Error('não foi possível listar os serviços');
  const servico = lista.valor.find((s) => s.nome === nome);
  return servico?.quantidadeDeProjeto?.toString() ?? null;
}

describe('F2.3 — serviço controlado e quantidade de projeto', () => {
  it('CT-050 guarda 2210,392 exatamente, sem arredondar', () => {
    const definida = defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      idDoServico('REC.(FRESA+CAPA)'),
      '2210,392',
      cenario.amb,
    );
    expect(definida.ok).toBe(true);
    expect(quantidadeVigente('REC.(FRESA+CAPA)')).toBe('2210.392');
  });

  it('CT-051 registra quem definiu a quantidade e quando', () => {
    const servicoId = idDoServico('REC.(FRESA+CAPA)');
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2210,392', cenario.amb);

    const historico = listaHistoricoDeQuantidadeProtegido(
      e1,
      obraId,
      servicoId,
      cenario.amb,
    );
    expect(historico.ok).toBe(true);
    if (!historico.ok) return;

    expect(historico.valor).toHaveLength(1);
    expect(historico.valor[0]?.definidoPor).toBe(e1.usuarioId);
    expect(historico.valor[0]?.definidoEm).toBe('2026-09-16T12:00:00.000Z');
  });

  it('CT-052 guarda a versão anterior e a nova no histórico, com autor e hora', () => {
    const servicoId = idDoServico('REC.(FRESA+CAPA)');
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2210,392', cenario.amb);

    // Uma segunda definição, um instante depois: sem isso as duas versões
    // teriam o mesmo `definido_em` e "a mais recente" não teria resposta.
    const depois = {
      db: cenario.amb.db,
      relogio: () => new Date('2026-09-16T13:00:00.000Z'),
    };
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2500,000', depois);

    const historico = listaHistoricoDeQuantidadeProtegido(
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

  it('CT-053 a quantidade vigente passa a ser a última definida', () => {
    const servicoId = idDoServico('REC.(FRESA+CAPA)');
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2210,392', cenario.amb);
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '2500,000', {
      db: cenario.amb.db,
      relogio: () => new Date('2026-09-16T13:00:00.000Z'),
    });

    expect(quantidadeVigente('REC.(FRESA+CAPA)')).toBe('2500');
  });

  it('CT-053 o serviço não tem coluna de quantidade: não há cópia a divergir', () => {
    // Arquitetura, decisão 7: duas colunas com o mesmo número são duas verdades.
    const colunas = Object.keys(servicoControlado);
    expect(colunas.some((c) => c.toLowerCase().includes('quantidade'))).toBe(false);
  });

  it('CT-054 recusa quantidade de projeto negativa', () => {
    const resultado = defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      idDoServico('REC.(FRESA+CAPA)'),
      '-1',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(quantidadeVigente('REC.(FRESA+CAPA)')).toBeNull();
  });

  it('CT-055 recusa quantidade de projeto zero e diz que precisa ser maior que zero', () => {
    const resultado = defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      idDoServico('RECICLAGEM(BASE+CAPA)'),
      '0',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.QUANTIDADE_NAO_POSITIVA);
    expect(resultado.erro.mensagem).toBe('A quantidade precisa ser maior que zero.');
  });

  it('CT-056 aceita 0,001, o menor valor do outro lado da fronteira', () => {
    const definida = defineQuantidadeDeProjetoProtegida(
      e1,
      obraId,
      idDoServico('RECICLAGEM(BASE+CAPA)'),
      '0,001',
      cenario.amb,
    );

    expect(definida.ok).toBe(true);
    expect(quantidadeVigente('RECICLAGEM(BASE+CAPA)')).toBe('0.001');
  });

  it('CT-057 recusa no servidor a quantidade enviada por um encarregado', () => {
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        '33333333-3333-4333-8333-333333333333',
        obraId,
        c1.usuarioId,
        e1.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const resultado = defineQuantidadeDeProjetoProtegida(
      c1,
      obraId,
      idDoServico('REC.(FRESA+CAPA)'),
      '100',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(quantidadeVigente('REC.(FRESA+CAPA)')).toBeNull();
  });

  it('CT-058 a obra nasce com os quatro serviços, na ordem e na grafia herdadas', () => {
    const lista = listaServicosProtegida(e1, obraId, cenario.amb);
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

  it('CT-059 o banco recusa quantidade de projeto zero mesmo por SQL cru', () => {
    // 13.4 impede o zero na borda, mas R5 manda manter a proteção: dado
    // antigo, migração ou outro caminho não podem quebrar a página do RDO.
    const servicoId = idDoServico('REC.(FRESA+CAPA)');
    expect(() =>
      cenario.conexao.sqlite
        .prepare(
          `INSERT INTO quantidade_projeto_versao
             (id, obra_id, servico_id, quantidade_milesimos, definido_por, definido_em)
           VALUES (?, ?, ?, 0, ?, ?)`,
        )
        .run(
          '44444444-4444-4444-8444-444444444444',
          obraId,
          servicoId,
          e1.usuarioId,
          '2026-09-16T12:00:00.000Z',
        ),
    ).toThrow();
  });
});
