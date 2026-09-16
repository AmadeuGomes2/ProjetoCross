/**
 * Decisão 27.1, de 16/09/2026: **só o engenheiro exporta o PDF**, e o
 * encarregado **não vê** o controle na tela.
 *
 * O servidor já recusava com 403 — a prova está em
 * `test/circuito-rdo-e-pdf.test.ts`, "recusa o PDF ao encarregado da própria
 * obra". Este teste cobre a outra metade da decisão: a interface deixa de
 * prometer o que não vai cumprir. Esconder o botão **não substitui** a recusa
 * do servidor; é o complemento dela.
 *
 * Origem da expectativa: `docs/prd/v1.md`, tabela DECISÕES TOMADAS, 27.1.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { idConfiavel } from '../../../shared/id';
import { ControleDeExportacao } from './controle-de-exportacao';

const OBRA = idConfiavel<'obra'>('11111111-1111-4111-8111-111111111111');
const DIA = '2026-09-03';

describe('controle de exportação do RDO na tela', () => {
  it('não mostra nada ao encarregado', () => {
    const controle = ControleDeExportacao({
      perfil: 'encarregado',
      obraId: OBRA,
      dia: DIA,
    });

    expect(controle).toBeNull();
  });

  it('não mostra nada quando o perfil não é conhecido', () => {
    const controle = ControleDeExportacao({ perfil: null, obraId: OBRA, dia: DIA });

    expect(controle).toBeNull();
  });

  it('mostra ao engenheiro o caminho da rota de exportação', () => {
    const marcado = renderToStaticMarkup(
      ControleDeExportacao({ perfil: 'engenheiro', obraId: OBRA, dia: DIA }),
    );

    expect(marcado).toContain(`/rdo/${OBRA}/${DIA}/pdf`);
    expect(marcado).toContain('Exportar em PDF');
  });
});
