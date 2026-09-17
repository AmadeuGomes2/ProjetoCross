/**
 * Raiz de composição do cadastro.
 *
 * docs/arquitetura/v1.md, 4.1: **módulo não importa de módulo**. O consumidor
 * declara a porta, o produtor exporta uma função com a mesma forma, e a
 * ligação acontece aqui — o único lugar do sistema que importa de mais de um
 * módulo. Pasta com `_` não vira rota no App Router.
 *
 * Duas ligações moram neste arquivo e em nenhum outro:
 *
 * - `obra` → `acesso.concedeAcessoDeEngenheiro`, para que criar a obra e dar
 *   acesso ao criador caibam na mesma transação (CT-003);
 * - `pessoal` e `equipamento` → `taxonomia.resolveTermo`, para que a função e o
 *   tipo sejam **referência ao cadastro** e não texto copiado (R13).
 */

import { obtemBanco, type BancoRdo } from '../../db';
import { concedeAcessoDeEngenheiro } from '../../modules/acesso';
import type { Ambiente as AmbienteDeAcesso } from '../../modules/acesso';
import type { Ambiente as AmbienteDeEquipamento } from '../../modules/equipamento';
import type { Ambiente as AmbienteDeObra } from '../../modules/obra';
import type { Ambiente as AmbienteDePessoal } from '../../modules/pessoal';
import { resolveTermo } from '../../modules/taxonomia';
import type { Ambiente as AmbienteDeTaxonomia } from '../../modules/taxonomia';
import { idConfiavel, type FuncaoId, type TipoEquipamentoId } from '../../shared/id';

/**
 * O módulo `taxonomia` devolve `Termo.id` como `string`, porque a mesma função
 * serve às três tabelas. Aqui o id ganha a marca do domínio de destino: veio
 * do banco, já foi gravado, e é exatamente o caso de uso de `idConfiavel`.
 */
function idDeFuncao(valor: string): FuncaoId {
  return idConfiavel<'funcao'>(valor);
}

function idDeTipoEquipamento(valor: string): TipoEquipamentoId {
  return idConfiavel<'tipo_equipamento'>(valor);
}

export interface AmbienteDeCadastro {
  readonly db: BancoRdo;
  /** Injetado sempre. Teste não depende do relógio real (padroes-codigo). */
  readonly relogio: () => Date;
}

export function ambienteDeCadastroPadrao(): AmbienteDeCadastro {
  return { db: obtemBanco(), relogio: () => new Date() };
}

export function paraAcesso(amb: AmbienteDeCadastro): AmbienteDeAcesso {
  return { db: amb.db, relogio: amb.relogio };
}

export function paraTaxonomia(amb: AmbienteDeCadastro): AmbienteDeTaxonomia {
  return { db: amb.db, relogio: amb.relogio };
}

export function paraObra(amb: AmbienteDeCadastro): AmbienteDeObra {
  return { db: amb.db, relogio: amb.relogio, concedeAcessoDeEngenheiro };
}

/**
 * **PENDENTE — contrato a pedir aos donos de `pessoal` e `equipamento`.**
 *
 * `taxonomia.resolveTermo` passou a ser assíncrona com o Postgres (17/09/2026),
 * e não existe forma de atender uma porta síncrona com uma leitura de rede: um
 * adaptador que "esperasse" não existe em JavaScript. As duas portas precisam
 * virar assíncronas, e são quatro linhas, em dois módulos que esta frente não
 * pode tocar:
 *
 * - `src/modules/pessoal/tipos.ts:30` — `ResolveFuncao` devolvendo `Promise`;
 * - `src/modules/pessoal/casos-de-uso.ts:132` — `resolveFuncaoOuErro` `async`;
 * - `src/modules/equipamento/tipos.ts:24` — `ResolveTipoEquipamento` idem;
 * - `src/modules/equipamento/casos-de-uso.ts:121` — `await amb.resolve...`.
 *
 * O adaptador abaixo já está na forma certa. Enquanto o contrato não muda, é
 * ele que o `tsc` acusa — de propósito: o erro é o pedido.
 */
export function paraPessoal(amb: AmbienteDeCadastro): AmbienteDePessoal {
  const taxonomia = paraTaxonomia(amb);
  return {
    db: amb.db,
    relogio: amb.relogio,
    // Comparação por `chaveDeTermo`, nunca por igualdade exata: `"Motorista "`
    // e `"motorista"` encontram o mesmo termo (CT-029, CT-030).
    resolveFuncao: async (termo) => {
      const achado = await resolveTermo('funcao', termo, taxonomia);
      if (achado === null || !achado.ativo) return null;
      return { id: idDeFuncao(achado.id), termo: achado.termo };
    },
  };
}

export function paraEquipamento(amb: AmbienteDeCadastro): AmbienteDeEquipamento {
  const taxonomia = paraTaxonomia(amb);
  return {
    db: amb.db,
    relogio: amb.relogio,
    resolveTipoEquipamento: async (termo) => {
      const achado = await resolveTermo('tipo_equipamento', termo, taxonomia);
      if (achado === null || !achado.ativo) return null;
      return { id: idDeTipoEquipamento(achado.id), termo: achado.termo };
    },
  };
}
