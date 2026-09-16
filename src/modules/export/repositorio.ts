/**
 * A trilha de exportação (R20): quem, quando, qual obra, qual período.
 *
 * `docs/arquitetura/v1.md`, 2.22 e 4.1 item 4: o acesso ao banco é por módulo,
 * e este módulo possui `registro_exportacao` e nenhuma outra tabela. A linha é
 * gravada **antes** de o arquivo ser entregue, e nunca é apagada nem
 * atualizada.
 *
 * **Id, nunca nome** (CLAUDE.md, Segurança). A tabela guarda `usuario_id`; o
 * nome de quem exportou não entra nem aqui, nem no log, nem no PDF.
 *
 * Por que o erro é `FALHA_INESPERADA` e não `NAO_ENCONTRADO`: o código vira
 * status HTTP na rota, e "não foi possível gravar a trilha" nunca é um 404. A
 * porta recusava com `NAO_ENCONTRADO` enquanto estava pendente, e essa recusa
 * teria saído como "RDO não existe" para o engenheiro.
 */

import type { BancoRdo } from '../../db';
import { registroExportacao } from '../../db/schema';
import { geraId, type CorrelacaoId, type RegistroExportacaoId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  erro,
  erroInesperado,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import type { EventoDeExportacao } from './portas';

export function registraExportacaoNoBanco(
  db: BancoRdo,
  evento: EventoDeExportacao,
): Result<void, ErroDeDominio> {
  const id: RegistroExportacaoId = geraId();
  try {
    db.insert(registroExportacao)
      .values({
        id,
        obraId: evento.obraId,
        usuarioId: evento.usuarioId,
        momento: evento.momento,
        dataRdo: evento.dataRdo,
        formato: evento.formato,
      })
      .run();
    return ok(undefined);
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    // A exceção não é engolida: vira este evento, com o identificador que o
    // usuário recebe. A mensagem da causa não é copiada — um erro de driver
    // costuma citar o valor da linha (arquitetura, 5.4).
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error
        ? `export.trilha_falhou.${causa.name}`
        : 'export.trilha_falhou',
      { obraId: evento.obraId, usuarioId: evento.usuarioId, dia: evento.dataRdo },
    );
    return erro(erroInesperado(correlacaoId));
  }
}
