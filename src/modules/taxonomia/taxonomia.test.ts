/**
 * CT-060 a CT-071 — Taxonomias (`docs/qa/v1-casos-passos-1-3.md`, F2.4).
 *
 * Origem das expectativas: PRD, Funcionalidade 2.4; decisões 2.1, 17.1, 19.1,
 * 19.2 e 20.1; R13; `regras-extraidas.md` §9 (as grafias exatas); caso
 * obrigatório 13 (`Perca de Produção` contra `Perca de produção`).
 *
 * As listas esperadas estão escritas **por extenso** neste arquivo, e não
 * importadas de `shared/taxonomia`. É de propósito: importar a constante faria
 * o teste concordar com ela mesma, e a grafia herdada é justamente o que não
 * pode mudar sem alguém perceber.
 *
 * Duas conferências liam o `sqlite_master` e passaram a ler o catálogo do
 * Postgres (17/09/2026): `information_schema.tables` no lugar da lista de
 * tabelas e `pg_constraint` no lugar do DDL em texto. A segunda ficou **mais
 * forte**: procurar o nome da tabela dentro do `CREATE TABLE` acharia qualquer
 * menção, inclusive num comentário; `pg_constraint` responde exatamente quantas
 * chaves estrangeiras apontam para ela.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sql, type SQL } from 'drizzle-orm';

import { paraTaxonomia } from '../../app/_composicao/ambiente-de-cadastro';
import {
  acrescentaTermoProtegido,
  listaSugestoesDeMotivoProtegida,
  listaTermosProtegida,
} from '../../app/_composicao/cadastro';
import { criaObraProtegida } from '../../app/_composicao/cadastro';
import { cadastraPessoaProtegida } from '../../app/_composicao/cadastro';
import { acesso } from '../../db/schema';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import { geraId, type ObraId, type UsuarioId } from '../../shared/id';
import { listaLetrasDeTurno, listaTermos } from './casos-de-uso';
import { TIPOS_DE_TAXONOMIA } from './tipos';

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

async function termos(
  tipo: 'funcao' | 'tipo_equipamento' | 'status_atividade',
): Promise<string[]> {
  const lista = await listaTermos(tipo, paraTaxonomia(cenario.amb));
  if (!lista.ok) throw new Error(lista.erro.mensagem);
  return lista.valor.map((t) => t.termo);
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

/**
 * Consulta de catálogo que devolve uma coluna `nome`, estreitada à mão.
 *
 * `db.execute` devolve `unknown` no supertipo `BancoRdo`: a forma do resultado
 * depende do driver, e o teste roda no PGlite enquanto a produção roda no Neon.
 * `unknown` mais validação é o que `padroes-codigo` manda; `as` para calar o
 * compilador, não.
 */
async function nomesDoCatalogo(consulta: SQL): Promise<string[]> {
  const bruto: unknown = await cenario.conexao.db.execute(consulta);
  if (typeof bruto !== 'object' || bruto === null || !('rows' in bruto)) {
    throw new Error('a consulta de catálogo não devolveu um conjunto de linhas');
  }
  const linhas: unknown = bruto.rows;
  if (!Array.isArray(linhas)) {
    throw new Error('a consulta de catálogo não devolveu um conjunto de linhas');
  }
  return linhas.map((linha: unknown) => {
    if (typeof linha !== 'object' || linha === null || !('nome' in linha)) {
      throw new Error('a linha do catálogo não traz a coluna `nome`');
    }
    return String(linha.nome);
  });
}

