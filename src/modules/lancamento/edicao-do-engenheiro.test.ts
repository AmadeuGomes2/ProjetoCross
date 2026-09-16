/**
 * Decisão 30.1 — o engenheiro edita qualquer lançamento, de qualquer autor,
 * **inclusive em dia fechado**, e toda edição deixa registro no histórico.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/prd/v1.md`, DECISÕES TOMADAS, 30.1: "O engenheiro edita e exclui
 *   qualquer lançamento, de qualquer autor, inclusive em dia fechado. Toda
 *   edição e exclusão deixa registro no histórico: o RDO é documento contratual
 *   e alteração sem rastro não é aceitável";
 * - decisão 22.1 (`regras-rdo` §5): a mudança em dia fechado é do engenheiro, de
 *   qualquer autor, e o encarregado não a faz. 30.1 amplia o alcance sem mexer
 *   em quem pode;
 * - `CLAUDE.md`, seção Modelo: a versão anterior fica no histórico, apontada
 *   pela nova. "RDO entregue ao fiscal não muda em silêncio";
 * - `regras-rdo` §2, R5: o acumulado é **sempre recalculado**. Corrigir um dia
 *   fechado tem que corrigir os dias seguintes sem nenhuma ação extra;
 * - decisão 6.2 (`regras-rdo` §3): o número do RDO congela no fechamento, e
 *   mudar o conteúdo depois não o renumera.
 *
 * A metade da exclusão de 30.1 está em `exclusao-com-rastro.test.ts`, que é
 * onde o rastro — quem excluiu, quando e por quê — é conferido. Aqui ficam
 * apenas os dois casos de permissão que nasceram com a edição.
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
/** Motivo da exclusão: texto livre obrigatório desde a 30.1. */
const MOTIVO = 'Lançada em duplicidade';

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

async function lancaFresagem(casos: Casos, portas: Portas, data = DIA) {
  const r = await casos.lancaAtividade(
    {
      obraId: OBRA_B02,
      data: dia(data),
      descricao: 'Fresagem da Rua A',
      status: { tipo: 'id', id: portas.idDoStatus('Produção') },
      chaveDeRascunho: null,
    },
    { usuarioId: C1 },
  );
  if (!r.ok) throw new Error(`Preparação do teste falhou: ${r.erro.codigo}`);
  return r.valor.id;
}

