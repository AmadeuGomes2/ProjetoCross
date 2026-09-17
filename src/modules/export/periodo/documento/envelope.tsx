/**
 * O `<Document>` do pacote, com os metadados.
 *
 * Existe separado para que o consolidado sozinho e o pacote com diários anexados
 * usem **o mesmo** envelope: dois lugares construindo metadado é um lugar a mais
 * onde um nome de pessoa pode entrar.
 *
 * `docs/arquitetura/v1.md`, 5.3, e CLAUDE.md, Segurança: nenhum metadado aceita
 * nome de pessoa. O título leva datas, o assunto leva o contrato, e as palavras
 * de busca ficam vazias. Metadado é o vazamento que ninguém vê ao abrir o
 * arquivo.
 */

import type { ReactElement } from 'react';
import { Document, type DocumentProps } from '@react-pdf/renderer';

import { AUTOR_DO_PDF, PRODUTOR_DO_PDF } from '../../documento/rotulos';

export function envolveEmDocumento(
  titulo: string,
  contrato: string,
  paginas: readonly ReactElement[],
): ReactElement<DocumentProps> {
  return (
    <Document
      title={titulo}
      author={AUTOR_DO_PDF}
      subject={contrato}
      keywords=""
      creator={AUTOR_DO_PDF}
      producer={PRODUTOR_DO_PDF}
      language="pt-BR"
    >
      {paginas}
    </Document>
  );
}
