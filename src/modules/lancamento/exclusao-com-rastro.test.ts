/**
 * Decisão 30.1 — **o engenheiro exclui qualquer lançamento**, de qualquer autor,
 * inclusive em dia fechado, e **excluir não apaga linha**.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/prd/v1.md`, DECISÕES TOMADAS, 30.1: "O engenheiro edita e exclui
 *   qualquer lançamento, de qualquer autor, inclusive em dia fechado. Toda
 *   edição e exclusão deixa registro no histórico: o RDO é documento contratual
 *   e alteração sem rastro não é aceitável";
 * - `CLAUDE.md`, seção Modelo: "RDO entregue ao fiscal não muda em silêncio".
 *   Daí sai o rastro obrigatório — quem excluiu, quando e por quê — e daí sai o
 *   motivo ser obrigatório: sem ele ninguém entende meses depois por que o
 *   número mudou;
 * - decisão 22.1 (`regras-rdo` §5): mudança em dia fechado é do engenheiro. O
 *   encarregado continua limitado ao que é dele e ao dia aberto;
 * - `regras-rdo` §2, R5: o acumulado é **sempre recalculado**, nunca guardado.
 *   Excluir uma produção de março tem que corrigir setembro sem ação extra;
 * - decisão 24.1 (`regras-rdo` §5): marcar como parado um dia que já tem
 *   atividade é recusado. Excluída a atividade, o dia volta a aceitar a troca.
 *
 * O caso do acumulado é o que trava a otimização errada: se algum dia alguém
 * guardar o acumulado numa coluna, é este teste que cai.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { criaCasosDeLancamento } from './index';
import {
  C1,
  C2,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  E1,
  OBRA_B02,
  quantidade,
  relogioQueAvanca,
} from './teste/duplas';

const AGORA = '2026-09-16T12:00:00.000Z';
const DIA = '2026-09-03';
const DIA_SEGUINTE = '2026-09-04';
const MOTIVO = 'Lançado na data errada; refeito no dia certo.';

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioQueAvanca(AGORA),
  });
  return { repositorio, portas, casos };
}

type Casos = ReturnType<typeof monta>['casos'];
type Portas = ReturnType<typeof monta>['portas'];

async function lancaFresagem(casos: Casos, portas: Portas, autor = C1, data = DIA) {
  const r = await casos.lancaAtividade(
    {
      obraId: OBRA_B02,
      data: dia(data),
      descricao: 'Fresagem da Rua A',
      status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      chaveDeRascunho: null,
    },
    { usuarioId: autor },
  );
  if (!r.ok) throw new Error(`Preparação do teste falhou: ${r.erro.codigo}`);
  return r.valor.id;
}

async function lancaProducao(casos: Casos, portas: Portas, data: string, valor: string) {
  const r = await casos.lancaProducao(
    {
      obraId: OBRA_B02,
      data: dia(data),
      servico: { tipo: 'id', id: portas.idDoServico('REC.(FRESA+CAPA)') },
      quantidade: quantidade(valor),
      chaveDeRascunho: null,
    },
    { usuarioId: C1 },
  );
  if (!r.ok) throw new Error(`Preparação do teste falhou: ${r.erro.codigo}`);
  return r.valor.id;
}

async function fecha(casos: Casos, data = DIA) {
  const r = await casos.fechaDia(
    { obraId: OBRA_B02, data: dia(data) },
    { usuarioId: E1 },
  );
  if (!r.ok) throw new Error(`Preparação do teste falhou: ${r.erro.codigo}`);
}

async function acumuladoEm(casos: Casos, portas: Portas, data: string) {
  const servicoId = portas.idDoServico('REC.(FRESA+CAPA)');
  const soma = await casos.somaProducaoAte(OBRA_B02, dia(data));
  if (!soma.ok) throw new Error('Leitura do acumulado falhou');
  return soma.valor.find((p) => p.servicoId === servicoId)?.quantidade.toString() ?? '0';
}

describe('decisão 30.1: excluir lançamento deixa rastro e não apaga linha', () => {
  it('excluir a produção de 100 do dia fechado derruba de 150 para 50 o acumulado do dia seguinte', async () => {
    const { casos, portas } = monta();
    const daVespera = await lancaProducao(casos, portas, DIA, '100,000');
    await fecha(casos);
    await lancaProducao(casos, portas, DIA_SEGUINTE, '50,000');
    // R5: 100 do dia fechado mais 50 do dia seguinte.
    expect(await acumuladoEm(casos, portas, DIA_SEGUINTE)).toBe('150');

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: daVespera, tipo: 'producao', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    // Recalculado do zero: sobra só o lançamento do dia seguinte.
    expect(await acumuladoEm(casos, portas, DIA_SEGUINTE)).toBe('50');
  });

  it('a exclusão grava quem excluiu, quando e o motivo, e a linha continua no banco', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas);
    await fecha(casos);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    // Excluir não apaga linha: o RDO é documento contratual.
    expect(repositorio.atividades.linhas).toHaveLength(1);
    const linha = repositorio.atividades.linhas[0];
    expect(linha?.exclusao?.por).toBe(E1);
    expect(linha?.exclusao?.motivo).toBe(MOTIVO);
    expect(linha?.exclusao?.em).not.toBeUndefined();
  });

  it('a exclusão sem motivo é recusada e nada é excluído', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: '   ' },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.MOTIVO_OBRIGATORIO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('o encarregado não exclui em dia fechado nem o lançamento que é dele', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas, C1);
    await fecha(casos);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_FECHADO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('o encarregado exclui em dia aberto o lançamento que é dele, com rastro', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas, C1);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    expect(repositorio.atividades.linhas).toHaveLength(1);
    expect(repositorio.atividades.linhas[0]?.exclusao?.por).toBe(C1);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('o encarregado não exclui, nem em dia aberto, o lançamento de outro autor', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas, C1);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: C2 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('a atividade excluída sai do bloco de atividades e continua no histórico, com o motivo', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(0);
    const historico = await casos.listaHistoricoDoLancamento(OBRA_B02, 'atividade', id);
    expect(historico.ok && historico.valor).toHaveLength(1);
    expect(historico.ok && historico.valor[0]?.exclusao?.motivo).toBe(MOTIVO);
    expect(historico.ok && historico.valor[0]?.vigente).toBe(false);
  });

  it('a pluviometria excluída sai da leitura do dia', async () => {
    const { casos } = monta();
    const lancada = await casos.lancaPluviometria(
      {
        obraId: OBRA_B02,
        data: dia(DIA),
        noiteAnterior: 'B',
        manha: 'C',
        tarde: 'C',
        indiceMm: quantidade('12'),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    if (!lancada.ok) throw new Error('Preparação do teste falhou');

    const r = await casos.excluiLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: lancada.valor.id,
        tipo: 'pluviometria',
        motivo: 'Leitura do pluviômetro do canteiro vizinho.',
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const vigente = await casos.obtemPluviometriaVigente(OBRA_B02, dia(DIA));
    expect(vigente.ok && vigente.valor).toBeNull();
  });

  it('a observação excluída sai do bloco de comentários', async () => {
    const { casos } = monta();
    const lancada = await casos.lancaObservacao(
      {
        obraId: OBRA_B02,
        data: dia(DIA),
        texto: 'Equipe liberada às 16h',
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    if (!lancada.ok) throw new Error('Preparação do teste falhou');

    const r = await casos.excluiLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: lancada.valor.id,
        tipo: 'observacao',
        motivo: 'Observação repetida.',
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaObservacoesVigentes(OBRA_B02, dia(DIA), 'CROS');
    expect(lista.ok && lista.valor).toHaveLength(0);
  });

  it('a produção excluída sai do executado do próprio dia', async () => {
    const { casos, portas } = monta();
    const id = await lancaProducao(casos, portas, DIA, '100,000');

    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'producao', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    const executado = await casos.somaProducaoDoDia(OBRA_B02, dia(DIA));
    expect(executado.ok && executado.valor).toHaveLength(0);
  });

  it('a produção excluída sai da lista que o bloco 7 consome', async () => {
    const { casos, portas } = monta();
    const id = await lancaProducao(casos, portas, DIA, '100,000');
    await lancaProducao(casos, portas, DIA, '7,500');

    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'producao', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    const lancamentos = await casos.listaProducaoVigenteAte(OBRA_B02, dia(DIA_SEGUINTE));
    expect(lancamentos.ok && lancamentos.valor).toHaveLength(1);
    expect(lancamentos.ok && lancamentos.valor[0]?.quantidade.toString()).toBe('7.5');
  });

  it('excluir duas vezes o mesmo lançamento é recusado', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    const primeira = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );
    expect(primeira.ok).toBe(true);

    const segunda = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: 'De novo' },
      { usuarioId: E1 },
    );

    expect(segunda.ok).toBe(false);
    expect(!segunda.ok && segunda.erro.codigo).toBe(CODIGO_ERRO.LANCAMENTO_EXCLUIDO);
  });

  it('lançamento excluído não é corrigido', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Ressuscitada por correção',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.LANCAMENTO_EXCLUIDO);
  });

  it('excluída a única atividade, o dia volta a aceitar ser marcado como parado', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    const recusado = await casos.declaraEstadoDoDia(
      { obraId: OBRA_B02, data: dia(DIA), estado: 'parado', motivoParada: 'Chuva' },
      { usuarioId: E1 },
    );
    // Decisão 24.1: com atividade lançada, marcar como parado é recusado.
    expect(recusado.ok).toBe(false);

    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    const aceito = await casos.declaraEstadoDoDia(
      { obraId: OBRA_B02, data: dia(DIA), estado: 'parado', motivoParada: 'Chuva' },
      { usuarioId: E1 },
    );
    expect(aceito.ok).toBe(true);
  });

  it('excluir a produção do dia seguinte não mexe no acumulado do dia anterior', async () => {
    const { casos, portas } = monta();
    await lancaProducao(casos, portas, DIA, '100,000');
    const doSeguinte = await lancaProducao(casos, portas, DIA_SEGUINTE, '50,000');

    await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: doSeguinte, tipo: 'producao', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    expect(await acumuladoEm(casos, portas, DIA)).toBe('100');
    expect(await acumuladoEm(casos, portas, DIA_SEGUINTE)).toBe('100');
  });
});
