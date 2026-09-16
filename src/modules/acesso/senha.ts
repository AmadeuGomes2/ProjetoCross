/**
 * Senha do engenheiro.
 *
 * `scrypt` de `node:crypto`, sem biblioteca de hash: é o algoritmo de
 * derivação que já vem no runtime, com custo de memória configurável, e
 * instalar dependência nova exige perguntar (CLAUDE.md).
 *
 * Três garantias que o revisor vai procurar:
 *
 * 1. **Sal por usuário**, 16 bytes aleatórios. Sem sal, duas pessoas com a
 *    mesma senha têm o mesmo hash e uma tabela pronta quebra as duas.
 * 2. **Comparação em tempo constante**, `timingSafeEqual`. Comparar com `===`
 *    vaza o número de bytes certos pelo tempo de resposta.
 * 3. **Os parâmetros viajam junto com o hash.** Aumentar o custo depois não
 *    invalida as senhas já gravadas: cada linha sabe como foi derivada.
 *
 * A senha em claro não é gravada, não é registrada e não sai em mensagem de
 * erro. Nada neste arquivo chama `registra()`.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** Custo de CPU/memória. 128 · N · r · p = 16 MiB por verificação. */
const N = 16384;
const R = 8;
const P = 1;
const BYTES_DE_CHAVE = 64;
const BYTES_DE_SAL = 16;
const MAX_MEM = 64 * 1024 * 1024;

const PREFIXO = 'scrypt';

function derivaChave(senha: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolve, rejeita) => {
    scrypt(
      senha.normalize('NFKC'),
      sal,
      BYTES_DE_CHAVE,
      { N, r: R, p: P, maxmem: MAX_MEM },
      (erroDeScrypt, chave) => {
        if (erroDeScrypt !== null) {
          // Falha de scrypt é inesperada (parâmetro impossível, memória).
          // Não é erro de domínio: sobe até a borda, que registra e devolve
          // mensagem genérica. Engolir aqui deixaria a senha "sempre errada".
          rejeita(erroDeScrypt);
          return;
        }
        resolve(chave);
      },
    );
  });
}

/** Formato: `scrypt$N$r$p$sal$chave`, tudo em base64url. */
export async function geraHashDeSenha(senha: string): Promise<string> {
  const sal = randomBytes(BYTES_DE_SAL);
  const chave = await derivaChave(senha, sal);
  return [PREFIXO, N, R, P, sal.toString('base64url'), chave.toString('base64url')].join(
    '$',
  );
}

interface HashDecomposto {
  readonly n: number;
  readonly r: number;
  readonly p: number;
  readonly sal: Buffer;
  readonly chave: Buffer;
}

function decompoe(armazenado: string): HashDecomposto | null {
  const partes = armazenado.split('$');
  if (partes.length !== 6) return null;
  const [prefixo, n, r, p, sal, chave] = partes;
  if (prefixo !== PREFIXO) return null;
  if (n === undefined || r === undefined || p === undefined) return null;
  if (sal === undefined || chave === undefined) return null;

  const numeros = [Number(n), Number(r), Number(p)];
  if (numeros.some((v) => !Number.isInteger(v) || v <= 0)) return null;

  return {
    n: Number(n),
    r: Number(r),
    p: Number(p),
    sal: Buffer.from(sal, 'base64url'),
    chave: Buffer.from(chave, 'base64url'),
  };
}

/**
 * Confere a senha contra o hash gravado.
 *
 * Devolve `false` para hash malformado em vez de lançar: um registro corrompido
 * no banco não pode virar erro 500 numa tela de entrada, e muito menos revelar
 * que aquele usuário existe.
 */
export async function verificaSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = decompoe(armazenado);
  if (partes === null) return false;

  const calculada = await new Promise<Buffer | null>((resolve) => {
    scrypt(
      senha.normalize('NFKC'),
      partes.sal,
      partes.chave.length,
      { N: partes.n, r: partes.r, p: partes.p, maxmem: MAX_MEM },
      (erroDeScrypt, chave) => {
        // Parâmetro gravado fora da faixa aceita pelo runtime: trata como
        // senha errada, e não como exceção que derruba a autenticação.
        resolve(erroDeScrypt === null ? chave : null);
      },
    );
  });

  if (calculada === null) return false;
  if (calculada.length !== partes.chave.length) return false;
  return timingSafeEqual(calculada, partes.chave);
}

/**
 * Hash de descarte, usado quando o e-mail não existe.
 *
 * Sem isto, responder "e-mail desconhecido" custa microssegundos e responder
 * "senha errada" custa 100 ms, e o tempo de resposta vira uma lista de quem
 * tem conta. Gerado uma vez por processo, com senha aleatória que ninguém sabe.
 */
let hashDeDescarte: Promise<string> | null = null;

export async function gastaTempoDeVerificacao(senha: string): Promise<void> {
  hashDeDescarte ??= geraHashDeSenha(randomBytes(32).toString('base64url'));
  await verificaSenha(senha, await hashDeDescarte);
}
