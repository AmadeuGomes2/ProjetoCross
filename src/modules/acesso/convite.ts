/**
 * Convite de acesso à obra e revogação.
 *
 * Decisão 14.0, de 16/09/2026: **link de uso único, validade de 7 dias, vários
 * encarregados por obra, revogável pelo engenheiro**. R26.
 *
 * Decisão 34.1, de 16/09/2026: **um engenheiro pode dar acesso de engenheiro a
 * outra pessoa na obra.** O perfil passou a ser parâmetro da geração e fica
 * gravado na linha do convite; quem aceita não escolhe nada. Antes disto, a
 * saída do engenheiro travava o cadastro da obra, porque só o comando no
 * servidor criava outro (25.1).
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
import type { Ambiente, Ator, ObraResumo, Perfil } from './tipos';

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
  readonly perfil: Perfil;
}

const PERFIS_DE_CONVITE: readonly Perfil[] = ['engenheiro', 'encarregado'];

/**
 * O perfil pedido pelo formulário, que é entrada hostil.
 *
 * Existe para que a conversão de texto para `Perfil` aconteça num lugar só, e
 * que a Server Action não precise de `as`. Qualquer coisa fora da lista é
 * recusada aqui, antes de virar convite; o CHECK do banco é a segunda camada.
 */
export function perfilDeConvite(bruto: unknown): Result<Perfil, ErroDeDominio> {
  const achado = PERFIS_DE_CONVITE.find((p) => p === bruto);
  if (achado === undefined) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.VALOR_FORA_DA_LISTA,
        'Escolha o tipo de acesso: engenheiro ou encarregado.',
      ),
    );
  }
  return ok(achado);
}

/**
 * Gera o link. Só o engenheiro **daquela obra** (CT-076, CT-084).
 *
 * O `perfil` é o que o convite vai conceder (34.1). Quem convida precisa ser
 * engenheiro da obra para qualquer um dos dois — inclusive para convidar
 * encarregado, como já era —, e a verificação é a mesma linha de sempre, lida
 * da tabela `acesso` no servidor.
 */
export async function geraConvite(
  obraId: ObraId,
  perfil: Perfil,
  ator: Ator,
  amb: Ambiente,
): Promise<Result<ConviteGerado, ErroDeDominio>> {
  const naObra = await exigeAcessoNaObra(ator, obraId, 'engenheiro', amb);
  if (!naObra.ok) {
    return erro(erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, naObra.erro.mensagem));
  }

  const agora = amb.relogio();
  const token = geraToken();
  const id = geraId<'convite'>();
  const expiraEm = expiraEmApos(agora, DIAS_DE_VALIDADE_DO_CONVITE);

  await repositorio.insereConvite(amb.db, {
    id,
    obraId,
    tokenHash: hashDeToken(token),
    perfil,
    criadoPor: ator.usuarioId,
    criadoEm: agora.toISOString(),
    expiraEm,
  });

  // O id do convite vai para o log; o token, nunca (CT-085).
  registra('info', geraId<'correlacao'>(), 'acesso.convite_gerado', {
    obraId,
    usuarioId: ator.usuarioId,
    perfil,
  });

  return ok({ conviteId: id, token, expiraEm, perfil });
}

/**
 * Aceita o convite e cria o acesso, no perfil que o **convite** diz (34.1).
 *
 * Tudo numa transação: conferir que não foi usado, marcar como usado, gravar o
 * acesso e — quando o convite é de engenheiro — ligar `usuario.e_engenheiro`.
 * Se o `UPDATE` do uso único não afetar linha, nada é gravado — é o que faz o
 * CT-077 valer mesmo com dois aceites ao mesmo tempo.
 *
 * A coluna da conta entra **na mesma transação** de propósito: acesso de
 * engenheiro gravado sem ela produz alguém que é engenheiro da obra e continua
 * sem poder criar outra (25.1) — exatamente o travamento que a 34.1 desfaz.
 *
 * O erro é o mesmo para token desconhecido, expirado e já usado? **Não**:
 * expirado e usado têm mensagem própria, porque o PRD exige que a mensagem diga
 * que o convite expirou (CT-079) e porque quem tem o link já o tem — a mensagem
 * não revela nada que o portador não saiba. Token desconhecido cai na frase
 * genérica.
 */
