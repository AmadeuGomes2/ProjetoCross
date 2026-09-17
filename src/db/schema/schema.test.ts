/**
 * Teste de integração do esquema físico: Postgres em processo, migrations
 * aplicadas, e as invariantes provadas contra o BANCO, não contra o código da
 * aplicação. Por isso os inserts são SQL cru: o que se está afirmando é que a
 * regra continua valendo para uma rota nova que esqueça a validação da borda.
 *
 * Origem de toda expectativa deste arquivo:
 *   docs/arquitetura/v1.md, seção 1 (convenções) e seção 2 (as 22 tabelas)
 *   docs/dominio/regras-extraidas.md e as decisões de 16/09/2026 citadas caso a caso
 * Nenhum valor esperado aqui foi lido da implementação.
 *
 * ## O que a troca para Postgres, em 17/09/2026, mudou neste arquivo
 *
 * O banco deixou de ser SQLite (serverless não tem disco persistente), e este
 * era o arquivo mais acoplado ao driver. Três diferenças que atravessam tudo:
 *
 * - `conexao.sqlite` não existe: a escrita crua é `executa` e a leitura crua é
 *   `consulta`, as duas assíncronas, com marcador `$1` no lugar de `?`;
 * - a violação de `CHECK` diz `violates check constraint`, a de chave
 *   estrangeira diz `violates foreign key constraint` e a de unicidade diz
 *   `violates unique constraint`. As mensagens continuam sendo afirmadas:
 *   `toThrow()` sem mensagem não distingue "recusou pelo motivo certo" de
 *   "recusou por acidente";
 * - **dia puro deixou de ser `TEXT` com `CHECK` e virou o tipo `DATE`**, que
 *   valida o calendário nativamente. Os casos continuam, a recusa vem do tipo,
 *   e a mensagem é `date/time field value out of range`.
 *
 * Três casos não podiam ser traduzidos e foram repensados; cada um explica por
 * quê no lugar onde está: `PRAGMA foreign_keys`, coluna `REAL` e a contagem de
 * tabelas.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { criaBancoDeTeste } from '../../../test/fixtures/banco-de-teste';
import { semeiaTaxonomias } from '../seed';
import type { ConexaoRdo } from '../index';

/**
 * Cada caso ganha um banco novo, e cada banco novo é um Postgres inteiro
 * levantado em WebAssembly mais as 452 sentenças das migrations. Isso passa dos
 * 10 s padrão do `hookTimeout` em máquina lenta, e o teste falhava por relógio,
 * não por regra. O ajuste é deste arquivo — mexer em `vitest.config.mts` exige
 * perguntar (CLAUDE.md, Trabalho em paralelo).
 */
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

let conexao: ConexaoRdo;

/** Ids fixos: teste não sorteia, para que a falha seja sempre a mesma. */
const USUARIO = '11111111-1111-4111-8111-111111111111';
const OBRA = '22222222-2222-4222-8222-222222222222';
const SERVICO = '33333333-3333-4333-8333-333333333333';
const INSTANTE = '2026-09-16T12:00:00.000Z';

/**
 * Usuário + obra + serviço: o mínimo para as chaves estrangeiras.
 *
 * Não cria mais `status_atividade`: a fixture semeia as taxonomias (decisão
 * 19.1), e um segundo `Produção` colidiria com `ux_status_atividade_normalizado`
 * — que é justamente o que o caso obrigatório 13 quer que aconteça.
 */
async function montaBase(): Promise<void> {
  await conexao.executa(
    `INSERT INTO usuario (id, nome, email, criado_em) VALUES ($1, $2, $3, $4)`,
    [USUARIO, 'Usuario de Teste', 'teste@exemplo.invalido', INSTANTE],
  );
  await conexao.executa(
    `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                       escopo, nome_projeto, area, "local", criado_por, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
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
    ],
  );
  await conexao.executa(
    `INSERT INTO servico_controlado (id, obra_id, nome, nome_normalizado, ordem, ativo)
     VALUES ($1, $2, $3, $4, $5, 1)`,
    [SERVICO, OBRA, 'REC.(FRESA+CAPA)', 'rec.(fresa+capa)', 1],
  );
}

function insereDia(
  data: string,
  estado = 'trabalhado',
  motivo: string | null = null,
): Promise<void> {
  return conexao.executa(
    `INSERT INTO dia_de_obra (obra_id, data, estado, motivo_parada, registrado_por, registrado_em)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [OBRA, data, estado, motivo, USUARIO, INSTANTE],
  );
}

