/**
 * Casos CT-165 a CT-169 — F4.8, lançamento sobrevive à queda de rede.
 *
 * Expectativa: `docs/prd/v1.md`, Funcionalidade 4.8, e decisão 16.1
 * ("rascunho local, sem resolução de conflito"). Requisito de segurança 6:
 * o aparelho do encarregado é o ponto mais exposto.
 */

import { describe, expect, it } from 'vitest';

import { criaCasosDeLancamento } from './index';
import {
  criaFilaDeRascunhos,
  criaLojaDeRascunhos,
  type ArmazenamentoLocal,
} from './rascunho';
import {
  C1,
  C2,
  criaPortasDeTeste,
  criaRepositorioEmMemoria,
  dia,
  OBRA_B02,
  relogioFixo,
  relogioQueAvanca,
} from './teste/duplas';

const HOJE = '2026-09-16T12:00:00.000Z';

/** Armazenamento de mentira, que sobrevive a "fechar o navegador". */
function armazenamentoDeTeste(): ArmazenamentoLocal & {
  readonly dados: Map<string, string>;
} {
  const dados = new Map<string, string>();
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
    removeItem: (chave) => {
      dados.delete(chave);
    },
  };
}

function rascunhoDeCompactacao(chave = 'rascunho-1') {
  return {
    chave,
    obraId: String(OBRA_B02),
    data: '2026-09-03',
    descricao: 'Compactação',
    statusId: 'status-produção',
    statusTermo: 'Produção',
  };
}

