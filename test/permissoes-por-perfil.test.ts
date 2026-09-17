/**
 * A matriz de permissões, pinada caso a caso.
 *
 * A varredura de `rotas-protegidas.test.ts` prova que toda superfície de
 * servidor **verifica** o acesso. Não prova **qual perfil** cada uma exige, e é
 * aí que o furo entra sem barulho: trocar `'engenheiro'` por `'encarregado'` em
 * `_composicao/cadastro.ts` é uma palavra, passa na varredura, passa no
 * `typecheck` e abre a tela para quem não devia.
 *
 * Este arquivo é o outro lado. Uma linha por par (operação, perfil), com o
 * resultado esperado, e nenhuma delas derivada da implementação: a origem é a
 * tabela "Quem usa" do PRD mais as decisões de 17/09/2026, tomadas pelo dono do
 * produto e listadas abaixo.
 *
 * ## O que mudou em 17/09/2026
 *
 * | Operação                | Antes      | Agora       |
 * | ----------------------- | ---------- | ----------- |
 * | ler pessoal             | engenheiro | encarregado |
 * | ler equipamento         | engenheiro | encarregado |
 * | cadastrar equipamento   | engenheiro | encarregado |
 * | passagem de equipamento | engenheiro | encarregado |
 * | **consultar o RDO**     | encarregado| engenheiro  |
 *
 * As duas primeiras mudam o CT-034 e o CT-047, reescritos nos módulos. A do RDO
 * é a mais sensível na direção da segurança: o documento carrega observação em
 * texto livre e o CREA do responsável técnico.
 *
 * O que NÃO mudou, e está aqui para continuar não mudando: o encarregado não
 * cadastra pessoa, não encerra passagem de equipamento, não define quantidade
 * de projeto, não acrescenta termo e não vê a lista de acessos.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  criaAmbienteDaComposicao,
  defineAmbienteParaTeste,
  restauraAmbientePadrao,
} from '../src/app/_composicao/ambiente';
import {
  acrescentaTermoProtegido,
  cadastraEquipamentoProtegido,
  cadastraPessoaProtegida,
  defineQuantidadeDeProjetoProtegida,
  encerraPassagemDeEquipamentoProtegida,
  listaAcessosDaObraProtegida,
  listaEquipamentosProtegida,
  listaPessoalProtegida,
  listaServicosProtegida,
} from '../src/app/_composicao/cadastro';
import { consultaRdoProtegida } from '../src/app/_composicao/rdo-diario';
import type { Ator } from '../src/modules/acesso';
import { diaPuroConfiavel } from '../src/shared/date/dia';
import type { ObraId, ServicoControladoId } from '../src/shared/id';
import { relogioFixo } from './fixtures/banco-de-teste';
import {
  AGORA,
  criaObraDoPrd,
  montaCenario,
  type Cenario,
} from './fixtures/cenario-de-cadastro';

let cenario: Cenario;
let obraId: ObraId;
let engenheira: Ator;
let encarregado: Ator;
let estranho: Ator;

/** Libera o encarregado por SQL cru: o convite tem teste próprio. */
function daAcessoDeEncarregado(ator: Ator, acessoId: string): Ator {
  cenario.conexao.sqlite
    .prepare(
      `INSERT INTO acesso (id, obra_id, usuario_id, perfil, liberado_por, liberado_em)
       VALUES (?, ?, ?, 'encarregado', ?, ?)`,
    )
    .run(acessoId, obraId, ator.usuarioId, engenheira.usuarioId, AGORA);
  return ator;
}

beforeEach(() => {
  cenario = montaCenario();
  defineAmbienteParaTeste(criaAmbienteDaComposicao(cenario.conexao, relogioFixo(AGORA)));

  // `novoEngenheiro`, e não `novoAtor`: só conta com `e_engenheiro` cria obra
  // (decisão 25.1).
  engenheira = cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = criaObraDoPrd(engenheira, cenario.amb);
  encarregado = daAcessoDeEncarregado(
    cenario.novoAtor('enc@exemplo.invalido'),
    '99999999-9999-4999-8999-999999999999',
  );
  estranho = cenario.novoAtor('estranho@exemplo.invalido');
});

afterEach(() => {
  restauraAmbientePadrao();
  cenario.fecha();
});

