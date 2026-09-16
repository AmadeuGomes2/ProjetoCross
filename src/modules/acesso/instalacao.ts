/**
 * A primeira conta de engenheiro, criada fora da web.
 *
 * Decisão 25.1, de 16/09/2026: **não há cadastro público**. A tela de entrada é
 * só entrada, e a primeira conta nasce pelo comando `npm run criar-engenheiro`,
 * que só quem tem acesso ao servidor consegue rodar. Daí em diante, quem já é
 * engenheiro de alguma obra cria as outras.
 *
 * ## A senha não vem por argumento
 *
 * `--senha` seria a forma mais cômoda e é a errada: argumento de linha de
 * comando fica no histórico do shell, aparece em `ps` para qualquer processo da
 * máquina e costuma sobrar em log de CI. Por isso esta função **não recebe a
 * senha**: recebe `pedeSenha`, que a borda liga a um prompt sem eco, e que só é
 * chamado quando a conta vai mesmo nascer. O que não é pedido não vaza.
 *
 * A alternativa oferecida — gerar senha temporária, imprimir uma vez e obrigar
 * a troca no primeiro acesso — foi descartada por dois motivos: o valor
 * impresso fica na rolagem do terminal, e "obrigar a troca" exige uma coluna
 * nova em `usuario`, ou seja, migration, que exige perguntar antes (CLAUDE.md,
 * Trabalho em paralelo). Prompt sem eco resolve hoje sem mudar o esquema.
 *
 * ## Idempotência segura
 *
 * Rodar duas vezes com o mesmo e-mail **não** cria a segunda conta e **não**
 * troca a senha da primeira. Resetar senha em silêncio seria a forma mais
 * discreta de tomar uma conta alheia: quem tem o comando teria a conta.
 */

import { geraId, type UsuarioId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { registraUsuario } from './autenticacao';
import * as repositorio from './repositorio';
import type { Ambiente } from './tipos';

/**
 * Comprimento mínimo da senha.
 *
 * Comprimento, e não regra de composição: é o que o NIST 800-63B recomenda, e
 * quatro palavras sorteadas cabem aqui sem virar `S3nh@!` colado no monitor.
 */
export const SENHA_MINIMA_DE_CARACTERES = 12;

export interface ComandoCriarEngenheiro {
  readonly nome: string;
  readonly email: string;
  /** A opção explícita `--forcar`. Sem ela, um sistema já povoado é recusado. */
  readonly mesmoComEngenheiroExistente: boolean;
  /** Chamado **só** quando a conta vai ser criada de fato. */
  readonly pedeSenha: () => Promise<string>;
}

export type SituacaoDaInstalacao = 'conta_criada' | 'conta_ja_existia';

export interface ContaDeInstalacao {
  readonly situacao: SituacaoDaInstalacao;
  readonly usuarioId: UsuarioId;
}

/**
 * Cria a conta de engenheiro da instalação.
 *
 * A ordem das verificações é parte da regra:
 *
 * 1. **e-mail já cadastrado** devolve a conta existente, sem tocar na senha;
 * 2. **sistema já povoado** recusa, antes de pedir qualquer segredo;
 * 3. só então a senha é pedida e a conta é criada.
 *
 * Nenhuma mensagem daqui carrega e-mail, nome ou senha: são dado pessoal e
 * segredo, e mensagem de erro circula em terminal compartilhado (CLAUDE.md,
 * Segurança).
 */
export async function criaContaDeEngenheiroDeInstalacao(
  cmd: ComandoCriarEngenheiro,
  amb: Ambiente,
): Promise<Result<ContaDeInstalacao, ErroDeDominio>> {
  const nome = cmd.nome.trim();
  const email = repositorio.normalizaEmail(cmd.email);
  if (nome === '' || email === '') {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.CAMPO_OBRIGATORIO,
        'Informe o nome e o e-mail da conta: --nome "..." --email "...".',
      ),
    );
  }

  const existente = repositorio.buscaUsuarioPorEmail(amb.db, email);
  if (existente !== null) {
    // Idempotente no sentido seguro: nada é criado e nada é resetado.
    registra('info', geraId<'correlacao'>(), 'acesso.instalacao_conta_ja_existia', {
      usuarioId: existente.id,
    });
    return ok({ situacao: 'conta_ja_existia', usuarioId: existente.id });
  }

  if (!cmd.mesmoComEngenheiroExistente && jaTemContaDeEngenheiro(amb)) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.JA_EXISTE,
        'Este sistema já tem conta de engenheiro. O comando de instalação existe para a primeira. ' +
          'Se é mesmo isso que você quer, repita com --forcar.',
      ),
    );
  }

  const senha = await cmd.pedeSenha();
  if (senha.length < SENHA_MINIMA_DE_CARACTERES) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.CAMPO_OBRIGATORIO,
        `A senha precisa ter pelo menos ${SENHA_MINIMA_DE_CARACTERES} caracteres.`,
      ),
    );
  }

  // O único lugar do sistema que liga `usuario.e_engenheiro`. Vai no mesmo
  // INSERT da conta, e não num UPDATE depois: conta de engenheiro criada pela
  // metade é conta que não cria obra e que o comando se recusa a recriar.
  const criado = await registraUsuario({ nome, email, senha, eEngenheiro: true }, amb);
  if (!criado.ok) return criado;

  registra('info', geraId<'correlacao'>(), 'acesso.instalacao_conta_criada', {
    usuarioId: criado.valor,
  });
  return ok({ situacao: 'conta_criada', usuarioId: criado.valor });
}

/**
 * O sistema já tem conta de engenheiro?
 *
 * Duas perguntas: existe conta com a coluna de engenheiro ligada, ou existe
 * conta com senha cadastrada. A segunda é propositalmente larga — recusar
 * demais custa uma opção a mais na linha de comando; recusar de menos custa uma
 * conta de administrador criada sem atrito.
 */
function jaTemContaDeEngenheiro(amb: Ambiente): boolean {
  return (
    repositorio.existeContaDeEngenheiro(amb.db) || repositorio.existeContaComSenha(amb.db)
  );
}
