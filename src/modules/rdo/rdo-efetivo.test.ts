/**
 * CT-182 a CT-196 — efetivo de pessoal e de equipamento.
 * Casos em `docs/qa/v1-casos-passo-5.md`, funcionalidade F5.2 do PRD.
 *
 * Origem das expectativas:
 * - R1 e decisão 1.1: conta quando `entrada ≤ D` e (`saída` nula ou `saída ≥ D`);
 *   a data de saída é o último dia trabalhado;
 * - decisão 1.2: equipamento segue a mesma regra;
 * - R3 e caso obrigatório 8: a pessoa conta UMA vez, mesmo com duas passagens;
 * - decisão 5.1: efetivo zerado em dia parado, nos dois blocos;
 * - gabarito, bloco 5: quantidade zero é exibida em branco, não como `0`.
 *
 * Este é o cálculo de agregação que a planilha mais errou: `≤` em 18 colunas e
 * `<` em 23 outras. Por isso cada fronteira tem teste próprio, com nome próprio.
 */

import { describe, expect, it } from 'vitest';

import { montaOuFalha } from './teste/ajuda';
import {
  diaParado,
  FUNCAO_MOTORISTA,
  FUNCAO_PEDREIRO,
  idDaPessoa,
  PESSOAL_PADRAO,
  dia,
} from './teste/duplas';
import type { BlocoDeEfetivo } from './efetivo';

function quantidadeDe(bloco: BlocoDeEfetivo, rotulo: string): number {
  const coluna = bloco.colunas.find((c) => c.rotulo === rotulo);
  if (coluna === undefined) throw new Error(`coluna ausente no bloco: ${rotulo}`);
  return coluna.quantidade;
}

describe('efetivo de pessoal, fronteiras da passagem', () => {
  it('não conta a pessoa no dia anterior à entrada', async () => {
    // CT-182: "P1" entra em 10/02 e não pode contar em 09/02; sobra "P2".
    const rdo = await montaOuFalha('2026-02-09');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(1);
  });

  it('conta a pessoa no próprio dia da entrada', async () => {
    // CT-184, fronteira: `entrada ≤ D` é inclusivo.
    const rdo = await montaOuFalha('2026-02-10');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(2);
  });

  it('conta a pessoa no dia anterior à saída', async () => {
    // CT-185, caso normal, referência para as fronteiras de saída.
    const rdo = await montaOuFalha('2026-02-19');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(2);
  });

  it('conta a pessoa no dia exato da saída', async () => {
    // CT-186, caso obrigatório 1, decisão 1.1: a saída é o último dia
    // trabalhado, logo `saída ≥ D`.
    const rdo = await montaOuFalha('2026-02-20');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(2);
  });

  it('não conta a pessoa no dia seguinte à saída', async () => {
    // CT-187: o lado de fora da fronteira de saída.
    const rdo = await montaOuFalha('2026-02-21');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(1);
  });

  it('conta a passagem de um dia só apenas nesse dia', async () => {
    // CT-196: entrada e saída no mesmo dia. Qualquer assimetria entre as duas
    // comparações faz o dia sumir ou durar para sempre.
    const pessoas = [
      ...PESSOAL_PADRAO,
      {
        pessoaId: idDaPessoa('P4'),
        passagens: [
          {
            funcaoId: FUNCAO_MOTORISTA,
            entrada: dia('2026-02-10'),
            saida: dia('2026-02-10'),
          },
        ],
      },
    ];
    const noves = await montaOuFalha('2026-02-09', { pessoas });
    const dez = await montaOuFalha('2026-02-10', { pessoas });
    const onze = await montaOuFalha('2026-02-11', { pessoas });
    expect([
      quantidadeDe(noves.efetivoPessoal, 'Motorista'),
      quantidadeDe(dez.efetivoPessoal, 'Motorista'),
      quantidadeDe(onze.efetivoPessoal, 'Motorista'),
    ]).toEqual([1, 3, 2]);
  });

  it('conta a pessoa uma vez quando ela tem duas passagens vigentes', async () => {
    // R3 e caso obrigatório 8, do lado do pessoal: contar linhas de cadastro
    // daria dois. A contagem é por pessoa.
    const pessoas = [
      {
        pessoaId: idDaPessoa('P9'),
        passagens: [
          {
            funcaoId: FUNCAO_MOTORISTA,
            entrada: dia('2026-02-05'),
            saida: dia('2026-02-18'),
          },
          { funcaoId: FUNCAO_MOTORISTA, entrada: dia('2026-02-10'), saida: null },
        ],
      },
    ];
    const rdo = await montaOuFalha('2026-02-12', { pessoas });
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(1);
  });

  it('conta uma vez só, na função da passagem mais recente, se duas cobrirem o dia', async () => {
    // Decisão 29.1 com R3: o cadastro rejeita passagens sobrepostas da mesma
    // pessoa, então este dado não nasce pelo caminho normal. Se nascer, o que
    // NÃO pode acontecer é a pessoa entrar em duas colunas e dobrar o `TOTAL`
    // do bloco 5 — é o primeiro número que o fiscal confere. Vale a passagem
    // que começou depois, que é a notícia mais recente sobre ela.
    const pessoas = [
      {
        pessoaId: idDaPessoa('P9'),
        passagens: [
          {
            funcaoId: FUNCAO_MOTORISTA,
            entrada: dia('2026-02-05'),
            saida: dia('2026-02-18'),
          },
          { funcaoId: FUNCAO_PEDREIRO, entrada: dia('2026-02-10'), saida: null },
        ],
      },
    ];
    const rdo = await montaOuFalha('2026-02-12', { pessoas });

    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(0);
    expect(quantidadeDe(rdo.efetivoPessoal, 'Pedreiro')).toBe(1);
    expect(rdo.efetivoPessoal.total).toBe(1);
  });

  it('conta a pessoa na função da passagem que cobre o dia, e não na da outra', async () => {
    // Decisão 29.1, o caso que a decisão existe para resolver: a mesma pessoa,
    // Motorista até 20/03 e Operador II de 21/03. O RDO de 15/03 não pode
    // mudar quando a troca é registrada.
    const pessoas = [
      {
        pessoaId: idDaPessoa('P9'),
        passagens: [
          {
            funcaoId: FUNCAO_MOTORISTA,
            entrada: dia('2026-02-10'),
            saida: dia('2026-03-20'),
          },
          { funcaoId: FUNCAO_PEDREIRO, entrada: dia('2026-03-21'), saida: null },
        ],
      },
    ];

    const antes = await montaOuFalha('2026-03-15', { pessoas });
    const depois = await montaOuFalha('2026-03-25', { pessoas });

    expect(quantidadeDe(antes.efetivoPessoal, 'Motorista')).toBe(1);
    expect(quantidadeDe(antes.efetivoPessoal, 'Pedreiro')).toBe(0);
    expect(quantidadeDe(depois.efetivoPessoal, 'Motorista')).toBe(0);
    expect(quantidadeDe(depois.efetivoPessoal, 'Pedreiro')).toBe(1);
  });
});

