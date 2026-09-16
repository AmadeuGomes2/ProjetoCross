/**
 * Teste de integração do esquema físico: banco em memória, migrations
 * aplicadas, e as invariantes provadas contra o BANCO, não contra o código da
 * aplicação. Por isso os inserts são SQL cru: o que se está afirmando é que a
 * regra continua valendo para uma rota nova que esqueça a validação da borda.
 *
 * Origem de toda expectativa deste arquivo:
 *   docs/arquitetura/v1.md, seção 1 (convenções) e seção 2 (as 22 tabelas)
 *   docs/dominio/regras-extraidas.md e as decisões de 16/09/2026 citadas caso a caso
 * Nenhum valor esperado aqui foi lido da implementação.
 */

import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { criaBanco, type ConexaoRdo } from '../index';
import { semeiaTaxonomias } from '../seed';

const PASTA_DE_MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));

let conexao: ConexaoRdo;

/** Ids fixos: teste não sorteia, para que a falha seja sempre a mesma. */
const USUARIO = '11111111-1111-4111-8111-111111111111';
const OBRA = '22222222-2222-4222-8222-222222222222';
const SERVICO = '33333333-3333-4333-8333-333333333333';
const STATUS = '44444444-4444-4444-8444-444444444444';
const INSTANTE = '2026-09-16T12:00:00.000Z';

function sqlite() {
  return conexao.sqlite;
}

/** Usuário + obra + serviço + status: o mínimo para as chaves estrangeiras. */
function montaBase(): void {
  const s = sqlite();
  s.prepare(`INSERT INTO usuario (id, nome, email, criado_em) VALUES (?, ?, ?, ?)`).run(
    USUARIO,
    'Usuario de Teste',
    'teste@exemplo.invalido',
    INSTANTE,
  );
  s.prepare(
    `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                       escopo, nome_projeto, area, "local", criado_por, criado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    OBRA,
    'C-001/TESTE',
    'CONTRATANTE DE TESTE',
    'CONTRATADA DE TESTE',
    '2026-02-05',
    '2027-02-05',
    'ESCOPO',
    'PROJETO',
    'AREA',
    'LOCAL',
    USUARIO,
    INSTANTE,
  );
  s.prepare(
    `INSERT INTO servico_controlado (id, obra_id, nome, nome_normalizado, ordem, ativo)
     VALUES (?, ?, ?, ?, ?, 1)`,
  ).run(SERVICO, OBRA, 'REC.(FRESA+CAPA)', 'rec.(fresa+capa)', 1);
  s.prepare(
    `INSERT INTO status_atividade (id, termo, termo_normalizado, ordem, ativo, criado_em)
     VALUES (?, ?, ?, ?, 1, ?)`,
  ).run(STATUS, 'Produção', 'produção', 1, INSTANTE);
}

function insereDia(
  data: string,
  estado = 'trabalhado',
  motivo: string | null = null,
): void {
  sqlite()
    .prepare(
      `INSERT INTO dia_de_obra (obra_id, data, estado, motivo_parada, registrado_por, registrado_em)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(OBRA, data, estado, motivo, USUARIO, INSTANTE);
}

function insereProducao(id: string, data: string, milesimos: number): void {
  sqlite()
    .prepare(
      `INSERT INTO lancamento_producao
         (id, obra_id, data, servico_id, quantidade_milesimos, autor_id, registrado_em, raiz_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, OBRA, data, SERVICO, milesimos, USUARIO, INSTANTE, id);
}

beforeEach(() => {
  conexao = criaBanco(':memory:');
  migrate(conexao.db, { migrationsFolder: PASTA_DE_MIGRATIONS });
});

afterEach(() => {
  conexao.fecha();
});

describe('conexão', () => {
  // Arquitetura seção 0: "PRAGMA foreign_keys = ON em toda conexão. Sem isso,
  // metade das integridades deste documento é decorativa."
  it('liga PRAGMA foreign_keys em toda conexão', () => {
    const linha = sqlite().pragma('foreign_keys', { simple: true });
    expect(linha).toBe(1);
  });

  // Arquitetura seção 0: "Nenhuma coluna REAL no esquema inteiro", porque ponto
  // flutuante binário não soma acumulado (CLAUDE.md, Quantidades).
  it('não tem nenhuma coluna REAL no esquema inteiro', () => {
    const tabelas = sqlite()
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
           AND name NOT LIKE '__drizzle%'`,
      )
      .all() as { name: string }[];

    const colunasReais = tabelas.flatMap((t) => {
      const colunas = sqlite().pragma(`table_info('${t.name}')`) as {
        name: string;
        type: string;
      }[];
      return colunas
        .filter((c) => c.type.toUpperCase().includes('REAL'))
        .map((c) => `${t.name}.${c.name}`);
    });

    expect(colunasReais).toEqual([]);
  });

  // Arquitetura seção 2: "São 22 tabelas, mais a tabela de controle do Drizzle."
  it('cria as 22 tabelas do modelo físico', () => {
    const nomes = (
      sqlite()
        .prepare(
          `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
             AND name NOT LIKE '__drizzle%' ORDER BY name`,
        )
        .all() as { name: string }[]
    ).map((t) => t.name);

    expect(nomes).toEqual([
      'acesso',
      'convite',
      'dia_de_obra',
      'equipamento',
      'funcao',
      'lancamento_atividade',
      'lancamento_observacao',
      'lancamento_pluviometria',
      'lancamento_producao',
      'obra',
      'passagem_equipamento',
      'passagem_pessoa',
      'periodo_bms',
      'pessoa',
      'quantidade_projeto_versao',
      'registro_exportacao',
      'servico_controlado',
      'sessao',
      'status_atividade',
      'sugestao_motivo_parada',
      'tipo_equipamento',
      'usuario',
    ]);
  });
});

