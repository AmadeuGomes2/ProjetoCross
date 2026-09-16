/**
 * Autenticação: quem é o portador desta requisição.
 *
 * Responde a pergunta P1 de docs/arquitetura/v1.md ("como o engenheiro
 * autentica?") da forma combinada: **e-mail e senha**, derivada com `scrypt`
 * de `node:crypto`, sem biblioteca nova. O encarregado entra por convite
 * (14.0); a sessão dele é aberta no aceite, pelo mesmo mecanismo daqui.
 *
 * A sessão é um id opaco na tabela `sessao` (2.6). O cookie não carrega
 * perfil, nem obra, nem nome: **o perfil é lido do banco a cada requisição**
 * (5.2), senão revogar acesso só valeria no próximo login.
 */

import { CODIGO_ERRO, erro, erroDeAcesso, ok, type Result } from '../../shared/result';
import type { ErroDeAcesso, ErroDeDominio } from '../../shared/result';
import { erroDeDominio } from '../../shared/result';
import { instanteAgora, type Instante } from '../../shared/date/fuso';
import { geraId, type SessaoId, type UsuarioId } from '../../shared/id';
import { registra } from '../../shared/log';
import * as repositorio from './repositorio';
import { gastaTempoDeVerificacao, geraHashDeSenha, verificaSenha } from './senha';
import {
  atributosDoCookie,
  geraToken,
  hashDeToken,
  type AtributosDoCookie,
} from './token';
import type { Ambiente, Ator } from './tipos';

/**
 * Duração da sessão.
 *
 * **Não há decisão registrada sobre este número** — o PRD fixa os 7 dias do
 * convite (14.0) e nada diz sobre a sessão. Doze horas cobrem uma jornada
 * inteira sem obrigar a entrar de novo no meio do dia no canteiro, que é o
 * cenário do CLAUDE.md, seção Mobile. Está isolado nesta constante de
 * propósito: mudar o valor é mudar uma linha. Ver relatório de entrega.
 */
export const HORAS_DE_SESSAO = 12;

const MS_POR_HORA = 60 * 60 * 1000;

/** Soma de **instante**, não de dia de obra. Dia puro nunca passa por aqui. */
function somaHoras(agora: Date, horas: number): Instante {
  return new Date(agora.getTime() + horas * MS_POR_HORA).toISOString();
}

export interface SessaoAberta {
  readonly ator: Ator;
  /** Valor em claro do cookie. Existe uma vez, aqui, e nunca é gravado. */
  readonly token: string;
  readonly atributos: AtributosDoCookie;
}

export interface ComandoRegistrarUsuario {
  readonly nome: string;
  readonly email: string;
  /** Opcional: o encarregado pode entrar por convite antes de ter senha. */
  readonly senha?: string;
}

/**
 * Cria a conta.
 *
 * O e-mail é dado pessoal: não vai para log nem para mensagem de erro. Quando
 * já existe conta com aquele e-mail, a mensagem é genérica de propósito — a
 * tela de cadastro não é lugar de confirmar quem tem conta no sistema.
 */
export async function registraUsuario(
  cmd: ComandoRegistrarUsuario,
  amb: Ambiente,
): Promise<Result<UsuarioId, ErroDeDominio>> {
  const nome = cmd.nome.trim();
  const email = repositorio.normalizaEmail(cmd.email);
  if (nome === '' || email === '') {
    return erro(
      erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome e o e-mail da conta.'),
    );
  }

  if (repositorio.buscaUsuarioPorEmail(amb.db, email) !== null) {
    return erro(
      erroDeDominio(
        // Mensagem propositalmente vaga: dizer "este e-mail já tem conta"
        // transforma o cadastro em oráculo de quem trabalha na obra.
        CODIGO_ERRO.JA_EXISTE,
        'Não foi possível criar a conta com esse e-mail. Use outro ou recupere o acesso.',
      ),
    );
  }

  const hashDeSenha = cmd.senha === undefined ? null : await geraHashDeSenha(cmd.senha);

  const id = geraId<'usuario'>();
  repositorio.insereUsuario(amb.db, {
    id,
    nome,
    email,
    hashDeSenha,
    criadoEm: instanteAgora(amb.relogio),
  });
  registra('info', geraId<'correlacao'>(), 'acesso.usuario_criado', { usuarioId: id });
  return ok(id);
}

