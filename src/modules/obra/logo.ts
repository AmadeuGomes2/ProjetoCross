/**
 * A logo da contratada, que sai no cabeçalho do RDO.
 *
 * ## O tipo declarado não é prova
 *
 * `Content-Type` e extensão do arquivo são campos que **quem envia escolhe**.
 * Confiar neles é o defeito clássico de upload: um arquivo chamado `logo.png`,
 * enviado como `image/png`, pode ser um HTML com script — e servir isso de
 * volta com o tipo declarado é XSS armazenado, na própria origem da aplicação.
 *
 * A prova são os primeiros bytes, que o formato define. Quem quiser passar por
 * PNG tem que produzir um PNG.
 *
 * ## Dois formatos, e o que ficou de fora
 *
 * **PNG e JPEG.** A lista é a interseção de duas restrições, e não uma escolha:
 *
 * - **SVG não entra por segurança.** É XML, aceita `<script>` e
 *   `<foreignObject>`, e um navegador que o abre numa aba executa o que estiver
 *   lá — na própria origem da aplicação;
 * - **WebP não entra porque o PDF não o desenha.** `@react-pdf/image` conhece
 *   `jpg`, `jpeg`, `png` e `svg`, e nada mais. O renderizador **engole** o erro
 *   e segue, então o efeito medido foi pior que um estouro: o PDF saía sem
 *   imagem nenhuma, em silêncio, enquanto a tela mostrava a logo. Aceitar um
 *   formato que o documento não desenha é prometer o que não se cumpre.
 *
 * O `CHECK` `ck_obra_logo` no banco repete a lista. Duas camadas, como manda a
 * 5.2: a borda recusa com mensagem, o banco recusa por garantia.
 *
 * ## Onde os bytes moram
 *
 * Na própria linha da obra, em `BYTEA` (decisão de 17/09/2026). Assim a logo
 * acompanha o backup e não exige serviço de arquivo — e serverless não tem
 * disco onde guardá-la de outro jeito.
 */

import { eq } from 'drizzle-orm';

import type { BancoRdo } from '../../db';
import { obra } from '../../db/schema';
import { geraId, type ObraId, type UsuarioId } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';

/**
 * Meio megabyte.
 *
 * A logo vai no cabeçalho de um PDF, onde ocupa alguns centímetros. O limite
 * não é sobre qualidade de imagem: é sobre o que atravessa a rede, mora na
 * linha da obra e é lido junto dela em toda montagem de RDO.
 */
export const LIMITE_DA_LOGO_EM_BYTES = 512 * 1024;

/** O mesmo limite em KB, para quem escreve mensagem. Contava-se à mão em três
 * lugares, e três cópias de uma divisão são três chances de divergir. */
export const LIMITE_DA_LOGO_EM_KB = Math.floor(LIMITE_DA_LOGO_EM_BYTES / 1024);

export type TipoDeImagem = 'image/png' | 'image/jpeg';

/**
 * Os formatos aceitos, com a mesma lista do `CHECK` do banco.
 *
 * É a única lista. A tela monta o `accept` a partir dela, em vez de reescrever
 * os tipos à mão — recopiar lista de domínio já custou quatro ocorrências neste
 * projeto.
 */
export const TIPOS_DE_IMAGEM: readonly TipoDeImagem[] = ['image/png', 'image/jpeg'];

const ASSINATURA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ASSINATURA_JPEG = Buffer.from([0xff, 0xd8, 0xff]);

const RECUSA_DE_FORMATO =
  'Este arquivo não é uma imagem PNG ou JPEG. Envie a logo em um desses formatos.';

/**
 * Qual imagem é esta, pelos bytes.
 *
 * Pura, e testável sem banco e sem rede.
 *
 * O teto de tamanho é conferido aqui **de novo**, e não "antes de ler o corpo":
 * quando esta função roda, quem chamou já tem o `Buffer` inteiro na memória. A
 * guarda que de fato evita o trabalho está antes, na ação de servidor
 * (`acoes.ts`), e acima dela no `bodySizeLimit` do Next. Esta é a última das
 * três, e existe para que nenhum chamador futuro dependa das outras duas.
 */
