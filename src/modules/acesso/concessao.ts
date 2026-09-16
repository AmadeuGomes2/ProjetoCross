/**
 * Concessão de acesso dentro de uma transação alheia.
 *
 * Existe por causa do CT-003: criar a obra e dar acesso de engenheiro ao
 * criador têm de acontecer **juntos, ou nenhum dos dois**. Se a obra fosse
 * gravada e a concessão falhasse, a obra nasceria inacessível — ninguém
 * cadastraria nada nela e ninguém conseguiria liberar ninguém.
 *
 * O módulo `obra` não importa este arquivo: ele declara a porta
 * `ConcedeAcessoDeEngenheiro` e recebe esta função pela raiz de composição
 * (docs/arquitetura/v1.md, 4.1). Por isso a assinatura recebe o banco — que na
 * prática é a transação em curso — em vez de abrir uma conexão própria.
 */

import type { BancoRdo } from '../../db';
import type { Instante } from '../../shared/date/fuso';
import { geraId, type ObraId, type UsuarioId } from '../../shared/id';
import { insereAcesso } from './repositorio';

export function concedeAcessoDeEngenheiro(
  db: BancoRdo,
  obraId: ObraId,
  usuarioId: UsuarioId,
  em: Instante,
): void {
  insereAcesso(db, {
    id: geraId<'acesso'>(),
    obraId,
    usuarioId,
    perfil: 'engenheiro',
    // Quem cria a obra libera a si mesmo. A trilha continua completa: o
    // registro diz quem liberou e quando, mesmo quando é a mesma pessoa.
    liberadoPor: usuarioId,
    liberadoEm: em,
  });
}
