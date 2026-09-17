/**
 * Montar um RDO não pode custar onze idas ao banco, uma depois da outra.
 *
 * ## Por que isto vira teste, e não só um cuidado
 *
 * Com SQLite em arquivo, consulta em série custava microssegundos e ninguém
 * notava. Desde 17/09/2026 o banco é o Neon, e **cada consulta atravessa a
 * rede**: medido contra o projeto real, 155 ms por ida e volta. Onze em série
 * são 1,7 s de espera pura para abrir UM dia — e a exportação de um mês, que
 * monta o diário dia a dia, faz 330 e passa do limite de tempo de função da
 * Vercel.
 *
 * Dez das onze portas são independentes: recebem `obraId` e `dia` e nada mais.
 * A décima primeira, `cabecalho`, tem que vir antes, e de propósito — é ela que
 * guarda a recusa por data fora do contrato, que é a recusa mais barata e não
 * deve custar as outras dez consultas.
 *
 * A expectativa aqui é de comportamento observável: **quantas idas em série o
 * pedido faz**, e não como o código está escrito. Se alguém trocar `Promise.all`
 * por outra forma de paralelizar, o teste continua valendo.
 */

import { describe, expect, it } from 'vitest';

import { montaRdoDiario } from './monta-rdo-diario';
import type { PortasDoRdo } from './portas';
import { criaPortasFalsas, dia, OBRA } from './teste/duplas';

/**
 * Embrulha as portas contando a concorrência máxima.
 *
 * Cada porta segura a resposta por um tique do laço de eventos. Quem chama em
 * série vê no máximo uma em voo; quem chama junto vê várias.
 */
function comMedidor(portas: PortasDoRdo): {
  readonly portas: PortasDoRdo;
  maxSimultaneas(): number;
  chamadas(): number;
} {
  let emVoo = 0;
  let maximo = 0;
  let total = 0;

  const medida =
    <A extends unknown[], R>(f: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      emVoo += 1;
      total += 1;
      maximo = Math.max(maximo, emVoo);
      // Dois tiques: tempo suficiente para outra chamada entrar, se houver.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      try {
        return await f(...a);
      } finally {
        emVoo -= 1;
      }
    };

  const espelho = Object.fromEntries(
    Object.entries(portas).map(([nome, f]) => [
      nome,
      medida(f as (...a: unknown[]) => Promise<unknown>),
    ]),
  ) as unknown as PortasDoRdo;

  return {
    portas: espelho,
    maxSimultaneas: () => maximo,
    chamadas: () => total,
  };
}

describe('montar o RDO diário não serializa as leituras', () => {
  it('as dez leituras independentes vão juntas ao banco', async () => {
    const medidor = comMedidor(criaPortasFalsas());

    const r = await montaRdoDiario(OBRA, dia('2026-09-03'), medidor.portas);
    expect(r.ok).toBe(true);

    // Onze portas ao todo. O cabeçalho vai sozinho, na frente; as outras dez
    // vão juntas. Em série, o máximo simultâneo seria 1.
    expect(medidor.chamadas()).toBe(11);
    expect(medidor.maxSimultaneas()).toBeGreaterThanOrEqual(10);
  });

  it('a recusa por data fora do contrato não custa as outras dez consultas', async () => {
    const medidor = comMedidor(criaPortasFalsas());

    // A obra do cenário vai de 05/02/2026 a 05/02/2027.
    const r = await montaRdoDiario(OBRA, dia('2025-12-31'), medidor.portas);

    expect(r.ok).toBe(false);
    // Só o cabeçalho foi lido. A recusa mais barata continua sendo a mais barata.
    expect(medidor.chamadas()).toBe(1);
  });
});