export async function aceitaConvite(
  token: string,
  usuarioId: UsuarioId,
  amb: Ambiente,
): Promise<Result<ObraId, ErroDeDominio>> {
  const correlacao = geraId<'correlacao'>();
  const recusaGenerica = erroDeDominio(
    CODIGO_ERRO.SEM_PERMISSAO,
    'Este convite não é válido. Peça um link novo ao engenheiro responsável.',
  );

  if (token.trim() === '') return erro(recusaGenerica);

  const linha = await repositorio.buscaConvitePorHash(amb.db, hashDeToken(token));
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

  if (!(await repositorio.existeUsuario(amb.db, usuarioId))) {
    return erro(recusaGenerica);
  }

  // Já tem acesso ativo a esta obra: aceitar de novo não cria acesso
  // duplicado, e o UNIQUE parcial do banco recusaria de qualquer forma. Vale
  // para os dois perfis — trocar de perfil é revogar e liberar de novo, não
  // empilhar um acesso em cima do outro.
  if ((await repositorio.buscaAcessoAtivo(amb.db, usuarioId, linha.obraId)) !== null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, 'Esta conta já tem acesso a esta obra.'),
    );
  }

  const aceito = await amb.db.transaction(async (tx) => {
    const afetadas = await repositorio.marcaConviteUsado(tx, linha.id, usuarioId, agora);
    // Zero linhas afetadas quer dizer que outro aceite chegou antes. Nada foi
    // escrito nesta transação, então não há o que desfazer: basta não gravar o
    // acesso. É o que faz o uso único valer sem depender do SELECT anterior.
    if (afetadas !== 1) return false;
    await repositorio.insereAcesso(tx, {
      id: geraId<'acesso'>(),
      obraId: linha.obraId,
      usuarioId,
      perfil: linha.perfil,
      // Quem liberou responde pelo acesso: é o autor do convite, não o convidado.
      liberadoPor: linha.criadoPor,
      liberadoEm: agora,
    });
    // **Um dos dois únicos caminhos que ligam `usuario.e_engenheiro`**; o outro
    // é `npm run criar-engenheiro` (`instalacao.ts`). Convite de encarregado
    // não passa por aqui, e a conta dele continua sem o atributo.
    if (linha.perfil === 'engenheiro') {
      await repositorio.marcaContaComoEngenheiro(tx, usuarioId);
    }
    return true;
  });

  if (!aceito) return erro(recusaGenerica);

  registra('info', correlacao, 'acesso.convite_aceito', {
    obraId: linha.obraId,
    usuarioId,
    perfil: linha.perfil,
  });
  return ok(linha.obraId);
}

/** Aceita o convite **e** abre a sessão do convidado, num passo só. */
export async function aceitaConviteEEntra(
  token: string,
  usuarioId: UsuarioId,
  amb: Ambiente,
): Promise<Result<{ obraId: ObraId; sessao: SessaoAberta }, ErroDeDominio>> {
  const aceite = await aceitaConvite(token, usuarioId, amb);
  if (!aceite.ok) return aceite;
  return ok({ obraId: aceite.valor, sessao: await abreSessao(usuarioId, amb) });
}

/**
 * Revoga o acesso de alguém na obra. Só o engenheiro daquela obra (CT-083).
 *
 * A linha **não é apagada** (2.4): os lançamentos já feitos continuam
 * existindo, com a autoria preservada (CT-082). Revogar acesso não é apagar
 * histórico; o RDO entregue ao fiscal não muda porque alguém saiu da obra.
 */
export async function revogaAcesso(
  acessoId: AcessoId,
  ator: Ator,
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  const alvo = await repositorio.buscaAcessoPorId(amb.db, acessoId);
  const recusa = erroDeDominio(
    CODIGO_ERRO.SEM_PERMISSAO,
    'Você não tem acesso a esta obra ou a esta ação.',
  );
  if (alvo === null) return erro(recusa);

  const naObra = await exigeAcessoNaObra(ator, alvo.obraId, 'engenheiro', amb);
  if (!naObra.ok) return erro(recusa);

  if (
    alvo.perfil === 'engenheiro' &&
    (await repositorio.contaEngenheirosAtivos(amb.db, alvo.obraId)) <= 1
  ) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.SEM_PERMISSAO,
        'Esta obra ficaria sem engenheiro responsável. Libere outro antes de revogar este.',
      ),
    );
  }

  await repositorio.marcaAcessoRevogado(
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
export async function listaAcessosDaObra(
  obraId: ObraId,
  ator: Ator,
  amb: Ambiente,
): Promise<Result<repositorio.LinhaDeAcessoDaObra[], ErroDeDominio>> {
  const naObra = await exigeAcessoNaObra(ator, obraId, 'engenheiro', amb);
  if (!naObra.ok) {
    return erro(erroDeDominio(CODIGO_ERRO.SEM_PERMISSAO, naObra.erro.mensagem));
  }
  return ok(await repositorio.listaAcessosDaObra(amb.db, obraId));
}

/** As obras que o usuário pode ver. Nada além delas (CT-074). */
export async function listaObrasDoUsuario(
  usuarioId: UsuarioId,
  amb: Ambiente,
): Promise<Result<ObraResumo[], ErroDeDominio>> {
  return ok(await repositorio.listaObrasComAcesso(amb.db, usuarioId));
}