function insereProducao(id: string, data: string, milesimos: number): Promise<void> {
  return conexao.executa(
    `INSERT INTO lancamento_producao
       (id, obra_id, data, servico_id, quantidade_milesimos, autor_id, registrado_em, raiz_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, OBRA, data, SERVICO, milesimos, USUARIO, INSTANTE, id],
  );
}

/**
 * Lê como "o banco aceitou": a promessa cumpre e `executa` devolve void.
 *
 * `resolves.not.toThrow()` não serve — `toThrow` espera função, e o valor
 * resolvido aqui é `undefined`.
 */
async function aceita(operacao: Promise<void>): Promise<void> {
  await expect(operacao).resolves.toBeUndefined();
}

beforeEach(async () => {
  conexao = await criaBancoDeTeste();
});

afterEach(async () => {
  await conexao.fecha();
});

describe('conexão', () => {
  // Era `liga PRAGMA foreign_keys em toda conexão`, contra a arquitetura seção
  // 0: "PRAGMA foreign_keys = ON em toda conexão. Sem isso, metade das
  // integridades deste documento é decorativa."
  //
  // No Postgres não existe PRAGMA, e a chave estrangeira é SEMPRE verificada:
  // o desligamento silencioso que o SQLite permitia não tem como acontecer. O
  // caso vira comportamental — uma linha que aponta para pai inexistente é
  // recusada —, e prova o efeito que a configuração servia para garantir, que é
  // melhor do que provar a configuração.
  it('recusa linha que aponta para pai inexistente', async () => {
    await montaBase();
    const OBRA_INEXISTENTE = 'deadbeef-dead-4ead-8ead-deadbeefdead';

    await expect(
      conexao.executa(
        `INSERT INTO dia_de_obra (obra_id, data, estado, registrado_por, registrado_em)
         VALUES ($1, '2026-09-01', 'trabalhado', $2, $3)`,
        [OBRA_INEXISTENTE, USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates foreign key constraint/);
  });

  // Era `não tem nenhuma coluna REAL no esquema inteiro`, contra a arquitetura
  // seção 0 e CLAUDE.md, Quantidades: ponto flutuante binário não soma
  // acumulado, e por isso quantidade é INTEGER em milésimos.
  //
  // `REAL` do SQLite vira dois tipos no Postgres, `real` e `double precision`,
  // e a consulta ao `sqlite_master` vira consulta ao `information_schema`.
  // `numeric` entra na lista por um motivo diferente: ele é exato e somaria
  // certo, mas a decisão 1 da arquitetura seção 7 diz que quantidade é INTEGER
  // de milésimos — uma coluna decimal no esquema significa que alguém abandonou
  // a escala em milésimos, e é essa deriva que este teste existe para pegar.
  it('não tem nenhuma coluna de ponto flutuante nem decimal no esquema inteiro', async () => {
    const colunas = await conexao.consulta<{
      tabela: string;
      coluna: string;
      tipo: string;
    }>(
      `SELECT table_name AS tabela, column_name AS coluna, data_type AS tipo
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND data_type IN ('real', 'double precision', 'numeric')
        ORDER BY table_name, column_name`,
    );

    expect(colunas.map((c) => `${c.tabela}.${c.coluna} (${c.tipo})`)).toEqual([]);
  });

  // Arquitetura seção 2: "São 22 tabelas, mais a tabela de controle do Drizzle."
  // O `sqlite_master` não existe; a lista vem do `information_schema`, no
  // esquema `public`, sem a tabela de controle de migration do Drizzle.
  it('cria as 22 tabelas do modelo físico', async () => {
    const linhas = await conexao.consulta<{ nome: string }>(
      `SELECT table_name AS nome
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name <> '__drizzle_migrations'
        ORDER BY table_name`,
    );

    expect(linhas.map((t) => t.nome)).toEqual([
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
  //
  // A recusa mudou de dono: era um CHECK sobre TEXT, agora é o tipo DATE, que
  // conhece o calendário. Por isso a mensagem é do tipo, não da restrição.
  it('rejeita 2026-09-31, que não existe no calendário', async () => {
    await expect(insereDia('2026-09-31')).rejects.toThrow(
      /date\/time field value out of range/,
    );
  });

  it('aceita 2026-09-30, o último dia real de setembro', async () => {
    await aceita(insereDia('2026-09-30'));
  });

  // 2026 não é bissexto. Mesma família de defeito do 31/09.
  it('rejeita 29 de fevereiro em ano não bissexto', async () => {
    await expect(insereDia('2026-02-29')).rejects.toThrow(
      /date\/time field value out of range/,
    );
  });

  it('rejeita mês 13, que passa pelo formato mas não pelo calendário', async () => {
    await expect(insereDia('2026-13-01')).rejects.toThrow(
      /date\/time field value out of range/,
    );
  });

  // CLAUDE.md, Datas: "Exibição sempre em pt-BR". Armazenamento nunca.
  it('rejeita data gravada em dd/mm/aaaa', async () => {
    await expect(insereDia('30/09/2026')).rejects.toThrow(
      /date\/time field value out of range/,
    );
  });

  // Era `rejeita dia com hora junto`. O tipo DATE **não** recusa uma string com
  // hora: ele descarta a hora. O que a regra teme não é a hora em si — é o dia
  // deslocado pelo fuso escondido (CLAUDE.md, Modelo: "Nunca dependa do fuso do
  // servidor"), e é isso que o caso passa a provar. Com o fuso da sessão em
  // UTC-11, a conversão do instante levaria 01/10 para 30/09; o dia guardado
  // tem de continuar sendo 01/10, o dia que foi escrito.
  //
  // Recusar a string com hora continua sendo trabalho da borda, no tipo
  // `DiaPuro` de shared/date — o banco garante o efeito, não o formato.
  it('guarda o dia escrito, sem deslocar, quando a data vem com hora junto', async () => {
    await conexao.executa(`SET TimeZone = 'Pacific/Pago_Pago'`);

    await insereDia('2026-10-01T01:00:00.000Z');

    const linhas = await conexao.consulta<{ dia: string }>(
      `SELECT to_char(data, 'YYYY-MM-DD') AS dia FROM dia_de_obra WHERE obra_id = $1`,
      [OBRA],
    );
    expect(linhas.map((l) => l.dia)).toEqual(['2026-10-01']);
  });

  // Arquitetura 2.1: CHECK (data_termino >= data_inicio), R14. A planilha tem
  // um período de -716 dias. Caso de teste obrigatório 9.
  it('rejeita obra com término anterior ao início', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO obra (id, contrato, contratante, contratada, data_inicio, data_termino,
                           escopo, nome_projeto, area, "local", criado_por, criado_em)
         VALUES ($1, 'C', 'A', 'B', '2027-02-05', '2026-02-05', 'E', 'P', 'A', 'L', $2, $3)`,
        ['55555555-5555-4555-8555-555555555555', USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  // Arquitetura 2.2: mesma regra no período de BMS (R14, R25).
  it('rejeita período de BMS com data final anterior à inicial', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO periodo_bms (id, obra_id, numero, data_inicial, data_final, criado_por, criado_em)
         VALUES ($1, $2, 1, '2026-03-10', '2026-03-01', $3, $4)`,
        ['66666666-6666-4666-8666-666666666666', OBRA, USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });
});

describe('quantidade em milésimos', () => {
  beforeEach(async () => {
    await montaBase();
    await insereDia('2026-09-01');
  });

  // Decisão 13.3: produção maior que zero. "Não houve produção" é a ausência do
  // lançamento, não um lançamento negativo.
  it('rejeita produção com quantidade negativa', async () => {
    await expect(
      insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', -1000),
    ).rejects.toThrow(/violates check constraint/);
  });

  // Decisão 13.3, fronteira: zero também é recusado.
  it('rejeita produção com quantidade zero', async () => {
    await expect(
      insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', 0),
    ).rejects.toThrow(/violates check constraint/);
  });

  it('aceita produção de 1 milésimo, a menor quantidade representável', async () => {
    await aceita(insereProducao('77777777-7777-4777-8777-777777777777', '2026-09-01', 1));
  });

  // Decisão 13.4: quantidade de projeto maior que zero (arquitetura 2.16).
  it('rejeita quantidade de projeto negativa', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO quantidade_projeto_versao
           (id, obra_id, servico_id, quantidade_milesimos, definido_por, definido_em)
         VALUES ($1, $2, $3, -1, $4, $5)`,
        ['88888888-8888-4888-8888-888888888888', OBRA, SERVICO, USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  // Arquitetura 2.20: CHECK (0 <= x AND x <= 1000000), R23. Índice de chuva não
  // é negativo.
  it('rejeita índice pluviométrico negativo', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO lancamento_pluviometria
           (id, obra_id, data, noite_anterior, manha, tarde, indice_mm_milesimos,
            autor_id, registrado_em, raiz_id)
         VALUES ($1, $2, '2026-09-01', 'B', 'B', 'B', -1, $3, $4, $5)`,
        [
          '99999999-9999-4999-8999-999999999999',
          OBRA,
          USUARIO,
          INSTANTE,
          '99999999-9999-4999-8999-999999999999',
        ],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  // Decisão 3.2 e regras-extraidas §4: chuva com índice 0 é caso real e
  // continua valendo "Trabalhado". Zero precisa ser gravável.
  it('aceita índice pluviométrico zero', async () => {
    await aceita(
      conexao.executa(
        `INSERT INTO lancamento_pluviometria
           (id, obra_id, data, noite_anterior, manha, tarde, indice_mm_milesimos,
            autor_id, registrado_em, raiz_id)
         VALUES ($1, $2, '2026-09-01', 'C', NULL, NULL, 0, $3, $4, $5)`,
        [
          '99999999-9999-4999-8999-999999999999',
          OBRA,
          USUARIO,
          INSTANTE,
          '99999999-9999-4999-8999-999999999999',
        ],
      ),
    );
  });
});

describe('estado do dia', () => {
  beforeEach(montaBase);

  // Decisão 4.2: os estados são três, e `não lançado` é AUSÊNCIA DE LINHA.
  // Por isso a coluna só aceita dois valores (arquitetura 2.17).
  it('aceita estado trabalhado', async () => {
    await aceita(insereDia('2026-09-01', 'trabalhado', null));
  });

  it('aceita estado parado, com motivo', async () => {
    await aceita(insereDia('2026-09-02', 'parado', 'Domingo'));
  });

  it('rejeita um terceiro estado', async () => {
    await expect(insereDia('2026-09-03', 'nao_lancado', null)).rejects.toThrow(
      /violates check constraint/,
    );
  });

  // Decisão 4.1 e 20.1: dia parado tem motivo, texto livre e obrigatório.
  it('rejeita dia parado sem motivo', async () => {
    await expect(insereDia('2026-09-04', 'parado', null)).rejects.toThrow(
      /violates check constraint/,
    );
  });

  it('rejeita dia parado com motivo só de espaços', async () => {
    await expect(insereDia('2026-09-05', 'parado', '   ')).rejects.toThrow(
      /violates check constraint/,
    );
  });

  it('rejeita dia trabalhado com motivo de parada preenchido', async () => {
    await expect(insereDia('2026-09-06', 'trabalhado', 'Domingo')).rejects.toThrow(
      /violates check constraint/,
    );
  });

  // Decisão 6.2 e arquitetura 2.17: o número do RDO congela NO FECHAMENTO. É a
  // única exceção à regra de que RDO nunca é armazenado, e o CHECK torna
  // impossível gravá-lo com o dia aberto.
  it('rejeita número de RDO congelado com o dia ainda aberto', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO dia_de_obra
           (obra_id, data, estado, registrado_por, registrado_em, numero_rdo_congelado)
         VALUES ($1, '2026-09-07', 'trabalhado', $2, $3, 208)`,
        [OBRA, USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  it('aceita dia fechado com autor, instante e número congelado juntos', async () => {
    await aceita(
      conexao.executa(
        `INSERT INTO dia_de_obra
           (obra_id, data, estado, registrado_por, registrado_em,
            fechado_por, fechado_em, numero_rdo_congelado)
         VALUES ($1, '2026-09-08', 'trabalhado', $2, $3, $4, $5, 208)`,
        [OBRA, USUARIO, INSTANTE, USUARIO, INSTANTE],
      ),
    );
  });

  it('rejeita fechamento sem número de RDO congelado', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO dia_de_obra
           (obra_id, data, estado, registrado_por, registrado_em, fechado_por, fechado_em)
         VALUES ($1, '2026-09-09', 'trabalhado', $2, $3, $4, $5)`,
        [OBRA, USUARIO, INSTANTE, USUARIO, INSTANTE],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });
});

describe('taxonomia fechada de turno e de lado', () => {
  beforeEach(async () => {
    await montaBase();
    await insereDia('2026-09-01');
  });

  // regras-extraidas §4 e decisão 2.1: a letra N que a macro VBA pinta não
  // entra no produto. Arquitetura 2.20: o CHECK a rejeita no banco.
  it('rejeita a letra N de turno, que a macro VBA pintava', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO lancamento_pluviometria
           (id, obra_id, data, noite_anterior, indice_mm_milesimos, autor_id, registrado_em, raiz_id)
         VALUES ($1, $2, '2026-09-01', 'N', 0, $3, $4, $5)`,
        [
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          OBRA,
          USUARIO,
          INSTANTE,
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        ],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  // Decisão 10.1: COMENTÁRIO CONTRATANTE sai sempre vazio na v1. Arquitetura,
  // decisão 19: o banco torna a regra impossível de furar por rota nova.
  it('rejeita observação do lado do contratante na v1', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO lancamento_observacao
           (id, obra_id, data, lado, texto, autor_id, registrado_em, raiz_id)
         VALUES ($1, $2, '2026-09-01', 'CONTRATANTE', 'texto', $3, $4, $5)`,
        [
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          OBRA,
          USUARIO,
          INSTANTE,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ],
      ),
    ).rejects.toThrow(/violates check constraint/);
  });

  it('aceita observação do lado CROS', async () => {
    await aceita(
      conexao.executa(
        `INSERT INTO lancamento_observacao
           (id, obra_id, data, lado, texto, autor_id, registrado_em, raiz_id)
         VALUES ($1, $2, '2026-09-01', 'CROS', 'texto', $3, $4, $5)`,
        [
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          OBRA,
          USUARIO,
          INSTANTE,
          'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        ],
      ),
    );
  });
});

describe('chave estrangeira com RESTRICT', () => {
  beforeEach(async () => {
    await montaBase();
    await insereDia('2026-09-01');
    await insereProducao('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '2026-09-01', 2210392);
  });

  // Arquitetura seção 1: "ON DELETE RESTRICT. Nada de CASCADE: apagar em
  // cascata é como se perde histórico de RDO."
  //
  // O Postgres distingue as duas recusas, e a distinção é útil: apagar pai com
  // filho sob RESTRICT diz `violates RESTRICT setting of foreign key
  // constraint` — a mensagem nomeia o RESTRICT, então ela também prova que não
  // virou CASCADE, que é exatamente o que a regra proíbe. Inserir filho sem pai
  // continua dizendo `violates foreign key constraint`.
  it('rejeita apagar obra que tem lançamento', async () => {
    await expect(
      conexao.executa(`DELETE FROM obra WHERE id = $1`, [OBRA]),
    ).rejects.toThrow(/violates RESTRICT setting of foreign key constraint/);
  });

  it('rejeita apagar o dia de obra que tem lançamento', async () => {
    await expect(
      conexao.executa(`DELETE FROM dia_de_obra WHERE obra_id = $1 AND data = $2`, [
        OBRA,
        '2026-09-01',
      ]),
    ).rejects.toThrow(/violates RESTRICT setting of foreign key constraint/);
  });

  // Arquitetura 2.18: a FK composta amarra lançamento ao dia; não existe o
  // estado "tem atividade mas o dia é não lançado" (decisão 13 da seção 7).
  it('rejeita lançamento em dia que não foi declarado', async () => {
    await expect(
      insereProducao('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '2026-09-02', 1000),
    ).rejects.toThrow(/violates foreign key constraint/);
  });

  // Arquitetura 2.18, decisão 9 da seção 7: cadeia linear de retificação.
  // Com bifurcação, "a versão vigente" deixa de ter resposta única.
  it('rejeita duas retificações do mesmo lançamento', async () => {
    const original = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const primeira = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    const segunda = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
    const retifica = (id: string): Promise<void> =>
      conexao.executa(
        `INSERT INTO lancamento_producao
           (id, obra_id, data, servico_id, quantidade_milesimos, autor_id, registrado_em,
            raiz_id, retifica_id)
         VALUES ($1, $2, '2026-09-01', $3, 1000, $4, $5, $6, $7)`,
        [id, OBRA, SERVICO, USUARIO, INSTANTE, original, original],
      );

    await retifica(primeira);
    await expect(retifica(segunda)).rejects.toThrow(/violates unique constraint/);
  });
});

describe('seed das taxonomias', () => {
  // Decisão 19.1: carga inicial por seed versionado, 12 funções, 8 tipos de
  // equipamento, 14 status, mais as 8 sugestões de motivo (20.1).
  // As listas estão em src/shared/taxonomia; o teste confere a contagem que a
  // regra declara, não o tamanho do array.
  //
  // `COUNT(*)` é `bigint` no Postgres, e o driver devolveria texto; o `::int`
  // mantém o número que a asserção compara.
  async function conta(tabela: string): Promise<number> {
    const linhas = await conexao.consulta<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM ${tabela}`,
    );
    return linhas[0]?.total ?? -1;
  }

  // `criaBancoDeTeste` já roda o seed uma vez, então este caso confere a carga
  // de uma execução — o mesmo que o teste fazia quando ele próprio chamava o
  // seed depois de migrar um banco vazio.
  it('carrega 12 funções, 8 tipos de equipamento, 14 status e 8 sugestões', async () => {
    expect(await conta('funcao')).toBe(12);
    expect(await conta('tipo_equipamento')).toBe(8);
    expect(await conta('status_atividade')).toBe(14);
    expect(await conta('sugestao_motivo_parada')).toBe(8);
  });

  // Segunda execução: a da fixture mais esta. Idempotência é o que se afirma.
  it('rodar o seed duas vezes não duplica nenhuma linha', async () => {
    await semeiaTaxonomias(conexao.db, INSTANTE);

    expect(await conta('funcao')).toBe(12);
    expect(await conta('tipo_equipamento')).toBe(8);
    expect(await conta('status_atividade')).toBe(14);
    expect(await conta('sugestao_motivo_parada')).toBe(8);
  });

  // Caso de teste obrigatório 13: `Perca de Produção` contra
  // `Perca de produção`. A unicidade do normalizado faz o duplicado falhar no
  // BANCO, não só no código. Arquitetura 2.7-2.9. `Servente` está entre as 12
  // funções semeadas, e ' servente ' é a mesma função com outra caixa e espaço.
  it('rejeita termo repetido que só difere em caixa e espaço', async () => {
    await expect(
      conexao.executa(
        `INSERT INTO funcao (id, termo, termo_normalizado, ordem, ativo, criado_em)
         VALUES ($1, ' servente ', 'servente', 99, 1, $2)`,
        ['cafecafe-cafe-4afe-8afe-cafecafecafe', INSTANTE],
      ),
    ).rejects.toThrow(/violates unique constraint/);
  });

  // Arquitetura 2.7-2.9: as taxonomias têm escopo de SISTEMA (19.2), por isso
  // não têm obra_id. Se ganharem um, vira "taxonomia por obra", que a 19.2
  // proibiu.
  it('não dá escopo de obra à taxonomia', async () => {
    const colunas = await conexao.consulta<{ coluna: string }>(
      `SELECT column_name AS coluna
         FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'funcao'`,
    );

    expect(colunas.map((c) => c.coluna)).not.toContain('obra_id');
  });
});
