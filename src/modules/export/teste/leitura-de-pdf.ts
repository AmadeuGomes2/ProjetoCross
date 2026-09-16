/**
 * Leitura do PDF **gerado**, para os testes de fidelidade que a árvore não
 * alcança.
 *
 * `teste/arvore.ts` lê a árvore de elementos: responde quais blocos, em que
 * ordem e com que rótulo. O que ela **não** vê é o que só existe depois da
 * paginação — se o renderizador quebrou a página sozinho, se um rótulo coube
 * numa linha ou saiu hifenizado, se a barra está atrás do número. Foi
 * exatamente nessa cegueira que o laudo `docs/fidelidade/2026-09-16-rdo-diario.md`
 * achou a página órfã: a árvore contava uma página e o papel tinha duas.
 *
 * Por isso este leitor abre os bytes: conta as páginas pelos objetos `/Page`,
 * separa o fluxo de conteúdo de cada uma e devolve os **trechos de texto**, um
 * por operador `TJ`/`Tj`, com a posição no papel. Trecho é a unidade que
 * importa: um rótulo que coube numa linha é **um** trecho; um rótulo quebrado
 * são dois.
 *
 * Limites conhecidos, e aceitos porque o documento é gerado por um só
 * renderizador: assume um operador por linha, como o `@react-pdf` emite, e
 * decodifica os códigos de glifo como `WinAnsi`, que é a codificação das fontes
 * padrão (`Helvetica` e `Helvetica-Bold`) usadas no RDO. Nenhuma fonte
 * embutida, nenhum subconjunto.
 */

import { inflateSync } from 'node:zlib';