/** Erro único para e-mail desconhecido e senha errada. Não diz qual dos dois. */
function credencialInvalida(): ErroDeAcesso {
  return erroDeAcesso(
    CODIGO_ERRO.SEM_PERMISSAO,
    'E-mail ou senha incorretos. Confira e tente de novo.',
  );
}

/**
 * Entra com e-mail e senha e abre a sessão.
 *
 * O caminho do e-mail desconhecido também paga o custo do `scrypt`
 * (`gastaTempoDeVerificacao`): sem isso, o tempo de resposta diz quem tem conta.
 */
export async function iniciaSessaoComSenha(
  email: string,
  senha: string,
  amb: Ambiente,
): Promise<Result<SessaoAberta, ErroDeAcesso>> {
  const linha = repositorio.buscaUsuarioPorEmail(amb.db, email);

  if (linha === null || linha.hashDeSenha === null) {
    await gastaTempoDeVerificacao(senha);
    return erro(credencialInvalida());
  }

  if (!(await verificaSenha(senha, linha.hashDeSenha))) {
    registra('aviso', geraId<'correlacao'>(), 'acesso.senha_incorreta', {
      usuarioId: linha.id,
      codigo: CODIGO_ERRO.SEM_PERMISSAO,
    });
    return erro(credencialInvalida());
  }

  return ok(abreSessao(linha.id, amb));
}

/** Abre a sessão sem senha. Usado pelo aceite de convite, que já provou posse. */
export function abreSessao(usuarioId: UsuarioId, amb: Ambiente): SessaoAberta {
  const agora = amb.relogio();
  const token = geraToken();
  const expiraEm = somaHoras(agora, HORAS_DE_SESSAO);
  const id = geraId<'sessao'>();

  repositorio.insereSessao(amb.db, {
    id,
    usuarioId,
    tokenHash: hashDeToken(token),
    criadoEm: agora.toISOString(),
    expiraEm,
  });

  return {
    ator: { usuarioId, sessaoId: id },
    token,
    atributos: atributosDoCookie(new Date(expiraEm)),
  };
}

/**
 * Quem está nesta requisição.
 *
 * Sessão ausente, desconhecida, revogada ou vencida devolvem o **mesmo** erro:
 * a resposta não ajuda quem está tentando adivinhar cookie.
 */
export function autenticaRequisicao(
  valorDoCookie: string | undefined,
  amb: Ambiente,
): Result<Ator, ErroDeAcesso> {
  const recusa = erro(
    erroDeAcesso(CODIGO_ERRO.SEM_PERMISSAO, 'Sua sessão terminou. Entre de novo.'),
  );

  if (valorDoCookie === undefined || valorDoCookie === '') return recusa;

  const linha = repositorio.buscaSessaoPorHash(amb.db, hashDeToken(valorDoCookie));
  if (linha === null) return recusa;
  if (linha.revogadaEm !== null) return recusa;
  if (linha.expiraEm <= instanteAgora(amb.relogio)) return recusa;

  return ok({ usuarioId: linha.usuarioId, sessaoId: linha.id });
}

/** Sair invalida a sessão no servidor, não só no navegador. */
export function encerraSessao(valorDoCookie: string | undefined, amb: Ambiente): void {
  if (valorDoCookie === undefined || valorDoCookie === '') return;
  repositorio.revogaSessaoPorHash(
    amb.db,
    hashDeToken(valorDoCookie),
    instanteAgora(amb.relogio),
  );
}

export type { SessaoId };