export function identificaImagem(bytes: Buffer): Result<TipoDeImagem, ErroDeDominio> {
  if (bytes.length > LIMITE_DA_LOGO_EM_BYTES) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.TEXTO_LONGO_DEMAIS,
        `A imagem passa do tamanho aceito, de ${LIMITE_DA_LOGO_EM_KB} KB. ` +
          'Reduza e envie de novo.',
      ),
    );
  }

  /*
   * Cada assinatura tem o seu comprimento, e a checagem respeita isso.
   *
   * A primeira versão exigia 12 bytes para qualquer arquivo, porque 12 é o que
   * o WebP precisa. O teste do JPEG apanhou: JPEG se identifica em **três**
   * bytes, e um arquivo curto e válido era recusado por um limite que não era
   * dele. Um piso único é confortável de escrever e errado de usar.
   */
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(ASSINATURA_PNG)) {
    return ok('image/png');
  }
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(ASSINATURA_JPEG)) {
    return ok('image/jpeg');
  }

  return erro(erroDeDominio(CODIGO_ERRO.VALOR_FORA_DA_LISTA, RECUSA_DE_FORMATO));
}

/**
 * Tira de uma imagem o que não desenha nada.
 *
 * **Metadado de imagem é dado pessoal até prova em contrário.** Uma logo sai do
 * computador de alguém: JPEG carrega EXIF e XMP nos segmentos `APPn` — autor,
 * software, e em foto de celular a coordenada de GPS —, e o PDF embute o JPEG
 * inteiro, com os `APPn` dentro. O metadado atravessa até o documento que vai
 * ao fiscal, e a regra do projeto não admite isso (CLAUDE.md, Segurança:
 * "nem em metadado de PDF ou de Excel gerado").
 *
 * Roda **na entrada**, uma vez. O que está gravado já está limpo, e nenhum
 * caminho de saída precisa lembrar de limpar — que é o tipo de coisa que um
 * caminho novo esquece.
 *
 * Diante de estrutura que não entende, devolve os bytes como vieram. Isto não é
 * validação: o que chega aqui já passou por `identificaImagem`. Cortar no
 * escuro produziria um arquivo quebrado, que é pior que um metadado.
 */
export function limpaMetadados(bytes: Buffer, tipo: TipoDeImagem): Buffer {
  return tipo === 'image/jpeg' ? semSegmentosDeMetadado(bytes) : semPedacosDeTexto(bytes);
}

/**
 * JPEG: percorre os segmentos e derruba `APP1` a `APP15` e o comentário.
 *
 * `APP0` fica: é o JFIF, que descreve densidade e proporção, e não vem de
 * pessoa nenhuma. A varredura para em `SOS` (`FF DA`), porque dali em diante
 * são dados comprimidos, onde `FF xx` não é marcador.
 */
function semSegmentosDeMetadado(bytes: Buffer): Buffer {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes;

  const pedacos: Buffer[] = [bytes.subarray(0, 2)];
  let i = 2;

  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return bytes; // estrutura inesperada: não mexe
    const marcador = bytes[i + 1] ?? 0;

    // `SOS`: daqui até o fim é dado comprimido, e vai inteiro.
    if (marcador === 0xda) {
      pedacos.push(bytes.subarray(i));
      return Buffer.concat(pedacos);
    }

    const tamanho = bytes.readUInt16BE(i + 2);
    // O tamanho inclui os próprios dois bytes; menor que isso é lixo.
    if (tamanho < 2 || i + 2 + tamanho > bytes.length) return bytes;

    // `APP1`..`APP15` (0xE1-0xEF) e `COM` (0xFE) saem; o resto fica.
    const ehMetadado = (marcador >= 0xe1 && marcador <= 0xef) || marcador === 0xfe;
    if (!ehMetadado) pedacos.push(bytes.subarray(i, i + 2 + tamanho));

    i += 2 + tamanho;
  }

  return bytes;
}

/** Os pedaços de PNG que carregam texto ou data, e que nada desenham. */
const PEDACOS_DE_METADADO = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/**
 * PNG: percorre os pedaços e derruba os de texto, EXIF e data.
 *
 * `gAMA`, `sRGB`, `pHYs` e afins ficam: eles mudam como a imagem é desenhada, e
 * tirar um deles trocaria a cor da marca de alguém.
 */
