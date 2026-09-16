/**
 * O circuito inteiro, de ponta a ponta: cadastro → lançamento → RDO → PDF.
 *
 * Os testes de módulo provam cada cálculo contra duplas. Este arquivo responde
 * à outra pergunta, que nenhum deles responde: **as peças estão ligadas?** Três
 * laudos de 16/09/2026 apontaram a mesma raiz — a camada de composição devolvia
 * recusa fixa em 11 portas, e nenhuma rota expunha o PDF. Um circuito aberto
 * não aparece em teste de unidade.
 *
 * Por isso aqui nada é dublê: banco real em memória com as migrations
 * aplicadas, os casos de uso de verdade das três frentes, a composição de
 * verdade e o manipulador de rota de verdade.
 *
 * Origem das expectativas — nenhuma lida da implementação:
 *
 * - efetivo e a pessoa que conta no dia da saída: `regras-extraidas.md` §1 e
 *   decisão 1.1; caso obrigatório 1 da skill `template-caso-teste`;
 * - acumulado recalculado do zero: `regras-extraidas.md` §2, R5;
 * - número do RDO `dia − início`, com 01/09/2026 = 208: `regras-rdo` §3. Daí
 *   03/09/2026 = 210, por contagem de dia corrido;
 * - resumo do dia com chuva e índice ≥ 10: decisão 3.1;
 * - trilha de exportação gravada antes de entregar o arquivo: R20, CLAUDE.md,
 *   seção Segurança;
 * - recusa ao encarregado de outra obra, com o mesmo erro de obra inexistente:
 *   `docs/arquitetura/v1.md`, 4.9 e 5.2.
 *
 * Dado sintético, sempre: `P1`, `P2` e `R1` são rótulos do PRD, não pessoas.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET as exportaPdfDaRota } from '../src/app/(rdo)/rdo/[obraId]/[dia]/pdf/route';
import {
  criaAmbienteDaComposicao,
  defineAmbienteParaTeste,
  restauraAmbientePadrao,
} from '../src/app/_composicao/ambiente';
import { paraAcesso } from '../src/app/_composicao/ambiente-de-cadastro';
import {
  cadastraEquipamentoProtegido,
  cadastraPeriodoBmsProtegido,
  cadastraPessoaProtegida,
  defineQuantidadeDeProjetoProtegida,
  defineResponsavelTecnicoProtegido,
  listaServicosProtegida,
} from '../src/app/_composicao/cadastro';
import { casosDeLancamento, portasDeLancamento } from '../src/app/_composicao/lancamento';
import { consultaRdoProtegida } from '../src/app/_composicao/rdo-diario';
import { abreSessao, NOME_DO_COOKIE_DE_SESSAO, type Ator } from '../src/modules/acesso';
import { CODIGO_ERRO } from '../src/shared/result';
import type { ObraId, ServicoControladoId } from '../src/shared/id';
import { relogioFixo } from './fixtures/banco-de-teste';
import {
  AGORA,
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

/** 03/09/2026: 210 dias corridos depois de 05/02/2026, o início do contrato. */
const DIA = '2026-09-03';
const VESPERA = '2026-09-02';
const NUMERO_DO_RDO_ESPERADO = 210;

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;
let servicoId: ServicoControladoId;

function exige<T>(resultado: { ok: boolean }, o_que: string): T {
  if (!resultado.ok) {
    const comErro = resultado as { erro?: { mensagem?: string } };
    throw new Error(`${o_que}: ${comErro.erro?.mensagem ?? 'recusado'}`);
  }
  return (resultado as unknown as { valor: T }).valor;
}

/** Libera o encarregado por SQL cru: o convite tem teste próprio. */
function daAcessoDeEncarregado(ator: Ator, obra: ObraId, acessoId: string): Ator {
  cenario.conexao.sqlite
    .prepare(
      `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
       VALUES (?, ?, ?, 'encarregado', ?, ?)`,
    )
    .run(acessoId, obra, ator.usuarioId, e1.usuarioId, AGORA);
  return ator;
}

function requisicaoDoPdf(ator: Ator, obra: ObraId, dia: string): Request {
  const sessao = abreSessao(ator.usuarioId, paraAcesso(cenario.amb));
  return new Request(`https://exemplo.invalido/rdo/${obra}/${dia}/pdf`, {
    headers: { cookie: `${NOME_DO_COOKIE_DE_SESSAO}=${sessao.token}` },
  });
}

function chamaRotaDoPdf(ator: Ator, obra: ObraId, dia: string): Promise<Response> {
  return exportaPdfDaRota(requisicaoDoPdf(ator, obra, dia), {
    params: Promise.resolve({ obraId: obra, dia }),
  });
}