describe('F2.4 — taxonomias editáveis com grafia exata', () => {
  it('CT-060 traz os 14 status de atividade com a grafia herdada', async () => {
    expect(await termos('status_atividade')).toEqual([
      'Produção',
      'Informativo',
      'Pendências - Cliente',
      'Pendências - CROS',
      'Mobilização',
      'Desmobilização',
      'Alterações - Cliente',
      'Fornecimento',
      'Removido/Alteração',
      'Serviço Fo. Es.',
      'Paralisação',
      'Transporte',
      'Limpeza',
      'Levantamento',
    ]);
  });

  it('CT-061 a letra de turno tem exatamente B, C e I', () => {
    expect(listaLetrasDeTurno()).toEqual(['B', 'C', 'I']);
  });

  it('CT-062 não existe taxonomia Condição de tempo, em forma nenhuma', async () => {
    // Decisão 2.1: pedir tempo duas vezes ao encarregado feriria o lançamento
    // rápido no celular, e o PDF só imprime os turnos.
    expect(TIPOS_DE_TAXONOMIA).not.toContain('condicao_tempo');

    const tabelas = await nomesDoCatalogo(sql`
      SELECT table_name AS nome
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    expect(tabelas).not.toContain('condicao_tempo');
  });

  it('CT-063 o N da macro VBA não está entre as letras de turno', () => {
    expect(listaLetrasDeTurno()).not.toContain('N');
  });

  it('CT-064 traz as 12 funções normalizadas, sem espaço no fim', async () => {
    const lista = await termos('funcao');
    expect(lista).toEqual([
      'Auxiliar eng.',
      'ADM',
      'Feitor',
      'Servente',
      'Motorista',
      'Pedreiro',
      'Operador III',
      'Operador II',
      'Op. Rolo C.',
      'Enc. Geral',
      'Op. Retro',
      'Topografo',
    ]);
    // `Servente `, `Motorista ` e `Op. Retro ` entram assim se a carga for
    // literal, e o rótulo do bloco 5 sai com espaço (decisão 17.1).
    expect(lista.every((t) => t === t.trim())).toBe(true);
  });

  it('CT-065 traz os 8 tipos de equipamento, sem espaço no fim', async () => {
    const lista = await termos('tipo_equipamento');
    expect(lista).toEqual([
      'APOIO',
      'PATROL',
      'RETRO',
      'BASCULA',
      'CARRO',
      'ROLO',
      'TRATOR',
      'CARREGADEIRA',
    ]);
    expect(lista.every((t) => t === t.trim())).toBe(true);
  });

  it('CT-066 traz as 8 sugestões de motivo de dia parado', async () => {
    const lista = await listaSugestoesDeMotivoProtegida(e1, obraId, cenario.amb);
    expect(lista.ok).toBe(true);
    if (!lista.ok) return;

    expect(lista.valor).toEqual([
      'Domingo',
      'Feriado',
      'Chuva',
      'Excesso de umidade no trecho',
      'Interferência de terceiro',
      'Impraticável',
      'Sem frente de serviço',
      'Outro',
    ]);
  });

  it('CT-066 nenhuma chave estrangeira aponta para a tabela de sugestões', async () => {
    // Decisão 20.1: o motivo é texto livre. Validar contra a lista a
    // transformaria em taxonomia fechada, que a decisão recusou.
    const referencias = await nomesDoCatalogo(sql`
      SELECT conname AS nome
      FROM pg_constraint
      WHERE contype = 'f' AND confrelid = 'sugestao_motivo_parada'::regclass
    `);
    expect(referencias).toEqual([]);
  });

  it('CT-067 acrescenta um status novo sem alterar os 14 herdados', async () => {
    const antes = await termos('status_atividade');

    const criado = await acrescentaTermoProtegido(
      e1,
      obraId,
      'status_atividade',
      'Retrabalho',
      cenario.amb,
    );
    expect(criado.ok).toBe(true);

    const depois = await termos('status_atividade');
    expect(depois).toHaveLength(15);
    expect(depois.slice(0, 14)).toEqual(antes);
    expect(depois).toContain('Retrabalho');
  });

  it('CT-068 termo novo vale para o sistema inteiro, inclusive em outra obra', async () => {
    const criado = await acrescentaTermoProtegido(
      e1,
      obraId,
      'funcao',
      'Encanador',
      cenario.amb,
    );
    expect(criado.ok).toBe(true);

    // A outra obra é criada por E1, que já é engenheiro da primeira (25.1). O
    // que o caso prova é que o termo novo vale em outra obra, e não quem criou.
    const outra = await criaObraProtegida(
      e1,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const pessoa = await cadastraPessoaProtegida(
      e1,
      outra.valor,
      { nome: 'P10', funcao: 'Encanador', entrada: '2026-02-10' },
      cenario.amb,
    );
    expect(pessoa.ok).toBe(true);
  });

  it('CT-069 recusa " perca de Produção " porque já existe "Perca de produção"', async () => {
    const base = await acrescentaTermoProtegido(
      e1,
      obraId,
      'status_atividade',
      'Perca de produção',
      cenario.amb,
    );
    expect(base.ok).toBe(true);

    const duplicado = await acrescentaTermoProtegido(
      e1,
      obraId,
      'status_atividade',
      ' perca de Produção ',
      cenario.amb,
    );

    expect(duplicado.ok).toBe(false);
    if (duplicado.ok) return;
    expect(duplicado.erro.mensagem).toBe(
      'Já existe o termo "Perca de produção" nesta lista.',
    );
    expect(
      (await termos('status_atividade')).filter((t) => t.toLowerCase().includes('perca')),
    ).toHaveLength(1);
  });

  it('CT-070 recusa no servidor o termo novo enviado por encarregado', async () => {
    const c1 = await cenario.novoAtor('c1@exemplo.invalido');
    await liberaEncarregado(c1.usuarioId);

    const resultado = await acrescentaTermoProtegido(
      c1,
      obraId,
      'status_atividade',
      'Retrabalho',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(await termos('status_atividade')).not.toContain('Retrabalho');
  });

  it('CT-071 a validação de status consulta a tabela, sem depender de faixa de linhas', async () => {
    // `inconsistencias.md` A3: na planilha a validação vale da linha 5 à 511 e
    // fora disso aponta para `#REF!`. Aqui a consulta é por chave, e o termo
    // acrescentado em qualquer posição é encontrado.
    for (let i = 0; i < 20; i += 1) {
      const criado = await acrescentaTermoProtegido(
        e1,
        obraId,
        'status_atividade',
        `Status de teste ${i}`,
        cenario.amb,
      );
      expect(criado.ok).toBe(true);
    }

    const lista = await listaTermosProtegida(e1, obraId, 'status_atividade', cenario.amb);
    expect(lista.ok && lista.valor).toHaveLength(34);
    expect(lista.ok && lista.valor.map((t) => t.termo)).toContain('Status de teste 19');
  });

  it('o encarregado lê a taxonomia, porque precisa dela para lançar', async () => {
    const c1 = await cenario.novoAtor('c2@exemplo.invalido');
    await liberaEncarregado(c1.usuarioId);

    const lista = await listaTermosProtegida(c1, obraId, 'status_atividade', cenario.amb);
    expect(lista.ok && lista.valor).toHaveLength(14);
  });
});
