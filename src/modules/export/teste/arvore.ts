/**
 * Leitura da árvore do documento, para os testes de fidelidade.
 *
 * Conferir o PDF pelos bytes exigiria um interpretador de PDF; o que os casos
 * de `docs/qa/v1-casos-passo-6.md` perguntam — quais blocos, em que ordem, com
 * que rótulo e que valor — é respondido pela árvore de elementos que vai para o
 * renderizador. É a mesma árvore que vira papel.
 *
 * Por isso os blocos do documento são **funções chamadas diretamente**, e não
 * componentes React: assim a árvore contém só elementos do `@react-pdf`, e o
 * texto lido aqui é exatamente o texto impresso. Um bloco escrito como
 * `<Bloco />` ficaria invisível para esta leitura.
 */

import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { Page } from '@react-pdf/renderer';

function filhosDe(no: ReactElement): ReactNode {
  const props: unknown = no.props;
  if (typeof props !== 'object' || props === null || !('children' in props)) return null;
  return (props as { children?: ReactNode }).children ?? null;
}

/** Todos os textos do documento, na ordem em que aparecem. */
export function coletaTextos(no: ReactNode): string[] {
  if (no === null || no === undefined || typeof no === 'boolean') return [];
  if (typeof no === 'string') return no === '' ? [] : [no];
  if (typeof no === 'number') return [String(no)];
  if (Array.isArray(no)) return no.flatMap((filho: ReactNode) => coletaTextos(filho));
  if (isValidElement(no)) return coletaTextos(filhosDe(no));
  return [];
}

export function textoDoDocumento(no: ReactNode): string {
  return coletaTextos(no).join('\n');
}

export function contaPaginas(no: ReactNode): number {
  if (Array.isArray(no)) {
    return no.reduce<number>((total, filho: ReactNode) => total + contaPaginas(filho), 0);
  }
  if (!isValidElement(no)) return 0;
  const propria = no.type === Page ? 1 : 0;
  return propria + contaPaginas(filhosDe(no));
}

/** Os textos de uma página, para separar o que saiu na continuação. */
export function textosDaPagina(no: ReactNode, numero: number): string[] {
  const paginas: ReactElement[] = [];
  const junta = (atual: ReactNode): void => {
    if (Array.isArray(atual)) {
      atual.forEach((filho: ReactNode) => junta(filho));
      return;
    }
    if (!isValidElement(atual)) return;
    if (atual.type === Page) paginas.push(atual);
    junta(filhosDe(atual));
  };
  junta(no);
  const pagina = paginas[numero - 1];
  return pagina === undefined ? [] : coletaTextos(filhosDe(pagina));
}

export interface MetadadosDoPdf {
  readonly title: string;
  readonly author: string;
  readonly subject: string;
  readonly keywords: string;
  readonly producer: string;
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function metadadosDoDocumento(no: ReactNode): MetadadosDoPdf {
  if (!isValidElement(no)) throw new Error('documento inválido');
  const props: unknown = no.props;
  const p =
    typeof props === 'object' && props !== null ? (props as Record<string, unknown>) : {};
  return {
    title: texto(p['title']),
    author: texto(p['author']),
    subject: texto(p['subject']),
    keywords: texto(p['keywords']),
    producer: texto(p['producer']),
  };
}