describe('dia puro', () => {
  beforeEach(montaBase);

  // regras-extraidas §7: encadear dia+1 é como a planilha produziu "31 de
  // setembro". Caso de teste obrigatório 10. O dia é AAAA-MM-DD do calendário
  // real, e o banco é a última rede.
  it('rejeita 2026-09-31, que não existe no calendário', () => {
    expect(() => insereDia('2026-09-31')).toThrow(/CHECK constraint failed/);
  });

  it('aceita 2026-09-30, o último dia real de setembro', () => {
    expect(() => insereDia('2026-09-30')).not.toThrow();
  });

  // 2026 não é bissexto. Mesma família de defeito do 31/09.
  it('rejeita 29 de fevereiro em ano não bissexto', () => {
    expect(() => insereDia('2026-02-29')).toThrow(/CHECK constraint failed/);
  });

  it('rejeita mês 13, que passa pelo formato mas não pelo calendário', () => {
    expect(() => insereDia('2026-13-01')).toThrow(/CHECK constraint failed/);
  });

  // CLAUDE.md, Datas: "Exibição sempre em pt-BR". Armazenamento nunca.
  it('rejeita data gravada em dd/mm/aaaa', () => {
    expect(() => insereDia('30/09/2026')).toThrow(/CHECK constraint failed/);
  });

  // Arquitetura seção 1: instante é TEXT, dia é dia puro. Dia com hora é dia
  // com fuso escondido, e é assim que se perde um dia de RDO.
  it('rejeita dia com hora junto', () => {
    expect(() => insereDia('2026-09-30T00:00:00.000Z')).toThrow(
      /CHECK constraint failed/,
    );
  });

  // Arquitetura 2.1: CHECK (data_termino >= data_inicio), R14. A planilha tem
  // um período de -716 dias. Caso de teste obrigatório 9.
  it('rejeita obra com término anterior ao início', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                             escopo, nome_projeto, area, "local", criado_por, criado_em)
           VALUES (?, 'C', 'A', 'B', '2027-02-05', '2026-02-05', 'E', 'P', 'A', 'L', ?, ?)`,
        )
        .run('55555555-5555-4555-8555-555555555555', USUARIO, INSTANTE),
    ).toThrow(/CHECK constraint failed/);
  });

  // Arquitetura 2.2: mesma regra no período de BMS (R14, R25).
  it('rejeita período de BMS com data final anterior à inicial', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO periodo_bms (id, obra_id, numero, data_inicial, data_final, criado_por, criado_em)
           VALUES (?, ?, 1, '2026-03-10', '2026-03-01', ?, ?)`,
        )
        .run('66666666-6666-4666-8666-666666666666', OBRA, USUARIO, INSTANTE),
    ).toThrow(/CHECK constraint failed/);
  });
});

