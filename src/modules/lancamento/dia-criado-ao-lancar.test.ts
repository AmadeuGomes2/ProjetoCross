/**
 * Decisão 33.1 — lançar numa data nunca aberta **cria o dia sozinho**, como
 * `trabalhado`, na mesma ação.
 *
 * Origem das expectativas, nenhuma lida da implementação:
 *
 * - `docs/prd/v1.md`, DECISÕES TOMADAS, 33.1: o dia nasce `trabalhado` na mesma
 *   ação do lançamento, para poupar dois toques ao usuário mais sensível a
 *   atrito;
 * - decisão 4.2 (`regras-rdo` §5): os três estados do dia, em que `não lançado`
 *   é a AUSÊNCIA de registro — por isso o dia criado pelo lançamento deixa de
 *   ser `não lançado`;
 * - decisão 24.1 (`regras-rdo` §5): marcar como parado um dia que já tem
 *   atividade continua sendo **rejeitado**. Criar o dia ao lançar não afrouxa
 *   isso, e é essa convivência que este arquivo trava;
 * - decisão 12.1 (`regras-rdo` §5 e R12): produção não é atividade — é aceita em
 *   dia parado, com aviso. Logo o dia com produção e nenhuma atividade ainda
 *   pode ser declarado parado.
 */

import { describe, expect, it } from 'vitest';

import { CODIGO_ERRO } from '../../shared/result';
import { criaCasosDeLancamento } from './index';
import {
  C1,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  OBRA_B02,
  quantidade,
  relogioFixo,
} from './teste/duplas';

const AGORA = '2026-09-16T12:00:00.000Z';
const DIA_NOVO = '2026-09-03';

function monta() {
  const repositorio = criaRepositorioEmMemoria();
  const portas = criaPortasDeTeste();
  const casos = criaCasosDeLancamento({
    repositorio,
    portas,
    relogio: relogioFixo(AGORA),
  });
  return { repositorio, portas, casos };
}

describe('decisão 33.1: lançar cria o dia', () => {
  it('a atividade num dia nunca aberto cria o dia como trabalhado, na mesma ação', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('trabalhado');
    // Dia trabalhado não tem motivo: o motivo é do dia parado (20.1).
    expect(diaDeObra?.motivoParada).toBeNull();
    expect(diaDeObra?.registradoPor).toBe(C1);
    expect(diaDeObra?.registradoEm).toBe(AGORA);
    expect(diaDeObra?.fechadoEm).toBeNull();
  });

  it('a produção num dia nunca aberto cria o dia como trabalhado', async () => {
    const { casos, portas, repositorio } = monta();

    const r = await casos.lancaProducao(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        servico: { tipo: 'id', id: portas.idDoServico('REC.(FRESA+CAPA)') },
        quantidade: quantidade('1884,00'),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('trabalhado');
  });

  it('a pluviometria num dia nunca aberto cria o dia como trabalhado', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.lancaPluviometria(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        noiteAnterior: 'B',
        manha: 'B',
        tarde: 'B',
        indiceMm: quantidade('8'),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('trabalhado');
  });

  it('a observação num dia nunca aberto cria o dia como trabalhado', async () => {
    const { casos, repositorio } = monta();

    const r = await casos.lancaObservacao(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        texto: 'Equipe liberada às 16h',
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('trabalhado');
  });

  it('o dia criado pelo lançamento deixa de ser "não lançado" para a tela', async () => {
    const { casos, portas } = monta();
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const estado = await casos.estadoNaTela(OBRA_B02, dia(DIA_NOVO));

    expect(estado.ok && estado.valor).toBe('trabalhado');
  });

  it('33.1 com 24.1: o dia criado pelo lançamento não aceita virar parado', async () => {
    const { casos, portas, repositorio } = monta();
    await casos.lancaAtividade(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        descricao: 'Fresagem da Rua A',
        status: { tipo: 'id', id: portas.idDoStatus('Produção') },
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const r = await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        estado: 'parado',
        motivoParada: 'Chuva',
      },
      { usuarioId: C1 },
    );

    expect(r.ok).toBe(false);
    expect(!r.ok && r.erro.codigo).toBe(CODIGO_ERRO.DIA_PARADO_NAO_ACEITA_ATIVIDADE);
    expect(!r.ok && r.erro.mensagem.toLowerCase()).toContain('remova');
    // Nada é apagado em silêncio para acomodar a troca de estado (24.1).
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('trabalhado');
    const atividades = await casos.listaAtividadesVigentes(OBRA_B02, dia(DIA_NOVO));
    expect(atividades.ok && atividades.valor).toHaveLength(1);
  });

  it('o dia criado por produção, sem atividade nenhuma, ainda aceita virar parado', async () => {
    const { casos, portas, repositorio } = monta();
    await casos.lancaProducao(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        servico: { tipo: 'id', id: portas.idDoServico('REC.(FRESA+CAPA)') },
        quantidade: quantidade('1884,00'),
        chaveDeRascunho: null,
      },
      { usuarioId: C1 },
    );

    const r = await casos.declaraEstadoDoDia(
      {
        obraId: OBRA_B02,
        data: dia(DIA_NOVO),
        estado: 'parado',
        motivoParada: 'Chuva',
      },
      { usuarioId: C1 },
    );

    // 24.1 fala de ATIVIDADE; 12.1 aceita produção em dia parado, com aviso.
    expect(r.ok).toBe(true);
    const diaDeObra = await repositorio.dia.obtem(OBRA_B02, dia(DIA_NOVO));
    expect(diaDeObra?.estado).toBe('parado');
    expect(diaDeObra?.motivoParada).toBe('Chuva');
  });
});
