/**
 * Convite do encarregado e revogação de acesso.
 *
 * Decisão 14.0, de 16/09/2026: **link de uso único, validade de 7 dias, vários
 * encarregados por obra, revogável pelo engenheiro**. R26.
 *
 * O token viaja uma vez, no link. Não é gravado em claro (2.5), não entra em
 * log, em mensagem de erro, em URL registrada nem em histórico (CT-085). Por
 * isso nenhuma função deste arquivo passa o token para `registra()`: o que vai
 * para o log é o id do convite.
 */

import { instanteAgora, type Instante } from '../../shared/date/fuso';
import { geraId, type AcessoId, type ObraId, type UsuarioId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { abreSessao, type SessaoAberta } from './autenticacao';
import { exigeAcessoNaObra } from './autorizacao';
import * as repositorio from './repositorio';
import { geraToken, hashDeToken } from './token';
import type { Ambiente, Ator, ObraResumo } from './tipos';

/** Decisão 14.0. Está numa constante para que o número não se repita no código. */
export const DIAS_DE_VALIDADE_DO_CONVITE = 7;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Soma de **instante**, não de dia de obra.
 *
 * A validade do convite é contada do momento em que o link foi gerado, com
 * hora: o cenário do PRD fala em "01/09/2026 às 10h00" e "08/09/2026 às
 * 09h59". Dia puro e aritmética de calendário (`shared/date/dia`) valem para
 * data de obra, que é outra coisa e não passa por aqui.
 */
function expiraEmApos(agora: Date, dias: number): Instante {
  return new Date(agora.getTime() + dias * MS_POR_DIA).toISOString();
}

export interface ConviteGerado {
  readonly conviteId: string;
  /** Em claro, uma única vez. Quem perder o link gera outro; não há reexibição. */
  readonly token: string;
  readonly expiraEm: Instante;
}

/**
 * Gera o link. Só o engenheiro **daquela obra** (CT-076, CT-084).
 */
export function geraConvite(
  obraId: ObraId,
  ator: Ator,
  amb: Ambiente,
): Result<ConviteGerado, ErroDeDominio> {
  const naObra = exigeAcessoNaObra(ator, obraId, 'engenheiro', amb);
  if (!naObra.ok) {
    return erro(erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, naObra.erro.mensagem));
  }

  const agora = amb.relogio();
  const token = geraToken();
  const id = geraId<'convite'>();
  const expiraEm = expiraEmApos(agora, DIAS_DE_VALIDADE_DO_CONVITE);

  repositorio.insereConvite(amb.db, {
    id,
    obraId,
    tokenHash: hashDeToken(token),
    criadoPor: ator.usuarioId,
    criadoEm: agora.toISOString(),
    expiraEm,
  });

  // O id do convite vai para o log; o token, nunca (CT-085).
  registra('info', geraId<'correlacao'>(), 'acesso.convite_gerado', {
    obraId,
    usuarioId: ator.usuarioId,
  });

  return ok({ conviteId: id, token, expiraEm });
}

/**
 * Aceita o convite e cria o acesso de encarregado.
 *
 * Tudo numa transação: conferir que não foi usado, marcar como usado e gravar
 * o acesso. Se o `UPDATE` do uso único não afetar linha, nada é gravado — é o
 * que faz o CT-077 valer mesmo com dois aceites ao mesmo tempo.
 *
 * O erro é o mesmo para token desconhecido, expirado e já usado? **Não**:
 * expirado e usado têm mensagem própria, porque o PRD exige que a mensagem diga
 * que o convite expirou (CT-079) e porque quem tem o link já o tem — a mensagem
 * não revela nada que o portador não saiba. Token desconhecido cai na frase
 * genérica.
 */
