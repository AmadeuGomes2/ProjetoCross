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
import type { EventoDeExportacaoDePeriodo } from './periodo/portas';

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
        loteId: null,
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

/**
 * A trilha de uma exportação de período: **uma linha por dia**.
 *
 * O `loteId` reúne as linhas da mesma exportação. O par
 * `dataInicial`/`dataFinal` mentiria sobre conjunto não contíguo: exportar
 * {02, 05, 09} viraria "02 a 09", e a auditoria leria oito dias onde houve
 * três (migration `0004`).
 *
 * Grava tudo numa transação: trilha pela metade é pior que trilha nenhuma,
 * porque parece completa.
 */
export function registraExportacaoDePeriodoNoBanco(
  db: BancoRdo,
  eventos: readonly EventoDeExportacaoDePeriodo[],
): Result<void, ErroDeDominio> {
  // Guarda e estreitamento numa linha só: o log abaixo não aceita `undefined`
  // (`ContextoDeLog` só recebe id), e conjunto vazio não tem o que registrar.
  const primeiro = eventos[0];
  if (primeiro === undefined) return ok(undefined);

  try {
    db.transaction((tx) => {
      for (const evento of eventos) {
        const id: RegistroExportacaoId = geraId();
        tx.insert(registroExportacao)
          .values({
            id,
            obraId: evento.obraId,
            usuarioId: evento.usuarioId,
            momento: evento.momento,
            dataRdo: evento.dia,
            formato: evento.formato,
            loteId: evento.loteId,
          })
          .run();
      }
    });
    return ok(undefined);
  } catch (causa) {
    const correlacaoId: CorrelacaoId = geraId();
    registra(
      'erro',
      correlacaoId,
      causa instanceof Error
        ? `export.trilha_de_periodo_falhou.${causa.name}`
        : 'export.trilha_de_periodo_falhou',
      {
        obraId: primeiro?.obraId,
        usuarioId: primeiro?.usuarioId,
        // A quantidade, nunca a lista de dias: log não carrega o pedido.
        quantidade: eventos.length,
      },
    );
    return erro(erroInesperado(correlacaoId));
  }
}
