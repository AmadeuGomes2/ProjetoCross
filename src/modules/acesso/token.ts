/**
 * Token opaco de sessão e de convite.
 *
 * docs/arquitetura/v1.md, decisão 17 da seção 7: **o token em claro nunca é
 * gravado**. O banco guarda o SHA-256; vazamento de banco não vira vazamento
 * de acesso, e reexibir o link não é requisito — gerar outro é.
 *
 * O valor é opaco: 32 bytes aleatórios. Não codifica id de usuário, de obra
 * nem nada que possa ser lido de fora (CLAUDE.md, Segurança: nada de nome em
 * URL). O link do convite circula por WhatsApp; ele não pode contar nada sobre
 * quem convidou.
 *
 * SHA-256 sem sal é de propósito aqui, e não contradiz `senha.ts`: o token tem
 * 256 bits de entropia sorteada, então não existe dicionário para atacar. Sal e
 * custo de memória protegem segredo escolhido por pessoa, não segredo sorteado.
 */

import { createHash, randomBytes } from 'node:crypto';

const BYTES_DE_TOKEN = 32;

export function geraToken(): string {
  return randomBytes(BYTES_DE_TOKEN).toString('base64url');
}

export function hashDeToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Nome do cookie. Não diz nada sobre quem está dentro. */
export const NOME_DO_COOKIE_DE_SESSAO = 'rdo_sessao';

export interface AtributosDoCookie {
  readonly httpOnly: true;
  readonly secure: true;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly expires: Date;
}

/**
 * `HttpOnly` para que script na página não leia; `Secure` para que não viaje em
 * claro; `SameSite=Lax` para que requisição vinda de outro site não carregue a
 * sessão junto. `expires` é o mesmo instante gravado em `sessao.expira_em`: o
 * navegador esquece, e o servidor também — a expiração de verdade é a do banco.
 */
export function atributosDoCookie(expiraEm: Date): AtributosDoCookie {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: expiraEm,
  };
}

/** Lê um cookie do cabeçalho da requisição, sem depender do runtime do Next. */
export function leCookie(requisicao: Request, nome: string): string | undefined {
  const cabecalho = requisicao.headers.get('cookie');
  if (cabecalho === null) return undefined;
  for (const par of cabecalho.split(';')) {
    const separador = par.indexOf('=');
    if (separador < 0) continue;
    if (par.slice(0, separador).trim() !== nome) continue;
    return decodeURIComponent(par.slice(separador + 1).trim());
  }
  return undefined;
}