async function lancaProducao(
  casos: Casos,
  portas: Portas,
  data: string,
  valor: string,
  autor = C1,
) {
  const r = await casos.lancaProducao(
    {
      obraId: OBRA_B02,
      data: dia(data),
      servico: { tipo: 'id', id: portas.idDoServico('REC.(FRESA+CAPA)') },
      quantidade: quantidade(valor),
      chaveDeRascunho: null,
    },
    { usuarioId: autor },
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

describe('decisão 30.1: o engenheiro edita qualquer lançamento', () => {
  it('o engenheiro corrige em dia fechado a atividade do encarregado, e as duas versões ficam no histórico', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);
    await fecha(casos);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.descricao).toBe(
      'Fresagem da Rua A, estacas 10 a 14',
    );
    const historico = await casos.listaHistoricoDoLancamento(OBRA_B02, 'atividade', id);
    expect(historico.ok && historico.valor).toHaveLength(2);
    expect(historico.ok && historico.valor[0]?.vigente).toBe(false);
    expect(historico.ok && historico.valor[0]?.autorId).toBe(C1);
    expect(historico.ok && historico.valor[1]?.vigente).toBe(true);
    expect(historico.ok && historico.valor[1]?.retificaId).toBe(id);
    expect(historico.ok && historico.valor[1]?.autorId).toBe(E1);
  });

  it('o engenheiro corrige a pluviometria de um dia fechado, e a leitura antiga fica no histórico', async () => {
    const { casos } = monta();
    const lancada = await casos.lancaPluviometria(
      {
        obraId: OBRA_B02,
        data: dia(DIA),
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: quantidade('8'),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );
    if (!lancada.ok) throw new Error('Preparação do teste falhou');
    await fecha(casos);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: lancada.valor.id,
        conteudo: {
          tipo: 'pluviometria',
          noiteAnterior: 'B',
          manha: 'C',
          tarde: 'C',
          indiceMm: quantidade('12'),
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const vigente = await casos.obtemPluviometriaVigente(OBRA_B02, dia(DIA));
    expect(vigente.ok && vigente.valor?.manha).toBe('C');
    expect(vigente.ok && vigente.valor?.indiceMm.toString()).toBe('12');
    const historico = await casos.listaHistoricoDoLancamento(
      OBRA_B02,
      'pluviometria',
      lancada.valor.id,
    );
    expect(historico.ok && historico.valor).toHaveLength(2);
  });

  it('o engenheiro corrige a observação de um dia fechado, e o texto antigo fica no histórico', async () => {
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
    await fecha(casos);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: lancada.valor.id,
        conteudo: { tipo: 'observacao', texto: 'Equipe liberada às 15h30' },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaObservacoesVigentes(OBRA_B02, dia(DIA), 'CROS');
    expect(lista.ok && lista.valor).toHaveLength(1);
    expect(lista.ok && lista.valor[0]?.texto).toBe('Equipe liberada às 15h30');
    const historico = await casos.listaHistoricoDoLancamento(
      OBRA_B02,
      'observacao',
      lancada.valor.id,
    );
    expect(historico.ok && historico.valor).toHaveLength(2);
  });

  it('corrigir produção de um dia fechado muda o acumulado dos dias seguintes', async () => {
    const { casos, portas } = monta();
    const servicoId = portas.idDoServico('REC.(FRESA+CAPA)');
    const doDiaFechado = await lancaProducao(casos, portas, DIA, '100,000');
    await fecha(casos);
    await lancaProducao(casos, portas, DIA_SEGUINTE, '50,000');

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: doDiaFechado,
        conteudo: {
          tipo: 'producao',
          servico: { tipo: 'id', id: servicoId },
          quantidade: quantidade('10,000'),
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    // R5: o acumulado é sempre recalculado. 10 do dia fechado mais 50 do dia
    // seguinte, e nada do valor antigo sobrevive na soma.
    const acumulado = await casos.somaProducaoAte(OBRA_B02, dia(DIA_SEGUINTE));
    const linha = acumulado.ok
      ? acumulado.valor.find((p) => p.servicoId === servicoId)
      : undefined;
    expect(linha?.quantidade.toString()).toBe('60');
  });

  it('a correção do engenheiro em dia fechado não renumera o documento entregue', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas);
    await fecha(casos);

    await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A, estacas 10 a 14',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA));
    expect(diaDeObra?.numeroRdoCongelado).toBe(210);
  });

  it('o engenheiro corrige em dia aberto o lançamento do encarregado', async () => {
    const { casos, portas, repositorio } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Fresagem da Rua A - bordo direito',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor[0]?.descricao).toBe(
      'Fresagem da Rua A - bordo direito',
    );
    // Dia aberto substitui no lugar: não há exigência de imutabilidade.
    expect(repositorio.atividades.linhas).toHaveLength(1);
    expect(repositorio.atividades.linhas[0]?.atualizadoPor).toBe(E1);
  });

  it('o encarregado não corrige, nem em dia aberto, o lançamento de outro autor', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.corrigeLancamento(
      {
        obraId: OBRA_B02,
        lancamentoId: id,
        conteudo: {
          tipo: 'atividade',
          descricao: 'Mexido por quem não devia',
          status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        },
      },
      { usuarioId: C2 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor[0]?.descricao).toBe('Fresagem da Rua A');
  });

  it('o encarregado não exclui, nem em dia aberto, o lançamento de outro autor', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: C2 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(1);
  });

  it('o engenheiro exclui em dia aberto o lançamento do encarregado', async () => {
    const { casos, portas } = monta();
    const id = await lancaFresagem(casos, portas);

    const r = await casos.excluiLancamento(
      { obraId: OBRA_B02, lancamentoId: id, tipo: 'atividade', motivo: MOTIVO },
      { usuarioId: E1 },
    );

    expect(r.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA));
    expect(lista.ok && lista.valor).toHaveLength(0);
  });
});
