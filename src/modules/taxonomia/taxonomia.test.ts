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
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { paraTaxonomia } from '../../app/_composicao/ambiente-de-cadastro';
import {
  acrescentaTermoProtegido,
  listaSugestoesDeMotivoProtegida,
  listaTermosProtegida,
} from '../../app/_composicao/cadastro';
import { criaObraProtegida } from '../../app/_composicao/cadastro';
import { cadastraPessoaProtegida } from '../../app/_composicao/cadastro';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import type { Ator } from '../../modules/acesso';
import type { ObraId } from '../../shared/id';
import { listaLetrasDeTurno, listaTermos } from './casos-de-uso';
import { TIPOS_DE_TAXONOMIA } from './tipos';

let cenario: Cenario;
let e1: Ator;
let obraId: ObraId;

beforeEach(() => {
  cenario = montaCenario();
  e1 = cenario.novoAtor('e1@exemplo.invalido');
  obraId = criaObraDoPrd(e1, cenario.amb);
});

afterEach(() => {
  cenario.fecha();
});

function termos(tipo: 'funcao' | 'tipo_equipamento' | 'status_atividade'): string[] {
  const lista = listaTermos(tipo, paraTaxonomia(cenario.amb));
  if (!lista.ok) throw new Error(lista.erro.mensagem);
  return lista.valor.map((t) => t.termo);
}

describe('F2.4 — taxonomias editáveis com grafia exata', () => {
  it('CT-060 traz os 14 status de atividade com a grafia herdada', () => {
    expect(termos('status_atividade')).toEqual([
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

  it('CT-062 não existe taxonomia Condição de tempo, em forma nenhuma', () => {
    // Decisão 2.1: pedir tempo duas vezes ao encarregado feriria o lançamento
    // rápido no celular, e o PDF só imprime os turnos.
    expect(TIPOS_DE_TAXONOMIA).not.toContain('condicao_tempo');

    const tabelas = cenario.conexao.sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string }[];
    expect(tabelas.map((t) => t.name)).not.toContain('condicao_tempo');
  });

  it('CT-063 o N da macro VBA não está entre as letras de turno', () => {
    expect(listaLetrasDeTurno()).not.toContain('N');
  });

  it('CT-064 traz as 12 funções normalizadas, sem espaço no fim', () => {
    const lista = termos('funcao');
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

  it('CT-065 traz os 8 tipos de equipamento, sem espaço no fim', () => {
    const lista = termos('tipo_equipamento');
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

  it('CT-066 traz as 8 sugestões de motivo de dia parado', () => {
    const lista = listaSugestoesDeMotivoProtegida(e1, obraId, cenario.amb);
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

  it('CT-066 nenhuma chave estrangeira aponta para a tabela de sugestões', () => {
    // Decisão 20.1: o motivo é texto livre. Validar contra a lista a
    // transformaria em taxonomia fechada, que a decisão recusou.
    const ddl = cenario.conexao.sqlite
      .prepare("SELECT sql FROM sqlite_master WHERE type = 'table'")
      .all() as { sql: string | null }[];
    const referencias = ddl.filter(
      (t) =>
        t.sql !== null &&
        t.sql.includes('sugestao_motivo_parada') &&
        !t.sql.includes('CREATE TABLE `sugestao_motivo_parada`'),
    );
    expect(referencias).toEqual([]);
  });

  it('CT-067 acrescenta um status novo sem alterar os 14 herdados', () => {
    const antes = termos('status_atividade');

    const criado = acrescentaTermoProtegido(
      e1,
      obraId,
      'status_atividade',
      'Retrabalho',
      cenario.amb,
    );
    expect(criado.ok).toBe(true);

    const depois = termos('status_atividade');
    expect(depois).toHaveLength(15);
    expect(depois.slice(0, 14)).toEqual(antes);
    expect(depois).toContain('Retrabalho');
  });

  it('CT-068 termo novo vale para o sistema inteiro, inclusive em outra obra', () => {
    const criado = acrescentaTermoProtegido(
      e1,
      obraId,
      'funcao',
      'Encanador',
      cenario.amb,
    );
    expect(criado.ok).toBe(true);

    const e2 = cenario.novoAtor('e2@exemplo.invalido');
    const outra = criaObraProtegida(
      e2,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );
    expect(outra.ok).toBe(true);
    if (!outra.ok) return;

    const pessoa = cadastraPessoaProtegida(
      e2,
      outra.valor,
      { nome: 'P10', funcao: 'Encanador', entrada: '2026-02-10' },
      cenario.amb,
    );
    expect(pessoa.ok).toBe(true);
  });

  it('CT-069 recusa " perca de Produção " porque já existe "Perca de produção"', () => {
    const base = acrescentaTermoProtegido(
      e1,
      obraId,
      'status_atividade',
      'Perca de produção',
      cenario.amb,
    );
    expect(base.ok).toBe(true);

    const duplicado = acrescentaTermoProtegido(
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
      termos('status_atividade').filter((t) => t.toLowerCase().includes('perca')),
    ).toHaveLength(1);
  });

  it('CT-070 recusa no servidor o termo novo enviado por encarregado', () => {
    const c1 = cenario.novoAtor('c1@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        '88888888-8888-4888-8888-888888888888',
        obraId,
        c1.usuarioId,
        e1.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const resultado = acrescentaTermoProtegido(
      c1,
      obraId,
      'status_atividade',
      'Retrabalho',
      cenario.amb,
    );

    expect(resultado.ok).toBe(false);
    expect(termos('status_atividade')).not.toContain('Retrabalho');
  });

  it('CT-071 a validação de status consulta a tabela, sem depender de faixa de linhas', () => {
    // `inconsistencias.md` A3: na planilha a validação vale da linha 5 à 511 e
    // fora disso aponta para `#REF!`. Aqui a consulta é por chave, e o termo
    // acrescentado em qualquer posição é encontrado.
    for (let i = 0; i < 20; i += 1) {
      const criado = acrescentaTermoProtegido(
        e1,
        obraId,
        'status_atividade',
        `Status de teste ${i}`,
        cenario.amb,
      );
      expect(criado.ok).toBe(true);
    }

    const lista = listaTermosProtegida(e1, obraId, 'status_atividade', cenario.amb);
    expect(lista.ok && lista.valor).toHaveLength(34);
    expect(lista.ok && lista.valor.map((t) => t.termo)).toContain('Status de teste 19');
  });

  it('o encarregado lê a taxonomia, porque precisa dela para lançar', () => {
    const c1 = cenario.novoAtor('c2@exemplo.invalido');
    cenario.conexao.sqlite
      .prepare(
        `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
         VALUES (?, ?, ?, 'encarregado', ?, ?)`,
      )
      .run(
        '99999999-9999-4999-8999-999999999999',
        obraId,
        c1.usuarioId,
        e1.usuarioId,
        '2026-09-16T12:00:00.000Z',
      );

    const lista = listaTermosProtegida(c1, obraId, 'status_atividade', cenario.amb);
    expect(lista.ok && lista.valor).toHaveLength(14);
  });
});