describe('F4.8 rascunho local', () => {
  it('CT-165 o rascunho sobrevive a fechar o navegador e continua marcado como não enviado', async () => {
    const armazenamento = armazenamentoDeTeste();
    criaFilaDeRascunhos(armazenamento).guarda(rascunhoDeCompactacao());

    // "Fechar o navegador e abrir de novo" é uma fila nova sobre o mesmo
    // armazenamento: nada em memória sobrevive, só o que foi persistido.
    const depois = criaFilaDeRascunhos(armazenamento);
    const lista = depois.lista(String(OBRA_B02), '2026-09-03');

    expect(lista).toHaveLength(1);
    expect(lista[0]?.descricao).toBe('Compactação');
    expect(lista[0]?.enviado).toBe(false);
  });

  it('CT-166 envia com a data escolhida e o autor, e a hora de registro é a do servidor', async () => {
    const armazenamento = armazenamentoDeTeste();
    const fila = criaFilaDeRascunhos(armazenamento);
    fila.guarda(rascunhoDeCompactacao());
    const repositorio = criaRepositorioEmMemoria();
    const portas = criaPortasDeTeste();
    const casos = criaCasosDeLancamento({
      repositorio,
      portas,
      relogio: relogioFixo('2026-09-16T18:30:00.000Z'),
    });

    const resumo = await fila.enviaPendentes((r) =>
      casos.recebeAtividade(
        {
          obraId: r.obraId,
          data: r.data,
          descricao: r.descricao,
          status: { tipo: 'id', id: portas.idDoStatus(r.statusTermo) },
          chaveDeRascunho: r.chave,
        },
        { usuarioId: C1 },
      ),
    );

    expect(resumo.aceitos).toBe(1);
    const linha = repositorio.atividades.linhas[0];
    expect(linha?.data).toBe('2026-09-03');
    expect(linha?.autorId).toBe(C1);
    expect(linha?.registradoEm).toBe('2026-09-16T18:30:00.000Z');
    expect(fila.lista(String(OBRA_B02), '2026-09-03')).toHaveLength(0);
  });

  it('CT-167 dois autores com o mesmo rascunho geram dois lançamentos, e nenhum é descartado', async () => {
    const repositorio = criaRepositorioEmMemoria();
    const portas = criaPortasDeTeste();
    const casos = criaCasosDeLancamento({
      repositorio,
      portas,
      relogio: relogioQueAvanca(HOJE),
    });
    const comando = {
      obraId: OBRA_B02,
      data: dia('2026-09-03'),
      descricao: 'Compactação',
      status: { tipo: 'id', id: portas.idDoStatus('Produção') } as const,
      chaveDeRascunho: 'rascunho-1',
    };

    const deC1 = await casos.lancaAtividade(comando, { usuarioId: C1 });
    const deC2 = await casos.lancaAtividade(comando, { usuarioId: C2 });

    expect(deC1.ok).toBe(true);
    expect(deC2.ok).toBe(true);
    const lista = await casos.listaAtividadesVigentes(OBRA_B02, dia('2026-09-03'));
    expect(lista.ok && lista.valor).toHaveLength(2);
    expect(repositorio.atividades.linhas.map((l) => l.autorId)).toEqual([C1, C2]);
  });

  it('o reenvio do mesmo rascunho pelo mesmo autor não duplica o lançamento', async () => {
    const repositorio = criaRepositorioEmMemoria();
    const portas = criaPortasDeTeste();
    const casos = criaCasosDeLancamento({
      repositorio,
      portas,
      relogio: relogioQueAvanca(HOJE),
    });
    const comando = {
      obraId: OBRA_B02,
      data: dia('2026-09-03'),
      descricao: 'Compactação',
      status: { tipo: 'id', id: portas.idDoStatus('Produção') } as const,
      chaveDeRascunho: 'rascunho-1',
    };

    const primeiro = await casos.lancaAtividade(comando, { usuarioId: C1 });
    const segundo = await casos.lancaAtividade(comando, { usuarioId: C1 });

    expect(primeiro.ok && segundo.ok && primeiro.valor.id).toBe(
      segundo.ok ? segundo.valor.id : null,
    );
    expect(repositorio.atividades.linhas).toHaveLength(1);
  });

  it('CT-168 o servidor recusa o rascunho de dia futuro e o rascunho fica preservado', async () => {
    const armazenamento = armazenamentoDeTeste();
    const fila = criaFilaDeRascunhos(armazenamento);
    fila.guarda({ ...rascunhoDeCompactacao(), data: '2026-09-17' });
    const portas = criaPortasDeTeste();
    const casos = criaCasosDeLancamento({
      repositorio: criaRepositorioEmMemoria(),
      portas,
      relogio: relogioQueAvanca(HOJE),
    });

    const resumo = await fila.enviaPendentes((r) =>
      casos.recebeAtividade(
        {
          obraId: r.obraId,
          data: r.data,
          descricao: r.descricao,
          status: { tipo: 'id', id: portas.idDoStatus(r.statusTermo) },
          chaveDeRascunho: r.chave,
        },
        { usuarioId: C1 },
      ),
    );

    expect(resumo.aceitos).toBe(0);
    expect(resumo.recusados).toBe(1);
    const pendentes = fila.lista(String(OBRA_B02), '2026-09-17');
    expect(pendentes).toHaveLength(1);
    expect(pendentes[0]?.erro).not.toBeNull();
  });

  it('CT-169 o armazenamento local não guarda nome de pessoa e some quando o lançamento é aceito', async () => {
    const armazenamento = armazenamentoDeTeste();
    const fila = criaFilaDeRascunhos(armazenamento);
    fila.guarda(rascunhoDeCompactacao());

    const bruto = [...armazenamento.dados.values()].join(' ');
    expect(bruto.toLowerCase()).not.toContain('nome');
    expect(bruto.toLowerCase()).not.toContain('autor');
    expect(bruto.toLowerCase()).not.toContain('usuario');

    const resumo = await fila.enviaPendentes(() =>
      Promise.resolve({ ok: true as const }),
    );

    expect(resumo.aceitos).toBe(1);
    expect([...armazenamento.dados.values()].join(' ')).not.toContain('Compactação');
  });

  it('a queda de rede no envio preserva o rascunho, sem engolir a falha', async () => {
    const fila = criaFilaDeRascunhos(armazenamentoDeTeste());
    fila.guarda(rascunhoDeCompactacao());

    const resumo = await fila.enviaPendentes(() =>
      Promise.reject(new Error('rede indisponível')),
    );

    expect(resumo.aceitos).toBe(0);
    expect(resumo.falhasDeRede).toBe(1);
    expect(fila.lista(String(OBRA_B02), '2026-09-03')).toHaveLength(1);
  });

  it('aba privada: armazenamento que lança não derruba a tela', () => {
    const quebrado: ArmazenamentoLocal = {
      getItem: () => {
        throw new Error('acesso negado');
      },
      setItem: () => {
        throw new Error('acesso negado');
      },
      removeItem: () => {
        throw new Error('acesso negado');
      },
    };
    const fila = criaFilaDeRascunhos(quebrado);

    expect(() => fila.guarda(rascunhoDeCompactacao())).not.toThrow();
    expect(fila.lista(String(OBRA_B02), '2026-09-03')).toEqual([]);
    expect(fila.disponivel()).toBe(false);
  });

  it('sem armazenamento nenhum, a fila continua respondendo vazia', () => {
    const fila = criaFilaDeRascunhos(null);

    expect(fila.lista(String(OBRA_B02), '2026-09-03')).toEqual([]);
    expect(fila.disponivel()).toBe(false);
  });

  it('conteúdo corrompido no armazenamento não derruba a tela', () => {
    const armazenamento = armazenamentoDeTeste();
    const fila = criaFilaDeRascunhos(armazenamento);
    fila.guarda(rascunhoDeCompactacao());
    for (const chave of armazenamento.dados.keys()) {
      armazenamento.dados.set(chave, '{isso não é json');
    }

    expect(
      criaFilaDeRascunhos(armazenamento).lista(String(OBRA_B02), '2026-09-03'),
    ).toEqual([]);
  });

  it('a loja devolve a mesma referência enquanto nada muda, e outra depois de mudar', () => {
    const loja = criaLojaDeRascunhos(armazenamentoDeTeste());
    loja.guarda(rascunhoDeCompactacao());

    const antes = loja.instantaneo(String(OBRA_B02), '2026-09-03');
    const deNovo = loja.instantaneo(String(OBRA_B02), '2026-09-03');
    loja.guarda(rascunhoDeCompactacao('rascunho-2'));
    const depois = loja.instantaneo(String(OBRA_B02), '2026-09-03');

    // Sem referência estável, a tela de lançamento entra em laço de renderização.
    expect(deNovo).toBe(antes);
    expect(depois).not.toBe(antes);
    expect(depois).toHaveLength(2);
  });

  it('a loja avisa quem assina quando o rascunho muda, e o servidor não vê rascunho nenhum', () => {
    const loja = criaLojaDeRascunhos(armazenamentoDeTeste());
    let avisos = 0;
    const desassina = loja.assina(() => {
      avisos += 1;
    });

    loja.guarda(rascunhoDeCompactacao());
    loja.remove('rascunho-1');
    desassina();
    loja.guarda(rascunhoDeCompactacao('rascunho-3'));

    expect(avisos).toBe(2);
    // O rascunho vive no aparelho: o servidor renderiza sempre a lista vazia.
    expect(loja.instantaneoDoServidor()).toEqual([]);
  });
});
