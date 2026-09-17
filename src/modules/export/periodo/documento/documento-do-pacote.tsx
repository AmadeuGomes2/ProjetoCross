/**
 * Os três modos de DP9 num documento só.
 *
 * `consolidado` · `diarios` · `consolidado-com-diarios`. No terceiro, **o
 * consolidado vem primeiro e os diários depois**, em ordem crescente de dia: o
 * fiscal lê o resumo e depois a evidência (contrato, 4.2).
 *
 * **Os diários anexados são o documento aprovado, sem uma linha de diferença.**
 * As páginas saem de `montaDocumentoDoRdo` e entram neste documento como estão
 * — nada é redesenhado aqui. Se algum dia o diário mudar, o anexo muda junto,
 * porque é o mesmo código. A única coisa que se faz com a página é trocar a
 * chave de renderização: sem isso, dois diários no mesmo documento trariam
 * chaves repetidas, e o React não garante a ordem de irmãos com chave igual —
 * o que sairia trocado é a ordem das folhas do fiscal.
 */

import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { DocumentProps } from '@react-pdf/renderer';

import { montaDocumentoDoRdo } from '../../documento/documento-rdo';
import type { RdoParaDocumento } from '../../portas';
import type { PacoteParaDocumento } from '../portas';
import { paginaDoConsolidado, tituloDoConsolidado } from './documento-de-periodo';
import { envolveEmDocumento } from './envelope';

function paginasDoDiario(diario: RdoParaDocumento): ReactElement[] {
  // `DocumentProps` não declara `children`, e ler as páginas exige dizer ao
  // compilador que o documento tem filhos. A declaração é uma **atribuição
  // verificada**, e não um `as`: se o `@react-pdf` mudar a forma dos filhos,
  // isto para de compilar aqui, que é onde a divergência deve doer.
  const documento: ReactElement<{
    readonly title?: string | undefined;
    readonly children?: ReactNode;
  }> = montaDocumentoDoRdo(diario);
  return Children.toArray(documento.props.children)
    .filter((pagina): pagina is ReactElement => isValidElement(pagina))
    .map((pagina, indice) =>
      cloneElement(pagina, { key: `diario-${diario.identificacao.dia}-${indice}` }),
    );
}

function tituloDosDiarios(diarios: readonly RdoParaDocumento[]): string {
  const primeiro = diarios[0]?.identificacao.data ?? '';
  const ultimo = diarios[diarios.length - 1]?.identificacao.data ?? '';
  return primeiro === ultimo ? `RDO ${primeiro}` : `RDO ${primeiro} a ${ultimo}`;
}

function contratoDe(pacote: PacoteParaDocumento): string {
  if (pacote.modo === 'diarios') {
    return pacote.diarios[0]?.informacoesGerais.contrato ?? '';
  }
  return pacote.consolidado.informacoesGerais.contrato;
}

export function montaDocumentoDoPacote(
  pacote: PacoteParaDocumento,
): ReactElement<DocumentProps> {
  const contrato = contratoDe(pacote);

  if (pacote.modo === 'consolidado') {
    return envolveEmDocumento(tituloDoConsolidado(pacote.consolidado), contrato, [
      paginaDoConsolidado(pacote.consolidado),
    ]);
  }

  if (pacote.modo === 'diarios') {
    return envolveEmDocumento(
      tituloDosDiarios(pacote.diarios),
      contrato,
      pacote.diarios.flatMap(paginasDoDiario),
    );
  }

  return envolveEmDocumento(tituloDoConsolidado(pacote.consolidado), contrato, [
    paginaDoConsolidado(pacote.consolidado),
    ...pacote.diarios.flatMap(paginasDoDiario),
  ]);
}
