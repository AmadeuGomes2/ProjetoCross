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
 *
 * As conferências que antes iam ao `conexao.sqlite` agora passam pelo Drizzle,
 * contra as tabelas do esquema: o banco é Postgres desde 17/09/2026 e o
 * `better-sqlite3` não existe mais. Continuam **sem** passar pelos módulos que
 * gravaram o dado — é a tabela que responde, não o caso de uso.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { and, count, eq } from 'drizzle-orm';

import {
  criaObraProtegida,
  defineResponsavelTecnicoProtegido,
  obtemCabecalhoProtegido,
} from '../../app/_composicao/cadastro';
import { acesso, obra as tabelaDeObra, usuario } from '../../db/schema';
import { CODIGO_ERRO } from '../../shared/result';
import { geraId, type ObraId, type UsuarioId } from '../../shared/id';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { listaServicosControlados } from './servico-controlado';
import { paraObra } from '../../app/_composicao/ambiente-de-cadastro';

const AGORA = '2026-09-16T12:00:00.000Z';

let cenario: Cenario;

beforeEach(async () => {
  cenario = await montaCenario();
});

afterEach(async () => {
  await cenario.fecha();
});

/**
 * Libera um encarregado na obra escrevendo direto na tabela `acesso`.
 *
 * De propósito não passa pelo módulo `acesso`: o que estes casos provam é a
 * recusa do servidor a quem **tem** perfil de encarregado, e um defeito na
 * liberação não pode ser o motivo de o teste passar.
 */
async function liberaEncarregado(
  obraId: ObraId,
  usuarioId: UsuarioId,
  por: UsuarioId,
): Promise<void> {
  await cenario.conexao.db.insert(acesso).values({
    id: geraId<'acesso'>(),
    obraId,
    usuarioId,
    perfil: 'encarregado',
    liberadoPor: por,
    liberadoEm: AGORA,
  });
}

async function totalDeObras(): Promise<number> {
  const linhas = await cenario.conexao.db.select({ total: count() }).from(tabelaDeObra);
  return linhas[0]?.total ?? 0;
}

