/**
 * A logo, contra o banco: gravar, ler, trocar, tirar — e sobreviver.
 *
 * O teste que move este arquivo é **"editar o cabeçalho não apaga a logo"**. O
 * risco é real e quase entrou: `LinhaDeObra` é a forma da leitura E da escrita,
 * e `atualizaCabecalho` recebe `Omit<LinhaDeObra, ...>` e manda tudo num `SET`.
 * Acrescentar `logoTipo` àquele tipo — o movimento óbvio — faria toda edição
 * das informações gerais zerar a logo, sem erro e sem aviso.
 *
 * Um defeito assim não aparece em revisão e não aparece na tela: aparece um mês
 * depois, quando alguém corrige o nome do contrato e o RDO sai sem a marca.
 *
 * As expectativas vêm da regra, não da implementação: a logo é cadastro da
 * obra, e o cadastro de uma coisa não mexe no de outra.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  defineLogoProtegida,
  editaCadastroDaObraProtegida,
  obtemCabecalhoProtegido,
  obtemLogoProtegida,
  removeLogoProtegida,
} from '../../app/_composicao/cadastro';
import type { Ator } from '../acesso';
import type { ObraId } from '../../shared/id';
import {
  criaObraDoPrd,
  DADOS_DA_OBRA,
  montaCenario,
  type Cenario,
} from '../../../test/fixtures/cenario-de-cadastro';

/** Um PNG mínimo de verdade: assinatura mais um cabeçalho IHDR plausível. */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]),
  Buffer.alloc(32, 7),
]);

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 3)]);

let cenario: Cenario;
let obraId: ObraId;
let engenheira: Ator;
let encarregado: Ator;

beforeEach(async () => {
  cenario = await montaCenario();
  engenheira = await cenario.novoEngenheiro('eng@exemplo.invalido');
  obraId = await criaObraDoPrd(engenheira, cenario.amb);
  encarregado = await cenario.novoEncarregado('enc@exemplo.invalido', obraId);
});

afterEach(async () => {
  await cenario.fecha();
});

describe('a logo da obra, contra o banco', () => {
  it('a obra nasce sem logo', async () => {
    const cabecalho = await obtemCabecalhoProtegido(engenheira, obraId, cenario.amb);
    expect(cabecalho.ok).toBe(true);
    if (cabecalho.ok) expect(cabecalho.valor.temLogo).toBe(false);

    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    expect(lida.ok).toBe(true);
    if (lida.ok) expect(lida.valor).toBeNull();
  });

  it('grava e devolve os mesmos bytes, com o tipo lido dos bytes', async () => {
    const gravada = await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);
    expect(gravada.ok).toBe(true);

    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    expect(lida.ok).toBe(true);
    if (lida.ok && lida.valor !== null) {
      expect(lida.valor.tipo).toBe('image/png');
      expect(Buffer.from(lida.valor.bytes).equals(PNG)).toBe(true);
    }
  });

  it('EDITAR O CABEÇALHO NÃO APAGA A LOGO', async () => {
    await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);

    const editada = await editaCadastroDaObraProtegida(
      engenheira,
      obraId,
      { ...DADOS_DA_OBRA, contrato: 'P0476/01-25 - BLOCO 03' },
      cenario.amb,
    );
    expect(editada.ok).toBe(true);

    // O contrato mudou...
    const cabecalho = await obtemCabecalhoProtegido(engenheira, obraId, cenario.amb);
    if (cabecalho.ok) {
      expect(cabecalho.valor.contrato).toBe('P0476/01-25 - BLOCO 03');
      // ...e a logo continua lá.
      expect(cabecalho.valor.temLogo).toBe(true);
    }

    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    expect(lida.ok).toBe(true);
    if (lida.ok) expect(lida.valor).not.toBeNull();
  });

  it('trocar a logo substitui, sem deixar a anterior', async () => {
    await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);
    await defineLogoProtegida(engenheira, obraId, JPEG, cenario.amb);

    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    if (lida.ok && lida.valor !== null) {
      expect(lida.valor.tipo).toBe('image/jpeg');
      expect(Buffer.from(lida.valor.bytes).equals(JPEG)).toBe(true);
    }
  });

  it('tirar a logo zera as duas colunas juntas', async () => {
    await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);
    const removida = await removeLogoProtegida(engenheira, obraId, cenario.amb);
    expect(removida.ok).toBe(true);

    // Meia logo — bytes sem tipo, ou tipo sem bytes — violaria `ck_obra_logo`.
    // Se as duas não fossem a nulo juntas, o banco teria recusado acima.
    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    if (lida.ok) expect(lida.valor).toBeNull();

    const cabecalho = await obtemCabecalhoProtegido(engenheira, obraId, cenario.amb);
    if (cabecalho.ok) expect(cabecalho.valor.temLogo).toBe(false);
  });

  it('recusa o arquivo que não é imagem, e a obra fica sem logo', async () => {
    const html = Buffer.from('<!DOCTYPE html><script>alert(1)</script>');
    const r = await defineLogoProtegida(engenheira, obraId, html, cenario.amb);

    expect(r.ok).toBe(false);
    const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
    if (lida.ok) expect(lida.valor).toBeNull();
  });

  describe('fronteira entre perfis', () => {
    it('o encarregado LÊ a logo: é a marca da empresa dele', async () => {
      await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);

      const lida = await obtemLogoProtegida(encarregado, obraId, cenario.amb);
      expect(lida.ok).toBe(true);
      if (lida.ok) expect(lida.valor).not.toBeNull();
    });

    it('o encarregado NÃO troca a logo: ela sai no RDO', async () => {
      const r = await defineLogoProtegida(encarregado, obraId, PNG, cenario.amb);
      expect(r.ok).toBe(false);

      const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
      if (lida.ok) expect(lida.valor).toBeNull();
    });

    it('o encarregado não tira a logo', async () => {
      await defineLogoProtegida(engenheira, obraId, PNG, cenario.amb);

      const r = await removeLogoProtegida(encarregado, obraId, cenario.amb);
      expect(r.ok).toBe(false);

      const lida = await obtemLogoProtegida(engenheira, obraId, cenario.amb);
      if (lida.ok) expect(lida.valor).not.toBeNull();
    });

    it('quem não tem acesso à obra não lê nem grava', async () => {
      const estranha = await cenario.novoEngenheiro('outra@exemplo.invalido');

      expect((await obtemLogoProtegida(estranha, obraId, cenario.amb)).ok).toBe(false);
      expect((await defineLogoProtegida(estranha, obraId, PNG, cenario.amb)).ok).toBe(
        false,
      );
    });
  });
});
