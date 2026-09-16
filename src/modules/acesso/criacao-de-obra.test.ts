/**
 * Decisão 25.1, de 16/09/2026: **só o engenheiro cria obra.**
 *
 * "Não há cadastro público: a primeira conta de engenheiro nasce por comando de
 * instalação, e daí em diante só quem já é engenheiro de alguma obra cria
 * outra" (`docs/prd/v1.md`, DECISÕES TOMADAS, 25.1).
 *
 * ## Onde mora "ser engenheiro"
 *
 * Na **conta**, na coluna `usuario.e_engenheiro`, e não em `acesso.perfil`. São
 * duas coisas diferentes: ser engenheiro é atributo da pessoa, que tem CREA e
 * assina o documento (bloco 11 do RDO); `acesso.perfil` diz o que a pessoa pode
 * fazer **naquela obra**. Quem liga a coluna é só o comando de instalação.
 *
 * Em consequência, e é o que estes casos travam:
 *
 * 1. **Não existe mais "sistema vazio permite qualquer um".** A versão anterior
 *    abria uma janela enquanto não houvesse engenheiro nenhum no sistema; ela
 *    saiu, porque qualquer rotina que um dia apague, arquive ou migre obras a
 *    reabriria sem ninguém perceber.
 * 2. **Conta vinda de convite não cria obra**, nem depois de receber, por outro
 *    caminho, o perfil `engenheiro` numa obra.
 *
 * As expectativas saem da decisão e do enunciado que a corrige, nunca da
 * implementação. CT-012 continua em `obra-cadastro.test.ts`: encarregado não
 * cria obra.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { criaObraProtegida, geraConviteProtegido } from '../../app/_composicao/cadastro';
import { paraAcesso } from '../../app/_composicao/ambiente-de-cadastro';
import { geraId } from '../../shared/id';
import { CODIGO_ERRO } from '../../shared/result';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';
import { registraUsuario } from './autenticacao';
import { aceitaConvite } from './convite';
import { criaContaDeEngenheiroDeInstalacao } from './instalacao';
import type { Ator } from './tipos';

const SENHA = 'ponte-cavalo-bateria-grampo';

let cenario: Cenario;

beforeEach(() => {
  cenario = montaCenario();
});

afterEach(() => {
  cenario.fecha();
});

function totalDeObras(): number {
  const linha = cenario.conexao.sqlite
    .prepare('SELECT count(*) AS total FROM obra')
    .get() as { total: number };
  return linha.total;
}

/** A conta que `npm run criar-engenheiro` fabrica, pelo caso de uso de verdade. */
async function contaDaInstalacao(email: string): Promise<Ator> {
  const criada = await criaContaDeEngenheiroDeInstalacao(
    {
      nome: 'E1',
      email,
      mesmoComEngenheiroExistente: true,
      pedeSenha: async () => SENHA,
    },
    paraAcesso(cenario.amb),
  );
  if (!criada.ok) throw new Error(criada.erro.mensagem);
  return { usuarioId: criada.valor.usuarioId, sessaoId: geraId<'sessao'>() };
}

/** Conta nascida na web pelo aceite de convite, que é o único caminho público. */
async function contaVindaDeConvite(email: string, engenheiroDaObra: Ator) {
  const obraId = criaObraDoPrd(engenheiroDaObra, cenario.amb);
  const convite = geraConviteProtegido(
    engenheiroDaObra,
    obraId,
    'encarregado',
    cenario.amb,
  );
  if (!convite.ok) throw new Error(convite.erro.mensagem);

  const criado = await registraUsuario(
    { nome: 'C1', email, senha: SENHA },
    paraAcesso(cenario.amb),
  );
  if (!criado.ok) throw new Error(criado.erro.mensagem);

  const aceite = aceitaConvite(
    convite.valor.token,
    criado.valor,
    paraAcesso(cenario.amb),
  );
  if (!aceite.ok) throw new Error(aceite.erro.mensagem);

  return { ator: { usuarioId: criado.valor, sessaoId: geraId<'sessao'>() }, obraId };
}

describe('quem cria obra (decisão 25.1)', () => {
  it('a conta do comando de instalação cria a primeira obra do sistema', async () => {
    const fundador = await contaDaInstalacao('e1@exemplo.invalido');

    const obra = criaObraProtegida(fundador, DADOS_DA_OBRA, cenario.amb);

    expect(obra.ok).toBe(true);
    expect(totalDeObras()).toBe(1);
  });

  it('a conta do comando de instalação cria também a segunda obra', async () => {
    const fundador = await contaDaInstalacao('e1@exemplo.invalido');
    criaObraDoPrd(fundador, cenario.amb);

    const segunda = criaObraProtegida(
      fundador,
      { ...DADOS_DA_OBRA, contrato: 'P0999/01-25 - OUTRA' },
      cenario.amb,
    );

    expect(segunda.ok).toBe(true);
    expect(totalDeObras()).toBe(2);
  });

  it('conta comum não cria obra nem no sistema vazio: a janela da instalação não existe mais', () => {
    // O comportamento que saiu. Antes, sem nenhum engenheiro no sistema,
    // qualquer conta criava a primeira obra.
    const qualquer = cenario.novoAtor('qualquer@exemplo.invalido');

    const resultado = criaObraProtegida(qualquer, DADOS_DA_OBRA, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(totalDeObras()).toBe(0);
  });

  it('conta comum não cria obra depois que já existe engenheiro', () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    criaObraDoPrd(e1, cenario.amb);
    const qualquer = cenario.novoAtor('qualquer@exemplo.invalido');
    const antes = totalDeObras();

    const resultado = criaObraProtegida(qualquer, DADOS_DA_OBRA, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(totalDeObras()).toBe(antes);
  });

  it('conta vinda de convite não cria obra', async () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const { ator: c1 } = await contaVindaDeConvite('c1@exemplo.invalido', e1);
    const antes = totalDeObras();

    const resultado = criaObraProtegida(c1, DADOS_DA_OBRA, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(totalDeObras()).toBe(antes);
  });

  it('conta vinda de convite não cria obra nem virando engenheiro de uma obra por outro caminho', async () => {
    // Perfil de engenheiro NUMA OBRA não é o mesmo que ser engenheiro: o
    // perfil diz o que a pessoa faz naquela obra; a coluna da conta diz quem
    // ela é. Só o comando de instalação liga a coluna.
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const { ator: c1, obraId } = await contaVindaDeConvite('c1@exemplo.invalido', e1);
    cenario.conexao.sqlite
      .prepare(
        `UPDATE acesso SET perfil = 'engenheiro' WHERE usuario_id = ? AND obra_id = ?`,
      )
      .run(c1.usuarioId, obraId);
    const antes = totalDeObras();

    const resultado = criaObraProtegida(c1, DADOS_DA_OBRA, cenario.amb);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.codigo).toBe(CODIGO_ERRO.SEM_PERMISSAO);
    expect(totalDeObras()).toBe(antes);
  });

  it('a conta nascida na web fica com a coluna de engenheiro desligada', async () => {
    const e1 = cenario.novoEngenheiro('e1@exemplo.invalido');
    const { ator: c1 } = await contaVindaDeConvite('c1@exemplo.invalido', e1);

    const linha = cenario.conexao.sqlite
      .prepare('SELECT e_engenheiro FROM usuario WHERE id = ?')
      .get(c1.usuarioId) as { e_engenheiro: number };

    expect(linha.e_engenheiro).toBe(0);
  });
});
