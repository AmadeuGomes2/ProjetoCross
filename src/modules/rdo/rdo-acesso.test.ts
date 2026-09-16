/**
 * CT-232 e CT-235 — rastreabilidade e erro sem vazamento.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.7 do PRD.
 *
 * CT-233, CT-234 e CT-236 tratam de perfil e de autoria, que são da frente A
 * (`acesso`) e da frente B (`lancamento`): o RDO não tem campo de autor nem de
 * nome, então não há o que filtrar aqui. O que este arquivo trava é a
 * propriedade do lado do RDO: o documento montado NÃO carrega nome de pessoa,
 * e a falha de montagem não vaza detalhe técnico.
 *
 * Origem das expectativas: CLAUDE.md, seção Segurança — "erro nunca vaza stack
 * trace nem nome de pessoa; a mensagem diz o que fazer e o detalhe técnico fica
 * no log do servidor com um identificador de correlação".
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  defineEscritor,
  type EventoDeLog,
  restauraEscritorPadrao,
} from '../../shared/log';
import { erro, erroDeDominio, CODIGO_ERRO } from '../../shared/result';
import { consultaRdoDiario } from './borda/consulta-rdo';
import { montaOuFalha } from './teste/ajuda';
import {
  atividade,
  criaPortasFalsas,
  lancamentoDeProducao,
  observacao,
  SERVICO_FRESA_CAPA,
} from './teste/duplas';

afterEach(() => {
  restauraEscritorPadrao();
});

describe('o RDO montado não carrega dado pessoal', () => {
  it('não traz nome de trabalhador nem autor de lançamento', async () => {
    // CT-189, CT-234 e CT-251 do lado do cálculo: o que não existe no tipo não
    // pode vazar para a tela, para o PDF nem para o JSON da resposta.
    //
    // O bloco 5 vem do cadastro de pessoal, que é a tabela mais sensível do
    // sistema: é ele que precisa provar que só carrega função e quantidade.
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': [atividade('a-1', 'Fresagem', 'Produção')] },
      observacoes: { '2026-09-03': [observacao('o-1', 'Frente liberada')] },
      producao: [lancamentoDeProducao('l-1', SERVICO_FRESA_CAPA, '2026-09-03', '10')],
    });
    expect(JSON.stringify(rdo.efetivoPessoal)).not.toContain('nome');
    expect(JSON.stringify(rdo.efetivoPessoal)).not.toContain('P1');
    expect(JSON.stringify(rdo)).not.toContain('autor');
  });

  it('mantém o responsável técnico, que é campo da obra e sai no bloco 11', async () => {
    // Decisão 18.1: o responsável técnico é o único nome do documento, e ele
    // vem do cadastro da obra, não do cadastro de pessoal.
    const rdo = await montaOuFalha('2026-09-03');
    expect(rdo.responsavelTecnico?.registro).toBe('CREA - MG 000000/D');
  });
});

describe('rastreabilidade até o lançamento (CT-232)', () => {
  it('liga cada linha de atividade ao id do lançamento que a originou', async () => {
    const rdo = await montaOuFalha('2026-09-03', {
      atividades: { '2026-09-03': [atividade('a-7', 'Fresagem', 'Produção')] },
    });
    const primeira = rdo.atividades[0];
    expect(primeira?.tipo === 'atividade' ? primeira.lancamentoId : null).toBe('a-7');
  });
});

describe('determinismo da montagem (CT-241)', () => {
  it('monta duas vezes o mesmo dia e produz o mesmo RDO, campo por campo', async () => {
    const dados = {
      atividades: { '2026-09-03': [atividade('a-1', 'Fresagem', 'Produção')] },
      producao: [lancamentoDeProducao('l-1', SERVICO_FRESA_CAPA, '2026-09-03', '10')],
    };
    const primeira = await montaOuFalha('2026-09-03', dados);
    const segunda = await montaOuFalha('2026-09-03', dados);
    expect(JSON.stringify(segunda)).toEqual(JSON.stringify(primeira));
  });
});

describe('erro ao montar o RDO (CT-235)', () => {
  it('devolve mensagem genérica com identificador e registra o detalhe no log', async () => {
    const eventos: EventoDeLog[] = [];
    defineEscritor((e) => eventos.push(e));

    const portas = {
      ...criaPortasFalsas(),
      atividades: () => {
        throw new Error('falha interna ao ler a tabela de lançamento');
      },
    };

    const r = await consultaRdoDiario({ obraId: 'B02', dia: '2026-09-03' }, portas);

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro.mensagem).not.toContain('falha interna');
      expect(r.erro.mensagem).not.toContain('Error');
      expect(r.erro.mensagem).toMatch(/cite o código [0-9a-f]{8}/);
    }
    expect(eventos).toHaveLength(1);
    expect(eventos[0]?.nivel).toBe('erro');
  });

  it('devolve o erro de domínio da porta sem transformá-lo em falha genérica', async () => {
    // Erro esperado é resultado, não exceção: quem chama trata, e a mensagem
    // continua sendo a que diz o que fazer.
    const portas = {
      ...criaPortasFalsas(),
      cabecalho: () =>
        Promise.resolve(
          erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.')),
        ),
    };
    const r = await consultaRdoDiario({ obraId: 'B02', dia: '2026-09-03' }, portas);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.codigo).toBe(CODIGO_ERRO.NAO_ENCONTRADO);
  });

  it('recusa data inexistente antes de chamar porta nenhuma', async () => {
    // CT-177 na borda de consulta.
    const r = await consultaRdoDiario(
      { obraId: 'B02', dia: '2026-09-31' },
      criaPortasFalsas(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro.codigo).toBe(CODIGO_ERRO.DIA_FORA_DO_CALENDARIO);
  });
});