describe('F1.1 — criar a obra', () => {
  it('CT-001 guarda os nove campos do cabeçalho exatamente como informados', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const cabecalho = await obtemCabecalhoProtegido(e1, obraId, cenario.amb);
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

  it('CT-002 guarda quem criou a obra e quando', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const linhas = await cenario.conexao.db
      .select({ criadoPor: tabelaDeObra.criadoPor, criadoEm: tabelaDeObra.criadoEm })
      .from(tabelaDeObra)
      .where(eq(tabelaDeObra.id, obraId));

    expect(linhas).toEqual([{ criadoPor: e1.usuarioId, criadoEm: AGORA }]);
  });

  it('CT-003 dá ao criador acesso de engenheiro à obra que ele criou', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const linhas = await cenario.conexao.db
      .select({ perfil: acesso.perfil, revogadoEm: acesso.revogadoEm })
      .from(acesso)
      .where(and(eq(acesso.obraId, obraId), eq(acesso.usuarioId, e1.usuarioId)));

    expect(linhas).toEqual([{ perfil: 'engenheiro', revogadoEm: null }]);
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

  it('CT-005 aceita data de término igual à data de início', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
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

  it('CT-006 recusa data de término um dia anterior à de início', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
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

  it('CT-007 recusa o período de -716 dias que existe na planilha real', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataInicio: '2024-12-01', dataTermino: '2022-12-15' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
  });

  it('CT-008 recusa contrato vazio e aponta o campo contrato', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
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

  it('CT-009 recusa nome do projeto vazio e aponta o campo nome', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
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

  it('CT-010 recusa 29/02/2026, que não existe: 2026 não é bissexto', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataInicio: '2026-02-29' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
    expect(resultado.erro.mensagem).toContain('não tem o dia 29');
  });

  it('CT-011 recusa 31/09/2026, a data que a aba 31 da planilha produz', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const resultado = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, dataTermino: '2026-09-31' },
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });

  it('CT-012 recusa no servidor o pedido de criar obra vindo de um encarregado', async () => {
    // "C1" é encarregado de uma obra existente. Esconder o botão não é
    // controle de acesso: a recusa tem de ser do servidor (R19).
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await liberaEncarregado(obraId, c1.usuarioId, e1.usuarioId);

    const antes = await totalDeObras();
    const resultado = await criaObraProtegida(c1, DADOS_DA_OBRA, cenario.amb);
    const depois = await totalDeObras();

    expect(resultado.ok).toBe(false);
    expect(depois).toBe(antes);
  });

  it('CT-013 guarda nome, titulação e CREA do responsável técnico na obra', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const definido = await defineResponsavelTecnicoProtegido(
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

    const cabecalho = await obtemCabecalhoProtegido(e1, obraId, cenario.amb);
    expect(cabecalho.ok).toBe(true);
    if (!cabecalho.ok) return;
    expect(cabecalho.valor.respTecnico).toEqual({
      nome: 'R1',
      titulo: 'Engenheiro Civil',
      crea: 'CREA - MG 000000/D',
    });

    // Decisão 18.1: mora na obra, não no perfil do usuário que operou. A linha
    // é lida da tabela, e não do esquema: o que interessa é o que o banco
    // devolve para quem consultar o usuário.
    const linhas = await cenario.conexao.db
      .select()
      .from(usuario)
      .where(eq(usuario.id, e1.usuarioId));
    const linha = linhas[0];
    expect(linha).toBeDefined();
    expect(Object.keys(linha ?? {}).some((c) => c.toLowerCase().includes('crea'))).toBe(
      false,
    );
  });

  it('CT-058 cria a obra já com os quatro serviços controlados, na grafia herdada', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const servicos = await listaServicosControlados(obraId, paraObra(cenario.amb));
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

/**
 * Decisão 32.1, de 16/09/2026: **responsável técnico é obrigatório para criar a
 * obra — sem nome, titulação e CREA não se cria.**
 *
 * Origem da expectativa: `docs/prd/v1.md`, tabela DECISÕES TOMADAS, 32.1. O
 * motivo é o bloco 11 do gabarito: é o campo que o fiscal assina de volta, e
 * uma obra que nasce sem ele exporta um PDF com o rodapé em branco.
 *
 * A decisão vale para a **criação**. O cabeçalho continua sabendo ler
 * `respTecnico` nulo porque as três colunas do banco aceitam nulo e as obras
 * criadas antes desta decisão continuam existindo.
 */
describe('32.1 — responsável técnico obrigatório para criar a obra', () => {
  const semCampo = async (campo: string) =>
    criaObraProtegida(
      await cenario.novoEngenheiro('e1@exemplo.invalido'),
      { ...DADOS_DA_OBRA, [campo]: '   ' },
      cenario.amb,
    );

  it('recusa a obra sem o nome do responsável técnico', async () => {
    const resultado = await semCampo('respTecnicoNome');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'respTecnicoNome',
    );
  });

  it('recusa a obra sem a titulação do responsável técnico', async () => {
    const resultado = await semCampo('respTecnicoTitulo');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'respTecnicoTitulo',
    );
  });

  it('recusa a obra sem o registro no CREA', async () => {
    const resultado = await semCampo('respTecnicoCrea');

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'respTecnicoCrea',
    );
  });

  it('recusa a obra quando os três campos nem chegam no formulário', async () => {
    // Antes da 32.1 este era o caminho aceito: os três ausentes viravam
    // `respTecnico` nulo e a obra nascia com o bloco 11 vazio.
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const semResponsavel: Record<string, unknown> = { ...DADOS_DA_OBRA };
    delete semResponsavel['respTecnicoNome'];
    delete semResponsavel['respTecnicoTitulo'];
    delete semResponsavel['respTecnicoCrea'];

    const resultado = await criaObraProtegida(e1, semResponsavel, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.tipo === 'entrada' ? resultado.erro.campo : null).toBe(
      'respTecnicoNome',
    );
  });

  it('não grava obra nenhuma quando o responsável técnico falta', async () => {
    await semCampo('respTecnicoCrea');

    expect(await totalDeObras()).toBe(0);
  });

  it('a obra criada já sai com o bloco de assinaturas preenchido', async () => {
    const e1 = await cenario.novoEngenheiro('e1@exemplo.invalido');
    const obraId = await criaObraDoPrd(e1, cenario.amb);

    const cabecalho = await obtemCabecalhoProtegido(e1, obraId, cenario.amb);
    expect(cabecalho.ok).toBe(true);
    if (!cabecalho.ok) return;
    expect(cabecalho.valor.respTecnico).toEqual({
      nome: 'R1',
      titulo: 'Engenheiro Civil',
      crea: 'CREA - MG 000000/D',
    });
  });
});