export function aceitaConvite(
  token: string,
  usuarioId: UsuarioId,
  amb: Ambiente,
): Result<ObraId, ErroDeDominio> {
  const correlacao = geraId<'correlacao'>();
  const recusaGenerica = erroDeDominio(
    CODIGO_ERRO.SEM_PERMISSAO,
    'Este convite não é válido. Peça um link novo ao engenheiro responsável.',
  );

  if (token.trim() === '') return erro(recusaGenerica);

  const linha = repositorio.buscaConvitePorHash(amb.db, hashDeToken(token));
  if (linha === null) {
    // Nem o token nem parte dele vão para o log. Só o código do erro.
    registra('aviso', correlacao, 'acesso.convite_desconhecido', {
      codigo: CODIGO_ERRO.SEM_PERMISSAO,
    });
    return erro(recusaGenerica);
  }

  if (linha.usadoEm !== null) {
    registra('aviso', correlacao, 'acesso.convite_ja_usado', { obraId: linha.obraId });
    return erro(
      erroDeDominio(
        CODIGO_ERRO.SEM_PERMISSAO,
        'Este convite já foi utilizado. Peça um link novo ao engenheiro responsável.',
      ),
    );
  }

  const agora = instanteAgora(amb.relogio);
  if (linha.expiraEm <= agora) {
    registra('aviso', correlacao, 'acesso.convite_expirado', { obraId: linha.obraId });
    return erro(
      erroDeDominio(
        CODIGO_ERRO.SEM_PERMISSAO,
        'O convite expirou. Peça um link novo ao engenheiro responsável.',
      ),
    );
  }

  if (!repositorio.existeUsuario(amb.db, usuarioId)) {
    return erro(recusaGenerica);
  }

  // Já é encarregado desta obra: aceitar de novo não cria acesso duplicado,
  // e o UNIQUE parcial do banco recusaria de qualquer forma.
  if (repositorio.buscaAcessoAtivo(amb.db, usuarioId, linha.obraId) !== null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, 'Esta conta já tem acesso a esta obra.'),
    );
  }

  let aceito = false;
  amb.db.transaction((tx) => {
    const afetadas = repositorio.marcaConviteUsado(tx, linha.id, usuarioId, agora);
    // Zero linhas afetadas quer dizer que outro aceite chegou antes. Nada foi
    // escrito nesta transação, então não há o que desfazer: basta não gravar o
    // acesso. É o que faz o uso único valer sem depender do SELECT anterior.
    if (afetadas !== 1) return;
    repositorio.insereAcesso(tx, {
      id: geraId<'acesso'>(),
      obraId: linha.obraId,
      usuarioId,
      perfil: 'encarregado',
      // Quem liberou responde pelo acesso: é o autor do convite, não o convidado.
      liberadoPor: linha.criadoPor,
      liberadoEm: agora,
    });
    aceito = true;
  });

  if (!aceito) return erro(recusaGenerica);

  registra('info', correlacao, 'acesso.convite_aceito', {
    obraId: linha.obraId,
    usuarioId,
    perfil: 'encarregado',
  });
  return ok(linha.obraId);
}

/** Aceita o convite **e** abre a sessão do encarregado, num passo só. */
export function aceitaConviteEEntra(
  token: string,
  usuarioId: UsuarioId,
  amb: Ambiente,
): Result<{ obraId: ObraId; sessao: SessaoAberta }, ErroDeDominio> {
  const aceite = aceitaConvite(token, usuarioId, amb);
  if (!aceite.ok) return aceite;
  return ok({ obraId: aceite.valor, sessao: abreSessao(usuarioId, amb) });
}

/**
 * Revoga o acesso de alguém na obra. Só o engenheiro daquela obra (CT-083).
 *
 * A linha **não é apagada** (2.4): os lançamentos já feitos continuam
 * existindo, com a autoria preservada (CT-082). Revogar acesso não é apagar
 * histórico; o RDO entregue ao fiscal não muda porque alguém saiu da obra.
 */
export function revogaAcesso(
  acessoId: AcessoId,
  ator: Ator,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  const alvo = repositorio.buscaAcessoPorId(amb.db, acessoId);
  const recusa = erroDeDominio(
    CODIGO_ERRO.SEM_PERMISSAO,
    'Você não tem acesso a esta obra ou a esta ação.',
  );
  if (alvo === null) return erro(recusa);

  const naObra = exigeAcessoNaObra(ator, alvo.obraId, 'engenheiro', amb);
  if (!naObra.ok) return erro(recusa);

  if (
    alvo.perfil === 'engenheiro' &&
    repositorio.contaEngenheirosAtivos(amb.db, alvo.obraId) <= 1
  ) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.SEM_PERMISSAO,
        'Esta obra ficaria sem engenheiro responsável. Libere outro antes de revogar este.',
      ),
    );
  }

  repositorio.marcaAcessoRevogado(
    amb.db,
    acessoId,
    ator.usuarioId,
    instanteAgora(amb.relogio),
  );
  registra('info', geraId<'correlacao'>(), 'acesso.revogado', {
    obraId: alvo.obraId,
    usuarioId: alvo.usuarioId,
  });
  return ok(undefined);
}

/** Quem tem acesso ativo à obra. Só o engenheiro daquela obra consulta. */
export function listaAcessosDaObra(
  obraId: ObraId,
  ator: Ator,
  amb: Ambiente,
): Result<repositorio.LinhaDeAcessoDaObra[], ErroDeDominio> {
  const naObra = exigeAcessoNaObra(ator, obraId, 'engenheiro', amb);
  if (!naObra.ok) {
    return erro(erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, naObra.erro.mensagem));
  }
  return ok(repositorio.listaAcessosDaObra(amb.db, obraId));
}

/** As obras que o usuário pode ver. Nada além delas (CT-074). */
export function listaObrasDoUsuario(
  usuarioId: UsuarioId,
  amb: Ambiente,
): Result<ObraResumo[], ErroDeDominio> {
  return ok(repositorio.listaObrasComAcesso(amb.db, usuarioId));
}