/** Matriz afim do PDF: `[a b c d e f]`, na ordem dos operandos de `cm`. */
interface Matriz {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

const IDENTIDADE: Matriz = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function multiplica(m: Matriz, n: Matriz): Matriz {
  return {
    a: m.a * n.a + m.b * n.c,
    b: m.a * n.b + m.b * n.d,
    c: m.c * n.a + m.d * n.c,
    d: m.c * n.b + m.d * n.d,
    e: m.e * n.a + m.f * n.c + n.e,
    f: m.e * n.b + m.f * n.d + n.f,
  };
}

export interface TrechoDeTexto {
  /** O texto de um único operador de mostra. Uma linha de uma caixa de texto. */
  readonly texto: string;
  readonly x: number;
  readonly y: number;
}

export interface RetanguloPintado {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
  /** `r,g,b` em 0..1, como o operador `scn` recebe. */
  readonly cor: string;
}

export interface PaginaDoPdf {
  readonly trechos: readonly TrechoDeTexto[];
  readonly retangulos: readonly RetanguloPintado[];
}

export interface PdfLido {
  readonly paginas: readonly PaginaDoPdf[];
}

function numeros(linha: string): number[] {
  const achados = linha.match(/-?\d+(?:\.\d+)?/g);
  return achados === null ? [] : achados.map(Number);
}

/** Os operandos de `TJ` vêm em hexadecimal, com o ajuste de espaço entre eles. */
function textoDoOperador(linha: string): string {
  const pedacos = linha.match(/<([0-9a-fA-F]*)>/g);
  if (pedacos === null) return '';
  return pedacos
    .map((pedaco) => Buffer.from(pedaco.slice(1, -1), 'hex').toString('latin1'))
    .join('');
}

function leConteudoDaPagina(fluxo: string): PaginaDoPdf {
  const trechos: TrechoDeTexto[] = [];
  const retangulos: RetanguloPintado[] = [];

  let ctm: Matriz = IDENTIDADE;
  const pilha: Matriz[] = [];
  let matrizDeTexto: Matriz = IDENTIDADE;
  let cor = '';
  let ultimoRetangulo: { x: number; y: number; largura: number; altura: number } | null =
    null;

  for (const bruta of fluxo.split('\n')) {
    const linha = bruta.trim();
    if (linha === 'q') {
      pilha.push(ctm);
    } else if (linha === 'Q') {
      ctm = pilha.pop() ?? IDENTIDADE;
    } else if (linha.endsWith(' cm')) {
      const v = numeros(linha);
      if (v.length === 6) {
        ctm = multiplica(
          {
            a: v[0] ?? 1,
            b: v[1] ?? 0,
            c: v[2] ?? 0,
            d: v[3] ?? 1,
            e: v[4] ?? 0,
            f: v[5] ?? 0,
          },
          ctm,
        );
      }
    } else if (linha.endsWith(' Tm')) {
      const v = numeros(linha);
      if (v.length === 6) {
        matrizDeTexto = {
          a: v[0] ?? 1,
          b: v[1] ?? 0,
          c: v[2] ?? 0,
          d: v[3] ?? 1,
          e: v[4] ?? 0,
          f: v[5] ?? 0,
        };
      }
    } else if (linha.endsWith(' TJ') || linha.endsWith(' Tj')) {
      const texto = textoDoOperador(linha);
      if (texto !== '') {
        const posicao = multiplica(matrizDeTexto, ctm);
        trechos.push({ texto, x: posicao.e, y: posicao.f });
      }
    } else if (linha.endsWith(' scn')) {
      cor = numeros(linha).join(',');
    } else if (linha.endsWith(' re')) {
      const v = numeros(linha);
      if (v.length === 4) {
        ultimoRetangulo = {
          x: v[0] ?? 0,
          y: v[1] ?? 0,
          largura: v[2] ?? 0,
          altura: v[3] ?? 0,
        };
      }
    } else if (linha === 'f' && ultimoRetangulo !== null) {
      const canto = multiplica(
        { a: 1, b: 0, c: 0, d: 1, e: ultimoRetangulo.x, f: ultimoRetangulo.y },
        ctm,
      );
      retangulos.push({
        x: canto.e,
        y: canto.f,
        largura: ultimoRetangulo.largura * ctm.a,
        altura: ultimoRetangulo.altura * ctm.d,
        cor,
      });
      ultimoRetangulo = null;
    }
  }

  return { trechos, retangulos };
}

function objetosDo(bruto: string): Map<number, string> {
  const objetos = new Map<number, string>();
  const inicio = /(\d+) 0 obj/g;
  let achado: RegExpExecArray | null;
  while ((achado = inicio.exec(bruto)) !== null) {
    const fim = bruto.indexOf('endobj', achado.index);
    if (fim < 0) continue;
    objetos.set(Number(achado[1]), bruto.slice(achado.index + achado[0].length, fim));
  }
  return objetos;
}

function fluxoDe(objeto: string): string {
  const abertura = objeto.match(/stream\r?\n/);
  if (abertura === null || abertura.index === undefined) return '';
  const inicio = abertura.index + abertura[0].length;
  const fim = objeto.indexOf('endstream', inicio);
  const bytes = Buffer.from(objeto.slice(inicio, fim), 'latin1');
  try {
    return inflateSync(bytes).toString('latin1');
  } catch (erro) {
    // Todo fluxo de conteúdo deste gerador sai em Flate. Falhar aqui significa
    // que o PDF mudou de forma, e o teste precisa saber disso em voz alta, e
    // não passar com o documento vazio.
    throw new Error(`fluxo de página ilegível no PDF gerado: ${String(erro)}`);
  }
}

export function lePdf(buffer: Buffer): PdfLido {
  const bruto = buffer.toString('latin1');
  const objetos = objetosDo(bruto);

  const ordem: number[] = [];
  const raiz = [...objetos.values()].find((objeto) => objeto.includes('/Type /Pages'));
  const filhos = raiz?.match(/\/Kids \[([^\]]*)\]/);
  if (filhos?.[1] !== undefined) {
    for (const referencia of filhos[1].matchAll(/(\d+) 0 R/g)) {
      ordem.push(Number(referencia[1]));
    }
  }

  const paginas: PaginaDoPdf[] = [];
  for (const id of ordem) {
    const pagina = objetos.get(id);
    if (pagina === undefined) continue;
    const conteudo = pagina.match(/\/Contents (\d+) 0 R/);
    const fluxo =
      conteudo?.[1] === undefined ? undefined : objetos.get(Number(conteudo[1]));
    paginas.push(
      fluxo === undefined
        ? { trechos: [], retangulos: [] }
        : leConteudoDaPagina(fluxoDe(fluxo)),
    );
  }

  return { paginas };
}

/** Os textos de uma página do PDF gerado, na ordem em que foram pintados. */
export function textosDaPaginaDoPdf(pdf: PdfLido, numero: number): string[] {
  return (pdf.paginas[numero - 1]?.trechos ?? []).map((trecho) => trecho.texto);
}
