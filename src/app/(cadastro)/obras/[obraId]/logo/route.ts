/**
 * `GET /obras/<obra>/logo` — serve a logo da contratada.
 *
 * ## Servir arquivo enviado é a parte perigosa do upload
 *
 * Quem envia escolhe os bytes. Se a resposta devolvesse o `Content-Type` que o
 * navegador declarou no envio, um arquivo com HTML dentro voltaria como HTML, na
 * **mesma origem da aplicação**, com o cookie de sessão à mão — XSS armazenado.
 *
 * Três coisas impedem isso aqui, e nenhuma delas é opcional:
 *
 * 1. o tipo vem da coluna `logo_tipo`, que só recebe valor depois de
 *    `identificaImagem` conferir os bytes, e que o `CHECK` do banco limita aos
 *    três formatos;
 * 2. `X-Content-Type-Options: nosniff` impede o navegador de adivinhar outro
 *    tipo a partir do conteúdo, que é como o ataque costuma escapar;
 * 3. `Content-Disposition: inline` sem nome de arquivo — nome de arquivo é
 *    texto que veio de fora e não precisa atravessar para o cabeçalho.
 *
 * ## Quem pode ver
 *
 * Perfil mínimo `encarregado`, e não `engenheiro`: a logo aparece na tela da
 * obra, que ele abre, e é a marca da empresa em que ele trabalha. Não é dado de
 * pessoa nem número de medição. Trocá-la, sim, é do engenheiro, e isso é o
 * `defineLogoProtegida`.
 *
 * Sem obra ou sem logo, **404**, e não uma imagem vazia: o endereço é
 * adivinhável, e responder 200 diria qual obra existe.
 */

import { createHash } from 'node:crypto';

import { comAtorNaObra } from '../../../../../modules/acesso';
import { ambienteDaComposicao } from '../../../../_composicao/ambiente';
import { paraAcesso } from '../../../../_composicao/ambiente-de-cadastro';
import { obtemLogoProtegida } from '../../../../_composicao/cadastro';
import { atorDaRota } from '../../../../_composicao/sessao';

export const dynamic = 'force-dynamic';

export const GET = comAtorNaObra(
  'encarregado',
  async (ator, requisicao) => {
    const lida = await obtemLogoProtegida(
      { usuarioId: ator.usuarioId },
      ator.obraId,
      ambienteDaComposicao().cadastro,
    );
    if (!lida.ok || lida.valor === null) {
      /*
       * `no-store` no 404, e não a ausência de cabeçalho.
       *
       * Sem isto o navegador guarda o 404 por heurística, e quem acabou de
       * subir a logo continua vendo a imagem quebrada até o cache vencer.
       * Apareceu na validação pelo navegador: a rota respondia 404 para quem
       * tinha perguntado antes de existir logo, e 200 para quem não tinha.
       */
      return new Response(null, {
        status: 404,
        headers: { 'cache-control': 'no-store' },
      });
    }

    /*
     * Etiqueta pelo conteúdo, e revalidação a cada pedido.
     *
     * `max-age` fixo era a primeira versão, e estava errado pelo outro lado:
     * depois de TROCAR a logo, o navegador mostraria a antiga até o prazo
     * vencer. Com `no-cache` ele sempre pergunta, e com a etiqueta a resposta
     * costuma ser 304 sem corpo — o custo de perguntar é um cabeçalho, não meio
     * megabyte.
     *
     * SHA-256 dos bytes: a etiqueta muda quando, e só quando, a imagem muda.
     */
    const etiqueta = `"${createHash('sha256').update(lida.valor.bytes).digest('hex').slice(0, 32)}"`;
    if (requisicao.headers.get('if-none-match') === etiqueta) {
      return new Response(null, {
        status: 304,
        headers: { etag: etiqueta, 'cache-control': 'private, no-cache' },
      });
    }

    return new Response(new Uint8Array(lida.valor.bytes), {
      status: 200,
      headers: {
        'content-type': lida.valor.tipo,
        'content-length': String(lida.valor.bytes.length),
        'x-content-type-options': 'nosniff',
        'content-disposition': 'inline',
        etag: etiqueta,
        /*
         * `private` porque a resposta depende de quem pede: um cache
         * compartilhado serviria a imagem de uma obra a quem não tem acesso a
         * ela. `no-cache` não quer dizer "não guarde" — quer dizer "guarde e
         * pergunte antes de usar", que é o que faz a troca da logo aparecer na
         * hora.
         */
        'cache-control': 'private, no-cache',
      },
    });
  },
  {
    autentica: (requisicao) => atorDaRota(requisicao),
    amb: () => paraAcesso(ambienteDaComposicao().cadastro),
  },
);