describe('efetivo de pessoal, apresentação do bloco 5', () => {
  it('exibe a quantidade zero em branco, e não como 0', async () => {
    // CT-183: o gabarito mostra célula vazia. `0` em 41 colunas polui o bloco.
    const rdo = await montaOuFalha('2026-02-09');
    const pedreiro = rdo.efetivoPessoal.colunas.find((c) => c.rotulo === 'Pedreiro');
    expect(pedreiro?.quantidade).toBe(0);
    expect(pedreiro?.texto).toBe('');
  });

  it('mantém a coluna da função sem ninguém na obra', async () => {
    // CT-250: "Topografo" está cadastrada e não tem ninguém; a coluna existe.
    const rdo = await montaOuFalha('2026-09-03');
    expect(rdo.efetivoPessoal.colunas.map((c) => c.rotulo)).toContain('Topografo');
  });

  it('soma o total do bloco a partir de todas as funções', async () => {
    // CT-188: total que não é a soma é o erro mais visível do documento.
    const rdo = await montaOuFalha('2026-02-19');
    expect(rdo.efetivoPessoal.total).toBe(3);
  });

  it('agrega por função e não carrega nome de pessoa nenhum', async () => {
    // CT-189, LGPD: o documento que circula não diz quem trabalhou.
    const rdo = await montaOuFalha('2026-02-19');
    const serializado = JSON.stringify(rdo.efetivoPessoal);
    expect(serializado).not.toContain('P1');
    expect(serializado).not.toContain('P2');
    expect(serializado).not.toContain('P3');
    expect(rdo.efetivoPessoal.colunas.map((c) => c.rotulo)).toEqual([
      'Motorista',
      'Pedreiro',
      'Topografo',
    ]);
  });
});

describe('efetivo de equipamento (decisão 1.2, caso obrigatório 8)', () => {
  it('conta o equipamento no dia exato da saída', async () => {
    // CT-192: a 1.2 mandou seguir a mesma regra da pessoa.
    const rdo = await montaOuFalha('2026-02-18');
    expect(quantidadeDe(rdo.efetivoEquipamentos, 'MT-26')).toBe(1);
  });

  it('não conta o equipamento no intervalo entre duas passagens', async () => {
    // CT-190: entre 18/02 e 01/03 ele não está na obra. Intervalo único, com
    // entrada mínima e saída máxima, o contaria presente o tempo todo.
    const rdo = await montaOuFalha('2026-02-20');
    const coluna = rdo.efetivoEquipamentos.colunas.find((c) => c.rotulo === 'MT-26');
    expect(coluna?.quantidade).toBe(0);
    expect(coluna?.texto).toBe('');
  });

  it('conta uma vez na segunda passagem', async () => {
    // CT-191: contar por linha de cadastro daria 2.
    const rdo = await montaOuFalha('2026-03-05');
    expect(quantidadeDe(rdo.efetivoEquipamentos, 'MT-26')).toBe(1);
    expect(rdo.efetivoEquipamentos.total).toBe(1);
  });
});

describe('efetivo e o estado do dia (decisão 5.1)', () => {
  it('zera os dois blocos no dia parado', async () => {
    // CT-193: hoje o RDO mostra 19 pessoas no domingo.
    const rdo = await montaOuFalha('2026-09-06', {
      dias: { '2026-09-06': diaParado('Domingo') },
    });
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(0);
    expect(rdo.efetivoPessoal.total).toBe(0);
    expect(rdo.efetivoEquipamentos.total).toBe(0);
  });

  it('mantém o efetivo mobilizado no dia não lançado', async () => {
    // CT-194: "não lançado" não é "parado"; confundir os dois esvaziaria todo
    // dia ainda não preenchido.
    const rdo = await montaOuFalha('2026-09-07');
    expect(quantidadeDe(rdo.efetivoPessoal, 'Motorista')).toBe(1);
  });
});
