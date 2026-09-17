/**
 * A logo da obra, no formato que o documento desenha.
 *
 * `@react-pdf/renderer` aceita `data:` URI em `<Image src>`. Converter aqui, e
 * não no módulo `export`, mantém a regra: o documento **recebe pronto e
 * desenha**, sem conhecer banco nem `Buffer`.
 *
 * ## A leitura é por exportação, e memorizada dentro dela
 *
 * A logo é `bytea` na linha da obra, e pode ter meio megabyte. Um pacote de
 * período lê a logo para o consolidado E para cada diário anexado; a memória faz
 * disso uma leitura só.
 *
 * Ela serve a duas coisas, e a segunda importa mais que a primeira:
 *
 * - **uma leitura em vez de N**, que contra o Neon é uma ida à rede em vez de N;
 * - **a MESMA imagem em todo o pacote.** O consolidado e os diários vão no mesmo
 *   arquivo; ler duas vezes abriria a porta para dois cabeçalhos diferentes se
 *   alguém trocasse a logo no meio da exportação.
 *
 * A memória vive no objeto devolvido por `criaLeitorDeLogo`, e não em módulo:
 * uma memória de módulo sobreviveria entre requisições e serviria a logo antiga
 * depois de alguém trocá-la.
 *
 * ## Este arquivo NÃO autoriza
 *
 * Como as portas em `rdo-diario.ts`, ele já roda do lado de dentro da fronteira:
 * quem o chama passou por `exigeAcessoNaObra` antes. Está escrito porque os dois
 * CRÍTICOS do laudo de 16/09 nasceram exatamente de uma leitura sem ator ficando
 * ao alcance de um caminho novo.
 *
 * Os dois chamadores de hoje autorizam: `exportacao-rdo.ts` pela rota do PDF, e
 * `exportacao-de-periodo.ts` por `portasDoRdoDePeriodoProtegidas`. Quem
 * acrescentar um terceiro tem a obrigação de autorizar antes — e a leitura da
 * logo para servir na tela não passa por aqui, passa por `obtemLogoProtegida`,
 * que autoriza.
 */

import { obtemLogoDaObra } from '../../modules/obra';
import type { AmbienteDaComposicao } from './ambiente';
import type { ObraId } from '../../shared/id';

export interface LeitorDeLogo {
  /** `data:` URI, ou `null` quando a obra não tem logo. */
  (obraId: ObraId): Promise<string | null>;
}

export function criaLeitorDeLogo(ambiente: AmbienteDaComposicao): LeitorDeLogo {
  const memoria = new Map<ObraId, string | null>();

  return async (obraId) => {
    const guardado = memoria.get(obraId);
    // `has`, e não `guardado !== undefined`: `null` é resposta válida e
    // memorizável — "esta obra não tem logo" também não precisa ser perguntado
    // trinta vezes.
    if (memoria.has(obraId)) return guardado ?? null;

    const logo = await obtemLogoDaObra(obraId, ambiente.cadastro.db);
    const uri =
      logo === null ? null : `data:${logo.tipo};base64,${logo.bytes.toString('base64')}`;
    memoria.set(obraId, uri);
    return uri;
  };
}