describe('o que o encarregado PODE, depois de 17/09/2026', () => {
  it('lê a lista de pessoal da obra dele', () => {
    expect(listaPessoalProtegida(encarregado, obraId, cenario.amb).ok).toBe(true);
  });

  it('lê a frota da obra dele', () => {
    expect(listaEquipamentosProtegida(encarregado, obraId, cenario.amb).ok).toBe(true);
  });

  it('cadastra equipamento, porque é ele que vê a máquina chegar', () => {
    const r = cadastraEquipamentoProtegido(
      encarregado,
      obraId,
      { identificador: 'TR-77', tipo: 'TRATOR', entrada: '2026-02-05' },
      cenario.amb,
    );
    expect(r.ok).toBe(true);
  });

  it('lê os serviços controlados, que ele precisa para lançar produção', () => {
    expect(listaServicosProtegida(encarregado, obraId, cenario.amb).ok).toBe(true);
  });
});

describe('o que o encarregado NÃO pode', () => {
  it('não consulta o RDO: o documento é do engenheiro', async () => {
    const r = await consultaRdoProtegida(encarregado, { obraId, dia: '2026-09-03' });
    expect(r.ok).toBe(false);
  });

  it('não cadastra pessoa', () => {
    const r = cadastraPessoaProtegida(
      encarregado,
      obraId,
      { nome: 'P9', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    );
    expect(r.ok).toBe(false);
  });

  it('não encerra passagem de equipamento: desmobilizar não é ato de campo', () => {
    const r = encerraPassagemDeEquipamentoProtegida(
      encarregado,
      obraId,
      '11111111-1111-4111-8111-111111111111',
      diaPuroConfiavel('2026-03-01'),
      cenario.amb,
    );
    expect(r.ok).toBe(false);
  });

  it('não define quantidade de projeto: é a base da medição', () => {
    const servicos = listaServicosProtegida(engenheira, obraId, cenario.amb);
    const primeiro = servicos.ok ? servicos.valor[0] : undefined;
    expect(primeiro).toBeDefined();
    const r = defineQuantidadeDeProjetoProtegida(
      encarregado,
      obraId,
      (primeiro?.servicoId ?? '') as ServicoControladoId,
      '100,000',
      cenario.amb,
    );
    expect(r.ok).toBe(false);
  });

  it('não acrescenta termo à taxonomia', () => {
    const r = acrescentaTermoProtegido(
      encarregado,
      obraId,
      'funcao',
      'Ajudante',
      cenario.amb,
    );
    expect(r.ok).toBe(false);
  });

  it('não vê a lista de acessos da obra', () => {
    expect(listaAcessosDaObraProtegida(encarregado, obraId, cenario.amb).ok).toBe(false);
  });
});

describe('a fronteira da obra, que nenhuma decisão de perfil move', () => {
  it('recusa tudo a quem não tem acesso nenhum à obra', async () => {
    expect(listaPessoalProtegida(estranho, obraId, cenario.amb).ok).toBe(false);
    expect(listaEquipamentosProtegida(estranho, obraId, cenario.amb).ok).toBe(false);
    expect(listaServicosProtegida(estranho, obraId, cenario.amb).ok).toBe(false);

    const rdo = await consultaRdoProtegida(estranho, { obraId, dia: '2026-09-03' });
    expect(rdo.ok).toBe(false);
  });

  it('não vaza nome de pessoa na recusa', () => {
    cadastraPessoaProtegida(
      engenheira,
      obraId,
      { nome: 'P1', funcao: 'Motorista', entrada: '2026-02-10' },
      cenario.amb,
    );
    const r = listaPessoalProtegida(estranho, obraId, cenario.amb);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(JSON.stringify(r.erro)).not.toContain('P1');
  });
});

describe('o engenheiro continua podendo tudo', () => {
  it('lê pessoal, frota, acessos e o RDO', async () => {
    expect(listaPessoalProtegida(engenheira, obraId, cenario.amb).ok).toBe(true);
    expect(listaEquipamentosProtegida(engenheira, obraId, cenario.amb).ok).toBe(true);
    expect(listaAcessosDaObraProtegida(engenheira, obraId, cenario.amb).ok).toBe(true);
  });
});