describe('quantidade em milésimos', () => {
  beforeEach(() => {
    montaBase();
    insereDia('2026-09-01');
  });

  // Decisão 13.3: produção maior que zero. "Não houve produção" é a ausência do
  // lançamento, não um lançamento negativo.
  it('rejeita produção com quantidade negativa', () => {
    expect(() =>
      insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', -1000),
    ).toThrow(/CHECK constraint failed/);
  });

  // Decisão 13.3, fronteira: zero também é recusado.
  it('rejeita produção com quantidade zero', () => {
    expect(() =>
      insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', 0),
    ).toThrow(/CHECK constraint failed/);
  });

  it('aceita produção de 1 milésimo, a menor quantidade representável', () => {
    expect(() =>
      insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', 1),
    ).not.toThrow();
  });

  // Decisão 13.4: quantidade de projeto maior que zero (arquitetura 2.16).
  it('rejeita quantidade de projeto negativa', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO quantidade_projeto_versao
             (id, obra_id, servico_id, quantidade_milesimos, definido_por, definido_em)
           VALUES (?, ?, ?, -1, ?, ?)`,
        )
        .run('88888888-8888-4888-8888-888888888888', OBRA, SERVICO, USUARIO, INSTANTE),
    ).toThrow(/CHECK constraint failed/);
  });

  // Arquitetura 2.20: CHECK (0 <= x AND x <= 1000000), R23. Índice de chuva não
  // é negativo.
  it('rejeita índice pluviométrico negativo', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_pluviometria
             (id, obra_id, data, noite_anterior, manha, tarde, indice_mm_milesimos,
              autor_id, registrado_em, raiz_id)
           VALUES (?, ?, '2026-09-01', 'B', 'B', 'B', -1, ?, ?, ?)`,
        )
        .run(
          '99999999-9999-4999-8999-999999999999',
          OBRA,
          USUARIO,
          INSTANTE,
          '99999999-9999-4999-8999-999999999999',
        ),
    ).toThrow(/CHECK constraint failed/);
  });

  // Decisão 3.2 e regras-extraidas §4: chuva com índice 0 é caso real e
  // continua valendo "Trabalhado". Zero precisa ser gravável.
  it('aceita índice pluviométrico zero', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_pluviometria
             (id, obra_id, data, noite_anterior, manha, tarde, indice_mm_milesimos,
              autor_id, registrado_em, raiz_id)
           VALUES (?, ?, '2026-09-01', 'C', NULL, NULL, 0, ?, ?, ?)`,
        )
        .run(
          '99999999-9999-4999-8999-999999999999',
          OBRA,
          USUARIO,
          INSTANTE,
          '99999999-9999-4999-8999-999999999999',
        ),
    ).not.toThrow();
  });
});

describe('estado do dia', () => {
  beforeEach(montaBase);

  // Decisão 4.2: os estados são três, e `não lançado` é AUSÊNCIA DE LINHA.
  // Por isso a coluna só aceita dois valores (arquitetura 2.17).
  it('aceita estado trabalhado', () => {
    expect(() => insereDia('2026-09-01', 'trabalhado', null)).not.toThrow();
  });

  it('aceita estado parado, com motivo', () => {
    expect(() => insereDia('2026-09-02', 'parado', 'Domingo')).not.toThrow();
  });

  it('rejeita um terceiro estado', () => {
    expect(() => insereDia('2026-09-03', 'nao_lancado', null)).toThrow(
      /CHECK constraint failed/,
    );
  });

  // Decisão 4.1 e 20.1: dia parado tem motivo, texto livre e obrigatório.
  it('rejeita dia parado sem motivo', () => {
    expect(() => insereDia('2026-09-04', 'parado', null)).toThrow(
      /CHECK constraint failed/,
    );
  });

  it('rejeita dia parado com motivo só de espaços', () => {
    expect(() => insereDia('2026-09-05', 'parado', '   ')).toThrow(
      /CHECK constraint failed/,
    );
  });

  it('rejeita dia trabalhado com motivo de parada preenchido', () => {
    expect(() => insereDia('2026-09-06', 'trabalhado', 'Domingo')).toThrow(
      /CHECK constraint failed/,
    );
  });

  // Decisão 6.2 e arquitetura 2.17: o número do RDO congela NO FECHAMENTO. É a
  // única exceção à regra de que RDO nunca é armazenado, e o CHECK torna
  // impossível gravá-lo com o dia aberto.
  it('rejeita número de RDO congelado com o dia ainda aberto', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO dia_de_obra
             (obra_id, data, estado, registrado_por, registrado_em, numero_rdo_congelado)
           VALUES (?, '2026-09-07', 'trabalhado', ?, ?, 208)`,
        )
        .run(OBRA, USUARIO, INSTANTE),
    ).toThrow(/CHECK constraint failed/);
  });

  it('aceita dia fechado com autor, instante e número congelado juntos', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO dia_de_obra
             (obra_id, data, estado, registrado_por, registrado_em,
              fechado_por, fechado_em, numero_rdo_congelado)
           VALUES (?, '2026-09-08', 'trabalhado', ?, ?, ?, ?, 208)`,
        )
        .run(OBRA, USUARIO, INSTANTE, USUARIO, INSTANTE),
    ).not.toThrow();
  });

  it('rejeita fechamento sem número de RDO congelado', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO dia_de_obra
             (obra_id, data, estado, registrado_por, registrado_em, fechado_por, fechado_em)
           VALUES (?, '2026-09-09', 'trabalhado', ?, ?, ?, ?)`,
        )
        .run(OBRA, USUARIO, INSTANTE, USUARIO, INSTANTE),
    ).toThrow(/CHECK constraint failed/);
  });
});

