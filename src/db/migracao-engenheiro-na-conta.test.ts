/**
 * A migration `0001_engenheiro_na_conta` contra um banco **que já tem dado**.
 *
 * Origem da expectativa: decisão 25.1 e a correção de 16/09/2026 que moveu "ser
 * engenheiro" para a conta. Quem já criava obra antes da migration precisa
 * continuar criando depois dela; senão o banco em uso perde a capacidade de
 * criar a segunda obra no instante em que o deploy sobe, e ninguém descobre
 * até tentar.
 *
 * O critério da migração é o mesmo que a regra antiga usava: acesso **ativo**
 * com perfil de engenheiro em alguma obra. Acesso revogado não conta — revogar
 * é tirar o acesso, e ressuscitá-lo como atributo da conta seria pior que o
 * problema que a coluna resolve.
 *
 * Este teste aplica as migrations na mão, uma a uma, porque é justamente o
 * estado intermediário — banco na 0000, com linhas — que o `migrate()` normal
 * nunca deixa observar.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const INSTANTE = '2026-01-01T00:00:00.000Z';

function caminhoDaMigration(arquivo: string): string {
  return fileURLToPath(new URL(`./migrations/${arquivo}`, import.meta.url));
}

function aplica(sqlite: Database.Database, arquivo: string): void {
  const conteudo = readFileSync(caminhoDaMigration(arquivo), 'utf8');
  for (const comando of conteudo.split('--> statement-breakpoint')) {
    if (comando.trim() !== '') sqlite.exec(comando);
  }
}

function insereUsuarioAntigo(sqlite: Database.Database, id: string): void {
  sqlite
    .prepare('INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)')
    .run(id, `Pessoa ${id}`, `${id}@exemplo.invalido`, INSTANTE);
}

function insereAcesso(
  sqlite: Database.Database,
  dados: {
    id: string;
    usuarioId: string;
    perfil: 'engenheiro' | 'encarregado';
    revogadoEm: string | null;
  },
): void {
  sqlite
    .prepare(
      `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em, revogado_por, revogado_em)
       VALUES (?, 'obra-1', ?, ?, 'u-fundador', ?, ?, ?)`,
    )
    .run(
      dados.id,
      dados.usuarioId,
      dados.perfil,
      INSTANTE,
      dados.revogadoEm === null ? null : 'u-fundador',
      dados.revogadoEm,
    );
}

let sqlite: Database.Database;

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  aplica(sqlite, '0000_esquema_inicial_v1.sql');

  insereUsuarioAntigo(sqlite, 'u-fundador');
  insereUsuarioAntigo(sqlite, 'u-encarregado');
  insereUsuarioAntigo(sqlite, 'u-revogado');
  insereUsuarioAntigo(sqlite, 'u-sem-acesso');

  sqlite
    .prepare(
      `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                         escopo, nome_projeto, area, local, criado_por, criado_em)
       VALUES ('obra-1', 'P0476/01-25 - BLOCO 02', 'CONTRATANTE', 'CONTRATADA',
               '2026-02-05', '2027-02-05', 'ESCOPO', 'PROJETO', 'AREA', 'LOCAL',
               'u-fundador', ?)`,
    )
    .run(INSTANTE);

  insereAcesso(sqlite, {
    id: 'a-1',
    usuarioId: 'u-fundador',
    perfil: 'engenheiro',
    revogadoEm: null,
  });
  insereAcesso(sqlite, {
    id: 'a-2',
    usuarioId: 'u-encarregado',
    perfil: 'encarregado',
    revogadoEm: null,
  });
  insereAcesso(sqlite, {
    id: 'a-3',
    usuarioId: 'u-revogado',
    perfil: 'engenheiro',
    revogadoEm: INSTANTE,
  });
});

afterEach(() => {
  sqlite.close();
});

function eEngenheiro(id: string): number {
  const linha = sqlite
    .prepare('SELECT e_engenheiro FROM usuario WHERE id = ?')
    .get(id) as { e_engenheiro: number } | undefined;
  if (linha === undefined) throw new Error(`usuário ${id} sumiu na migration`);
  return linha.e_engenheiro;
}

describe('0001_engenheiro_na_conta num banco que já está em uso', () => {
  it('marca quem já é engenheiro ativo de alguma obra', () => {
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    expect(eEngenheiro('u-fundador')).toBe(1);
  });

  it('não marca o encarregado', () => {
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    expect(eEngenheiro('u-encarregado')).toBe(0);
  });

  it('não marca quem teve o acesso de engenheiro revogado', () => {
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    expect(eEngenheiro('u-revogado')).toBe(0);
  });

  it('não marca quem não tem acesso nenhum', () => {
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    expect(eEngenheiro('u-sem-acesso')).toBe(0);
  });

  it('preserva as linhas que já existiam nas tabelas que apontam para usuario', () => {
    // A tabela não é recriada: recriar `usuario` significaria DROP de uma
    // tabela referenciada por `acesso`, `sessao`, `convite` e pelos quatro
    // tipos de lançamento.
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    const linha = sqlite.prepare('SELECT count(*) AS total FROM acesso').get() as {
      total: number;
    };
    expect(linha.total).toBe(3);
  });

  it('o banco migrado recusa valor que não seja 0 nem 1 na coluna nova', () => {
    // Convenção do projeto: booleano é INTEGER com CHECK (convencoes.ts).
    aplica(sqlite, '0001_engenheiro_na_conta.sql');

    expect(() =>
      sqlite.prepare("UPDATE usuario SET e_engenheiro = 2 WHERE id = 'u-fundador'").run(),
    ).toThrow();
  });
});