beforeEach(async () => {
  cenario = montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));

  e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb);

  // 1. cadastro: período de BMS que cobre o dia, pessoal, equipamento, serviço.
  exige(
    cadastraPeriodoBmsProtegido(
      e1,
      obraId,
      { numero: 8, dataInicial: '2026-09-01', dataFinal: '2026-09-30' },
      cenario.amb,
    ),
    'período de BMS',
  );

  exige(
    cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    ),
    'pessoa P1',
  );
  // P2 sai no próprio dia consultado: a saída é o último dia trabalhado (1.1).
  exige(
    cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P2', funcao: 'Servente', entrada: '2026-02-10', saida: DIA },
      cenario.amb,
    ),
    'pessoa P2',
  );
  // P3 saiu na véspera: não conta no dia consultado.
  exige(
    cadastraPessoaProtegida(
      e1,
      obraId,
      { nome: 'P3', funcao: 'Servente', entrada: '2026-02-10', saida: VESPERA },
      cenario.amb,
    ),
    'pessoa P3',
  );

  exige(
    cadastraEquipamentoProtegido(
      e1,
      obraId,
      { identificador: 'CF-29', tipo: 'PATROL', entrada: '2026-02-10' },
      cenario.amb,
    ),
    'equipamento CF-29',
  );

  exige(
    defineResponsavelTecnicoProtegido(
      e1,
      obraId,
      {
        respTecnicoNome: 'R1',
        respTecnicoTitulo: 'Engenheiro Civil',
        respTecnicoCrea: 'CREA - MG 000000/D',
      },
      cenario.amb,
    ),
    'responsável técnico',
  );

  const servicos = exige<{ servicoId: ServicoControladoId; nome: string }[]>(
    listaServicosProtegida(e1, obraId, cenario.amb),
    'serviços controlados',
  );
  const primeiro = servicos[0];
  if (primeiro === undefined) throw new Error('A obra nasceu sem serviço controlado.');
  servicoId = primeiro.servicoId;
  exige(
    defineQuantidadeDeProjetoProtegida(e1, obraId, servicoId, '10000', cenario.amb),
    'quantidade de projeto',
  );

  // 2. lançamento do dia: atividade, produção (em dois dias), pluviometria e
  // observação, pelos casos de uso de verdade da frente B.
  const casos = casosDeLancamento(portasDeLancamento());
  exige(
    await casos.recebeProducao(
      {
        obraId,
        data: VESPERA,
        servico: { tipo: 'id', id: servicoId },
        quantidade: '1000',
      },
      e1,
    ),
    'produção da véspera',
  );
  exige(
    await casos.recebeAtividade(
      {
        obraId,
        data: DIA,
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'termo', termo: 'Produção' },
      },
      e1,
    ),
    'atividade do dia',
  );
  exige(
    await casos.recebeProducao(
      {
        obraId,
        data: DIA,
        servico: { tipo: 'id', id: servicoId },
        quantidade: '2210.392',
      },
      e1,
    ),
    'produção do dia',
  );
  exige(
    await casos.recebePluviometria(
      { obraId, data: DIA, noiteAnterior: 'B', manha: 'C', tarde: 'B', indiceMm: '12' },
      e1,
    ),
    'pluviometria do dia',
  );
  exige(
    await casos.recebeObservacao(
      { obraId, data: DIA, texto: 'Frente liberada pela fiscalização.' },
      e1,
    ),
    'observação do dia',
  );
});

afterEach(() => {
  restauraAmbientePadrao();
  cenario.fecha();
});

