/**
 * CT-001 a CT-013 — Criar a obra (`docs/qa/v1-casos-passos-1-3.md`, F1.1).
 *
 * Origem de toda expectativa: PRD `docs/prd/v1.md`, Funcionalidade 1.1 e
 * decisões 8.1, 8.2, 18.1, 21.1; `docs/dominio/regras-extraidas.md` §7 e §8;
 * casos obrigatórios 9 e 10 da skill `template-caso-teste`.
 *
 * **Nenhum valor esperado aqui foi lido da implementação.** Onde o caso do QA
 * dá o número — 30 dias, 2210,392, o dia 05/02/2026 —, é o número do caso.
 *
 * CT-014 ("o bloco 11 mostra os três valores") não está aqui: é montagem de
 * RDO, e pertence à frente C. O que esta frente prova é que os três valores
 * ficam na **obra**, que é o que o CT-013 pede.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  criaObraProtegida,
  defineResponsavelTecnicoProtegido,
  obtemCabecalhoProtegido,
} from '../../app/_composicao/cadastro';
import { obra as tabelaDeObra } from '../../db/schema';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { listaServicosControlados } from './servico-controlado';
import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';

let cenario: Cenario;

beforeEach(() => {
  cenario = montaCenario();
});

afterEach(() => {
  cenario.fecha();
});

describe('F1.1 — criar a obra', () => {
  it('CT-001 guarda os nove campos do cabeçalho exatamente como informados', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);

    const cabecalho = obtemCabecalhoProtegido(e1, obraId, cenario.amb);
    expect(cabecalho.ok).toBe(true);
    if (!cabecalho.ok) return;

    expect(cabecalho.valor.contrato).toBe('P0476/01-25 - BLOCO 02');
    expect(cabecalho.valor.contratante).toBe(
      'PREFEITURA MUNICIPAL DE MONTES CLAROS - MG',
    );
    expect(cabecalho.valor.contratada).toBe('CROS CONSTRUÇÕES S.A.');
    expect(cabecalho.valor.dataInicio).toBe('2026-02-05');
    expect(cabecalho.valor.dataTermino).toBe('2027-02-05');
    expect(cabecalho.valor.escopo).toBe('EXEC. DE SERVIÇOS DE PAVIMENTAÇÃO');
    // O espaço duplo do meio é do original e não se normaliza (17.1).
    expect(cabecalho.valor.nomeProjeto).toBe('SERVIÇOS DE PAVIMENTAÇÃO  - BLOCO 02');
    expect(cabecalho.valor.area).toBe('MONTES CLAROS - MG');
    expect(cabecalho.valor.local).toBe('VIAS URBANAS  DA CIDADE MONTES CLAROS - MG');
  });

  it('CT-002 guarda quem criou a obra e quando', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);

    const linha = cenario.conexao.sqlite
      .prepare('SELECT criado_por, criado_em FROM obra WHERE id = ?')
      .get(obraId);

    expect(linha).toEqual({
      criado_por: e1.usuarioId,
      criado_em: '2026-09-16T12:00:00.000Z',
    });
  });

  it('CT-003 dá ao criador acesso de engenheiro à obra que ele criou', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);

    const linha = cenario.conexao.sqlite
      .prepare(
        'SELECT perfil, revogado_em FROM acesso WHERE obra_id = ? AND usuario_id = ?',
      )
      .get(obraId, e1.usuarioId);

    expect(linha).toEqual({ perfil: 'engenheiro', revogado_em: null });
  });

  it('CT-004 tem um único campo de contrato e nenhum campo de código interno', () => {
    // Decisão 8.1. A planilha tem três identificações da mesma obra em lugares
    // diferentes; o produto tem uma.
    const colunas = Object.keys(tabelaDeObra);
    expect(colunas.filter((c) => c.toLowerCase().includes('contrato'))).toEqual([
      'contrato',
    ]);
    expect(colunas.some((c) => c.toLowerCase().includes('codigo'))).toBe(false);
  });

  it('CT-005 aceita data de término igual à data de início', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      {
        ...DADOS_DA_OBRA,
        dataInicio: '2026-02-05',
        dataTermino: '2026-02-05',
        periodosBms: [{ numero: 1, dataInicial: '2026-02-05', dataFinal: '2026-02-05' }],
      },
      cenario.amb,
    );

    expect(resultado.ok).toBe(true);
  });

  it('CT-006 recusa data de término um dia anterior à de início', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataInicio: '2026-02-05', dataTermino: '2026-02-04' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL);
    expect(resultado.erro.mensagem).toBe(
      'A data de término não pode ser anterior à data de início.',
    );
  });

  it('CT-007 recusa o período de -716 dias que existe na planilha real', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataInicio: '2024-12-01', dataTermino: '2022-12-15' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
  });

  it('CT-008 recusa contrato vazio e aponta o campo contrato', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: '' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo).toBe('entrada');
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'contrato',
    );
  });

  it('CT-009 recusa nome do projeto vazio e aponta o campo nome', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, nomeProjeto: '   ' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'nomeProjeto',
    );
  });

  it('CT-010 recusa 29/02/2026, que não existe: 2026 não é bissexto', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataInicio: '2026-02-29' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
    expect(resultado.erro.mensagem).toContain('não tem o dia 29');
  });

  it('CT-011 recusa 31/09/2026, a data que a aba 31 da planilha produz', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataTermino: '2026-09-31' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-012 recusa no servidor o pedido de criar obra vindo de um encarregado', () => {
    // "C1" é encarregado de uma obra existente. Esconder o botão não é
    // controle de acesso: a recusa tem de ser do servidor (R19).
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        '11111111-1111-4111-8111-111111111111',
        obraId,
        c1.usuarioId,
        e1.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const antes = cenario.conexao.sqlite
      .prepare('SELECT count(*) AS total FROM obra')
      .get() as { total: number };

    const resultado = criaObraProtegida(c1, DADOS_DA_OBRA, cenario.amb);

    const depois = cenario.conexao.sqlite
      .prepare('SELECT count(*) AS total FROM obra')
      .get() as { total: number };

    expect(resultado.ok).toBe(false);
    expect(depois.total).toBe(antes.total);
  });

  it('CT-013 guarda nome, titulação e CREA do responsável técnico na obra', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);

    const definido = defineResponsavelTecnicoProtegido(
      e1,
      obraId,
      {
        respTecnicoNome: 'R1',
        respTecnicoTitulo: 'Engenheiro Civil',
        respTecnicoCrea: 'CREA - MG 000000/D',
      },
      cenario.amb,
    );
    expect(definido.ok).toBe(true);

    const cabecalho = obtemCabecalhoProtegido(e1, obraId, cenario.amb);
    expect(cabecalho.ok).toBe(true);
    if (!cabecalho.ok) return;
    expect(cabecalho.valor.respTecnico).toEqual({
      nome: 'R1',
      titulo: 'Engenheiro Civil',
      crea: 'CREA - MG 000000/D',
    });

    // Decisão 18.1: mora na obra, não no perfil do usuário que operou.
    const usuario = cenario.conexao.sqlite
      .prepare('SELECT * FROM usuario WHERE id = ?')
      .get(e1.usuarioId) as Record<string, unknown>;
    expect(Object.keys(usuario).some((c) => c.includes('crea'))).toBe(false);
  });

  it('CT-058 cria a obra já com os quatro serviços controlados, na grafia herdada', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = criaObraDoPrd(e1, cenario.amb);

    const servicos = listaServicosControlados(obraId, paraObra(cenario.amb));
    expect(servicos.ok).toBe(true);
    if (!servicos.ok) return;

    expect(servicos.valor.map((s) => s.nome)).toEqual([
      'REC.(FRESA+CAPA)',
      'REC.(FRESA+BINDER+CAPA)',
      'RECICLAGEM(BASE+CAPA)',
      'IM.(SUBLEITO+BASE+CAPA)',
    ]);
  });
});