function semPedacosDeTexto(bytes: Buffer): Buffer {
  if (bytes.length < 8) return bytes;

  const pedacos: Buffer[] = [bytes.subarray(0, 8)];
  let i = 8;

  while (i + 12 <= bytes.length) {
    const tamanho = bytes.readUInt32BE(i);
    const fim = i + 12 + tamanho; // 4 tamanho + 4 tipo + dados + 4 CRC
    if (fim > bytes.length) return bytes;

    const tipo = bytes.subarray(i + 4, i + 8).toString('ascii');
    if (!PEDACOS_DE_METADADO.has(tipo)) pedacos.push(bytes.subarray(i, fim));

    i = fim;
    if (tipo === 'IEND') break;
  }

  return Buffer.concat(pedacos);
}

export interface LogoDaObra {
  readonly bytes: Buffer;
  readonly tipo: TipoDeImagem;
}

export interface ComandoDefinirLogo {
  readonly obraId: ObraId;
  readonly bytes: Buffer;
}

/**
 * Grava a logo da obra. Quem chama já passou por `exigeAcessoNaObra`.
 *
 * Substitui a anterior sem guardar histórico: logo não é lançamento, e trocar a
 * marca da empresa não muda nenhum número de RDO. A regra de "exclusão nunca
 * apaga linha" vale para lançamento, que é o que o fiscal recebeu.
 */
export async function defineLogoDaObra(
  cmd: ComandoDefinirLogo,
  db: BancoRdo,
  por: UsuarioId,
): Promise<Result<TipoDeImagem, ErroDeDominio>> {
  const tipo = identificaImagem(cmd.bytes);
  if (!tipo.ok) return tipo;

  // Limpa na entrada: o que fica gravado já está sem metadado, e nenhum caminho
  // de saída precisa lembrar disso.
  const limpos = limpaMetadados(cmd.bytes, tipo.valor);

  const alterou = await db
    .update(obra)
    .set({ logo: limpos, logoTipo: tipo.valor })
    .where(eq(obra.id, cmd.obraId))
    .returning({ id: obra.id });

  if (alterou.length === 0) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  // Quem trocou fica no log, não na linha: a tabela `obra` não guarda autoria de
  // alteração, e é por evento que este módulo registra as outras mudanças de
  // cadastro. Id, nunca nome nem e-mail (CLAUDE.md, Segurança).
  registra('info', geraId<'correlacao'>(), 'obra.logo_definida', {
    obraId: cmd.obraId,
    usuarioId: por,
    // `quantidade` é o tamanho em bytes. O `ContextoDeLog` não tem campo de
    // texto livre de propósito, então o formato não entra aqui — e ele já está
    // na coluna `logo_tipo`, para quem precisar.
    quantidade: limpos.length,
  });
  return ok(tipo.valor);
}

/**
 * Tira a logo da obra.
 *
 * As duas colunas vão a nulo juntas, que é o que o `CHECK` exige: meia logo —
 * bytes sem tipo, ou tipo sem bytes — não existe.
 */
export async function removeLogoDaObra(
  obraId: ObraId,
  db: BancoRdo,
  por: UsuarioId,
): Promise<Result<void, ErroDeDominio>> {
  const alterou = await db
    .update(obra)
    .set({ logo: null, logoTipo: null })
    .where(eq(obra.id, obraId))
    .returning({ id: obra.id });

  if (alterou.length === 0) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Obra não encontrada.'));
  }

  registra('info', geraId<'correlacao'>(), 'obra.logo_removida', {
    obraId,
    usuarioId: por,
  });
  return ok(undefined);
}

/** A logo, ou `null` se a obra não tem uma. */
export async function obtemLogoDaObra(
  obraId: ObraId,
  db: BancoRdo,
): Promise<LogoDaObra | null> {
  const linhas = await db
    .select({ logo: obra.logo, logoTipo: obra.logoTipo })
    .from(obra)
    .where(eq(obra.id, obraId))
    .limit(1);

  const linha = linhas[0];
  if (linha?.logo == null || linha.logoTipo === null) return null;

  /*
   * O tipo é lido de volta e conferido contra a lista, em vez de convertido.
   *
   * O `CHECK` do banco já garante, mas este é o ponto que decide o cabeçalho
   * `Content-Type` da resposta — e um `as` aqui faria uma linha adulterada
   * virar tipo servido ao navegador. Custa uma comparação.
   */
  const tipo = TIPOS_DE_IMAGEM.find((t) => t === linha.logoTipo);
  if (tipo === undefined) return null;

  return { bytes: linha.logo, tipo };
}