describe('o RDO diário sai pelo caminho real da composição', () => {
  it('monta o documento com cabeçalho, BMS e número do RDO do contrato', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const rdo = resultado.valor;

    expect(rdo.identificacao.dataBr).toBe('03/09/2026');
    expect(rdo.identificacao.bms).toBe(8);
    // R4: dia corrido desde 05/02/2026, com o primeiro dia sendo o RDO 0.
    expect(rdo.identificacao.numeroDoRdo).toBe(NUMERO_DO_RDO_ESPERADO);
    expect(rdo.informacoesGerais.contrato).toBe(DADOS_DA_OBRA.contrato);
  });

  it('conta o efetivo de pessoal pela regra do dia da saída, agregado por função', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const bloco = resultado.valor.efetivoPessoal;

    const comGente = bloco.colunas.filter((c) => c.quantidade > 0);
    expect(comGente.map((c) => [c.rotulo, c.quantidade])).toEqual([
      ['Servente', 1],
      ['Motorista', 1],
    ]);
    // P3 saiu na véspera e não entra; P2 sai hoje e entra.
    expect(bloco.total).toBe(2);
    // Gabarito, bloco 5: quantidade zero sai em branco, não como `0`.
    expect(bloco.colunas.find((c) => c.quantidade === 0)?.texto).toBe('');
    expect(JSON.stringify(bloco)).not.toContain('P1');
  });

  it('conta o equipamento por identificador, e nunca pelo tipo', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const bloco = resultado.valor.efetivoEquipamentos;

    expect(bloco.colunas.map((c) => c.rotulo)).toEqual(['CF-29']);
    expect(bloco.total).toBe(1);
    expect(JSON.stringify(bloco)).not.toContain('PATROL');
  });

  it('recalcula o acumulado somando os lançamentos até o dia, inclusive', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const linha = resultado.valor.producao.find((l) => l.servicoId === servicoId);
    expect(linha?.executado.toString()).toBe('2210.392');
    // 1000 da véspera + 2210,392 do dia. Recalculado do zero, nunca guardado.
    expect(linha?.acumulado.toString()).toBe('3210.392');
    expect(linha?.acumuladoTexto).toBe('3.210,39');
  });

  it('traz a atividade do dia com a grafia exata do status', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.valor.atividades).toEqual([
      {
        tipo: 'atividade',
        lancamentoId: expect.any(String),
        descricao: 'Fresagem da Rua A',
        status: 'Produção',
      },
    ]);
  });

  it('aplica a árvore corrigida do resumo do dia: chuva com 12 mm é perca de produção', async () => {
    const resultado = await consultaRdoProtegida(e1, { obraId, dia: DIA });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    expect(resultado.valor.pluviometria.manha).toBe('C');
    expect(resultado.valor.pluviometria.indiceTexto).toBe('12 mm');
    expect(resultado.valor.resumoDoDia).toBe('Perca de produção');
    expect(resultado.valor.comentariosCros.textos).toEqual([
      'Frente liberada pela fiscalização.',
    ]);
  });
});

describe('o PDF sai pela rota, e a exportação fica registrada', () => {
  it('entrega bytes com o nome de arquivo da decisão 17.3', async () => {
    const resposta = await chamaRotaDoPdf(e1, obraId, DIA);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('content-type')).toBe('application/pdf');
    expect(resposta.headers.get('content-disposition')).toContain(
      `rdo-${DIA}-n${NUMERO_DO_RDO_ESPERADO}.pdf`,
    );

    const bytes = new Uint8Array(await resposta.arrayBuffer());
    expect(bytes.byteLength).toBeGreaterThan(1000);
    // Assinatura do formato: sem isto "veio bytes" não prova que veio PDF.
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('%PDF');
  });

  it('grava a trilha com id do usuário, obra, dia e formato — nunca nome', async () => {
    await chamaRotaDoPdf(e1, obraId, DIA);

    const linhas = cenario.conexao.sqlite
      .prepare('SELECT obra_id, usuario_id, data_rdo, formato FROM registro_exportacao')
      .all();

    expect(linhas).toEqual([
      { obra_id: obraId, usuario_id: e1.usuarioId, data_rdo: DIA, formato: 'PDF' },
    ]);
  });
});

describe('a fronteira de confiança recusa quem não é da obra', () => {
  let c1DeOutraObra: Ator;

  beforeEach(() => {
    // A obra B nasce pelas mãos de E1, que já é engenheiro da obra A: desde a
    // decisão 25.1 é assim que uma segunda obra existe. O que está sob teste
    // aqui é o encarregado da obra B diante da obra A, e isso não muda.
    const obraB = criaObraDoPrd(e1, cenario.amb, {
      contrato: 'P9999/01-25 - BLOCO 09',
    });
    c1DeOutraObra = daAcessoDeEncarregado(
      cenario.novoAtor('c1@exemplo.invalido'),
      obraB,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    );
  });

  it('recusa a consulta do RDO e não revela nada da obra alheia', async () => {
    const resultado = await consultaRdoProtegida(c1DeOutraObra, { obraId, dia: DIA });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(JSON.stringify(resultado.erro)).not.toContain(DADOS_DA_OBRA.contrato);
    expect(JSON.stringify(resultado.erro)).not.toContain('R1');
  });

  it('recusa a rota do PDF com 403 e não grava trilha de exportação', async () => {
    const resposta = await chamaRotaDoPdf(c1DeOutraObra, obraId, DIA);

    expect(resposta.status).toBe(403);
    const linhas = cenario.conexao.sqlite
      .prepare('SELECT id FROM registro_exportacao')
      .all();
    expect(linhas).toEqual([]);
  });

  it('recusa o PDF ao encarregado da própria obra: só o engenheiro exporta', async () => {
    const c2 = daAcessoDeEncarregado(
      cenario.novoAtor('c2@exemplo.invalido'),
      obraId,
      'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    );

    const resposta = await chamaRotaDoPdf(c2, obraId, DIA);

    expect(resposta.status).toBe(403);
  });
});