describe('taxonomia fechada de turno e de lado', () => {
  beforeEach(() => {
    montaBase();
    insereDia('2026-09-01');
  });

  // regras-extraidas §4 e decisão 2.1: a letra N que a macro VBA pinta não
  // entra no produto. Arquitetura 2.20: o CHECK a rejeita no banco.
  it('rejeita a letra N de turno, que a macro VBA pintava', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_pluviometria
             (id, obra_id, data, noite_anterior, indice_mm_milesimos, autor_id, registrado_em, raiz_id)
           VALUES (?, ?, '2026-09-01', 'N', 0, ?, ?, ?)`,
        )
        .run(
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          OBRA,
          USUARIO,
          INSTANTE,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ),
    ).toThrow(/CHECK constraint failed/);
  });

  // Decisão 10.1: COMENTÁRIO CONTRATANTE sai sempre vazio na v1. Arquitetura,
  // decisão 19: o banco torna a regra impossível de furar por rota nova.
  it('rejeita observação do lado do contratante na v1', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_observacao
             (id, obra_id, data, lado, texto, autor_id, registrado_em, raiz_id)
           VALUES (?, ?, '2026-09-01', 'CONTRATANTE', 'texto', ?, ?, ?)`,
        )
        .run(
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          OBRA,
          USUARIO,
          INSTANTE,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ),
    ).toThrow(/CHECK constraint failed/);
  });

  it('aceita observação do lado CROS', () => {
    expect(() =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_observacao
             (id, obra_id, data, lado, texto, autor_id, registrado_em, raiz_id)
           VALUES (?, ?, '2026-09-01', 'CROS', 'texto', ?, ?, ?)`,
        )
        .run(
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          OBRA,
          USUARIO,
          INSTANTE,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ),
    ).not.toThrow();
  });
});

describe('chave estrangeira com RESTRICT', () => {
  beforeEach(() => {
    montaBase();
    insereDia('2026-09-01');
    insereProducao('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-09-01', 2210392);
  });

  // Arquitetura seção 1: "ON DELETE RESTRICT. Nada de CASCADE: apagar em
  // cascata é como se perde histórico de RDO."
  it('rejeita apagar obra que tem lançamento', () => {
    expect(() => sqlite().prepare(`DELETE FROM obra WHERE id = ?`).run(OBRA)).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('rejeita apagar o dia de obra que tem lançamento', () => {
    expect(() =>
      sqlite()
        .prepare(`DELETE FROM dia_de_obra WHERE obra_id = ? AND data = ?`)
        .run(OBRA, '2026-09-01'),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  // Arquitetura 2.18: a FK composta amarra lançamento ao dia; não existe o
  // estado "tem atividade mas o dia é não lançado" (decisão 13 da seção 7).
  it('rejeita lançamento em dia que não foi declarado', () => {
    expect(() =>
      insereProducao('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '2026-09-02', 1000),
    ).toThrow(/FOREIGN KEY constraint failed/);
  });

  // Arquitetura 2.18, decisão 9 da seção 7: cadeia linear de retificação.
  // Com bifurcação, "a versão vigente" deixa de ter resposta única.
  it('rejeita duas retificações do mesmo lançamento', () => {
    const original = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const primeira = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const segunda = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const retifica = (id: string) =>
      sqlite()
        .prepare(
          `INSERT INTO lancamento_producao
             (id, obra_id, data, servico_id, quantidade_milesimos, autor_id, registrado_em,
              raiz_id, retifica_id)
           VALUES (?, ?, '2026-09-01', ?, 1000, ?, ?, ?, ?)`,
        )
        .run(id, OBRA, SERVICO, USUARIO, INSTANTE, original, original);

    retifica(primeira);
    expect(() => retifica(segunda)).toThrow(/UNIQUE constraint failed/);
  });
});

describe('seed das taxonomias', () => {
  // Decisão 19.1: carga inicial por seed versionado, 12 funções, 8 tipos de
  // equipamento, 14 status, mais as 8 sugestões de motivo (20.1).
  // As listas estão em src/shared/taxonomia; o teste confere a contagem que a
  // regra declara, não o tamanho do array.
  function conta(tabela: string): number {
    const linha = conexao.sqlite
      .prepare(`SELECT COUNT(*) AS total FROM ${tabela}`)
      .get() as { total: number };
    return linha.total;
  }

  it('carrega 12 funções, 8 tipos de equipamento, 14 status e 8 sugestões', () => {
    semeiaTaxonomias(conexao.db);

    expect(conta('funcao')).toBe(12);
    expect(conta('tipo_equipamento')).toBe(8);
    expect(conta('status_atividade')).toBe(14);
    expect(conta('sugestao_motivo_parada')).toBe(8);
  });

  it('rodar o seed duas vezes não duplica nenhuma linha', () => {
    semeiaTaxonomias(conexao.db);
    semeiaTaxonomias(conexao.db);

    expect(conta('funcao')).toBe(12);
    expect(conta('tipo_equipamento')).toBe(8);
    expect(conta('status_atividade')).toBe(14);
    expect(conta('sugestao_motivo_parada')).toBe(8);
  });

  // Caso de teste obrigatório 13: `Perca de Produção` contra
  // `Perca de produção`. A unicidade do normalizado faz o duplicado falhar no
  // BANCO, não só no código. Arquitetura 2.7-2.9.
  it('rejeita termo repetido que só difere em caixa e espaço', () => {
    semeiaTaxonomias(conexao.db);

    expect(() =>
      conexao.sqlite
        .prepare(
          `INSERT INTO funcao (id, termo, termo_normalizado, ordem, ativo, criado_em)
           VALUES (?, ' servente ', 'servente', 99, 1, ?)`,
        )
        .run('cafecafe-cafe-4afe-8afe-cafecafecafe', INSTANTE),
    ).toThrow(/UNIQUE constraint failed/);
  });

  // Arquitetura 2.7-2.9: as taxonomias têm escopo de SISTEMA (19.2), por isso
  // não têm obra_id. Se ganharem um, vira "taxonomia por obra", que a 19.2
  // proibiu.
  it('não dá escopo de obra à taxonomia', () => {
    const colunas = (
      conexao.sqlite.pragma(`table_info('funcao')`) as { name: string }[]
    ).map((c) => c.name);

    expect(colunas).not.toContain('obra_id');
  });
});
