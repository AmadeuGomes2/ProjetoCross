/**
 * A migration `0003_exclusao_com_rastro_e_convite` contra um banco **que já tem
 * dado**.
 *
 * Origem das expectativas:
 *
 * - decisão 30.1 (`docs/prd/v1.md`): excluir lançamento deixa registro — quem,
 *   quando e por quê. Daí as três colunas e o CHECK que as amarra: gravar
 *   `excluido_em` sem motivo seria rastro pela metade, e é o rastro que a
 *   decisão exige;
 * - decisão 34.1 (`docs/prd/v1.md`): um engenheiro dá acesso de engenheiro a
 *   outra pessoa. O `CHECK (perfil = 'encarregado')` de `convite`, da 0000,
 *   torna isso impossível no banco;
 * - `CLAUDE.md`, seção Modelo: "RDO entregue ao fiscal não muda em silêncio".
 *   Migration que perde linha de lançamento apaga RDO já entregue.
 *
 * O banco é montado no estado 0002 — que é o estado de `tmp/rdo.sqlite` — e a
 * 0003 é aplicada por cima, com linhas dentro. É justamente esse estado
 * intermediário que o `migrate()` normal nunca deixa observar.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const INSTANTE = '2026-09-16T12:00:00.000Z';
const DIA = '2026-09-03';

const ANTERIORES = [
  '0000_esquema_inicial_v1.sql',
  '0001_engenheiro_na_conta.sql',
  '0002_funcao_na_passagem.sql',
];
const NOVA = '0003_exclusao_com_rastro_e_convite.sql';

function aplica(sqlite: Database.Database, arquivo: string): void {
  const caminho = fileURLToPath(new URL(`./migrations/${arquivo}`, import.meta.url));
  for (const comando of readFileSync(caminho, 'utf8').split('--> statement-breakpoint')) {
    if (comando.trim() !== '') sqlite.exec(comando);
  }
}

let sqlite: Database.Database;

function montaDadoAntigo(): void {
  sqlite
    .prepare('INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)')
    .run('u-eng', 'Engenheiro de Teste', 'e1@exemplo.invalido', INSTANTE);
  sqlite
    .prepare('INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)')
    .run('u-enc', 'Encarregado de Teste', 'c1@exemplo.invalido', INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                         escopo, nome_projeto, area, "local", criado_por, criado_em)
       VALUES ('obra-1', 'C-001/TESTE', 'CONTRATANTE', 'CONTRATADA', '2026-02-05',
               '2027-02-05', 'ESCOPO', 'PROJETO', 'AREA', 'LOCAL', 'u-eng', ?)`,
    )
    .run(INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO status_atividade (id, termo, termo_normalizado, ordem, ativo, criado_em)
       VALUES ('st-1', 'Produção', 'produção', 1, 1, ?)`,
    )
    .run(INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO dia_de_obra (obra_id, data, estado, registrado_por, registrado_em)
       VALUES ('obra-1', ?, 'trabalhado', 'u-enc', ?)`,
    )
    .run(DIA, INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO lancamento_atividade
         (id, obra_id, data, autor_id, registrado_em, raiz_id, descricao, status_id)
       VALUES ('l-1', 'obra-1', ?, 'u-enc', ?, 'l-1', 'Fresagem da Rua A', 'st-1')`,
    )
    .run(DIA, INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO lancamento_pluviometria
         (id, obra_id, data, autor_id, registrado_em, raiz_id, indice_mm_milesimos)
       VALUES ('p-1', 'obra-1', ?, 'u-enc', ?, 'p-1', 8000)`,
    )
    .run(DIA, INSTANTE);
  sqlite
    .prepare(
      `INSERT INTO convite (id, obra_id, token_hash, perfil, criado_por, criado_em, expira_em)
       VALUES ('cv-1', 'obra-1', 'hash-antigo', 'encarregado', 'u-eng', ?, ?)`,
    )
    .run(INSTANTE, '2026-09-23T12:00:00.000Z');
}

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  for (const arquivo of ANTERIORES) aplica(sqlite, arquivo);
  montaDadoAntigo();
});

afterEach(() => {
  sqlite.close();
});

function total(tabela: string): number {
  const linha = sqlite.prepare(`SELECT count(*) AS total FROM ${tabela}`).get() as {
    total: number;
  };
  return linha.total;
}

describe('0003 num banco que já está em uso', () => {
  it('não perde lançamento nenhum', () => {
    aplica(sqlite, NOVA);

    expect(total('lancamento_atividade')).toBe(1);
    expect(total('lancamento_pluviometria')).toBe(1);
  });

  it('não perde o convite que já existia', () => {
    aplica(sqlite, NOVA);

    const linha = sqlite.prepare('SELECT perfil FROM convite WHERE id = ?').get('cv-1');
    expect(linha).toEqual({ perfil: 'encarregado' });
  });

  it('o lançamento antigo nasce sem exclusão', () => {
    aplica(sqlite, NOVA);

    const linha = sqlite
      .prepare(
        'SELECT excluido_por, excluido_em, motivo_exclusao FROM lancamento_atividade WHERE id = ?',
      )
      .get('l-1');
    expect(linha).toEqual({
      excluido_por: null,
      excluido_em: null,
      motivo_exclusao: null,
    });
  });

  it('aceita a exclusão completa: quem, quando e por quê', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `UPDATE lancamento_atividade
              SET excluido_por = 'u-eng', excluido_em = ?, motivo_exclusao = 'Lançado na data errada'
            WHERE id = 'l-1'`,
        )
        .run(INSTANTE),
    ).not.toThrow();
  });

  it('recusa exclusão sem motivo: rastro pela metade não é rastro', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `UPDATE lancamento_atividade SET excluido_por = 'u-eng', excluido_em = ? WHERE id = 'l-1'`,
        )
        .run(INSTANTE),
    ).toThrow();
  });

  it('recusa motivo em branco', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `UPDATE lancamento_atividade
              SET excluido_por = 'u-eng', excluido_em = ?, motivo_exclusao = '   '
            WHERE id = 'l-1'`,
        )
        .run(INSTANTE),
    ).toThrow();
  });

  it('recusa motivo sem quem e sem quando', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `UPDATE lancamento_atividade SET motivo_exclusao = 'Sem autor' WHERE id = 'l-1'`,
        )
        .run(),
    ).toThrow();
  });

  it('recusa instante de exclusão em hora local, sem fuso', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `UPDATE lancamento_atividade
              SET excluido_por = 'u-eng', excluido_em = '2026-09-16 12:00:00', motivo_exclusao = 'x'
            WHERE id = 'l-1'`,
        )
        .run(),
    ).toThrow();
  });

  it('as quatro tabelas de lançamento ganham as três colunas', () => {
    aplica(sqlite, NOVA);

    for (const tabela of [
      'lancamento_atividade',
      'lancamento_producao',
      'lancamento_pluviometria',
      'lancamento_observacao',
    ]) {
      const colunas = (
        sqlite.pragma(`table_info('${tabela}')`) as { name: string }[]
      ).map((c) => c.name);
      expect(colunas).toContain('excluido_por');
      expect(colunas).toContain('excluido_em');
      expect(colunas).toContain('motivo_exclusao');
    }
  });

  it('a pluviometria excluída libera o dia para uma leitura nova', () => {
    // O índice único de UMA cadeia de pluviometria por dia passa a ignorar a
    // excluída: senão excluir a leitura errada trancaria o dia para sempre.
    aplica(sqlite, NOVA);
    sqlite
      .prepare(
        `UPDATE lancamento_pluviometria
            SET excluido_por = 'u-eng', excluido_em = ?, motivo_exclusao = 'Leitura de outro canteiro'
          WHERE id = 'p-1'`,
      )
      .run(INSTANTE);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO lancamento_pluviometria
             (id, obra_id, data, autor_id, registrado_em, raiz_id, indice_mm_milesimos)
           VALUES ('p-2', 'obra-1', ?, 'u-enc', ?, 'p-2', 12000)`,
        )
        .run(DIA, INSTANTE),
    ).not.toThrow();
  });

  it('o banco migrado aceita convite de engenheiro', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO convite (id, obra_id, token_hash, perfil, criado_por, criado_em, expira_em)
           VALUES ('cv-2', 'obra-1', 'hash-novo', 'engenheiro', 'u-eng', ?, ?)`,
        )
        .run(INSTANTE, '2026-09-23T12:00:00.000Z'),
    ).not.toThrow();
  });

  it('o banco migrado continua recusando perfil que não existe', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO convite (id, obra_id, token_hash, perfil, criado_por, criado_em, expira_em)
           VALUES ('cv-3', 'obra-1', 'hash-3', 'fiscal', 'u-eng', ?, ?)`,
        )
        .run(INSTANTE, '2026-09-23T12:00:00.000Z'),
    ).toThrow();
  });

  it('o token do convite continua único depois da recriação da tabela', () => {
    aplica(sqlite, NOVA);

    expect(() =>
      sqlite
        .prepare(
          `INSERT INTO convite (id, obra_id, token_hash, perfil, criado_por, criado_em, expira_em)
           VALUES ('cv-4', 'obra-1', 'hash-antigo', 'encarregado', 'u-eng', ?, ?)`,
        )
        .run(INSTANTE, '2026-09-23T12:00:00.000Z'),
    ).toThrow();
  });

  it('não deixa tabela de trabalho para trás', () => {
    aplica(sqlite, NOVA);

    const nomes = (
      sqlite
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as { name: string }[]
    ).map((t) => t.name);

    expect(nomes.filter((n) => n.endsWith('_antiga'))).toEqual([]);
    expect(nomes).toContain('convite');
  });

  it('o banco migrado passa em integrity_check e foreign_key_check', () => {
    aplica(sqlite, NOVA);

    expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(sqlite.pragma('foreign_key_check')).toEqual([]);
  });
});
