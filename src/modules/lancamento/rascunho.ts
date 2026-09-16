/**
 * Rascunho local do lançamento (decisão 16.1, R27).
 *
 * O encarregado lança no canteiro, com sinal instável. O que ele digitou não
 * pode se perder quando a rede cai, senão ele volta para o áudio no WhatsApp —
 * que é a comparação real do produto (CLAUDE.md, Mobile).
 *
 * Três decisões que estão aqui e em nenhum outro lugar:
 *
 * 1. **Sem resolução de conflito.** Dois rascunhos do mesmo dia, de pessoas
 *    diferentes, viram dois lançamentos. Nenhum é descartado pelo sistema.
 * 2. **O armazenamento pode não existir.** Em aba privada o `localStorage`
 *    lança ao ser lido ou escrito. Toda chamada é protegida, e a fila degrada
 *    para "não disponível" em vez de derrubar a tela.
 * 3. **Nada de dado pessoal.** O rascunho guarda o que foi digitado e os
 *    identificadores; não guarda nome, nem do autor nem de trabalhador. O
 *    aparelho do encarregado é o ponto mais exposto do sistema.
 */

export interface ArmazenamentoLocal {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

/** O que a tela guarda enquanto não há rede. Só campos digitados e ids. */
export interface RascunhoDeAtividade {
  /** Chave de idempotência: reenviar o mesmo rascunho não duplica. */
  readonly chave: string;
  readonly obraId: string;
  readonly data: string;
  readonly descricao: string;
  readonly statusId: string;
  readonly statusTermo: string;
}

export interface RascunhoNaFila extends RascunhoDeAtividade {
  readonly enviado: false;
  /** Mensagem da última recusa do servidor. Nula enquanto nunca foi tentada. */
  readonly erro: string | null;
}

export type RespostaDoEnvio =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: { readonly mensagem: string } };

export type EnviaRascunho = (rascunho: RascunhoNaFila) => Promise<RespostaDoEnvio>;

export interface ResumoDoEnvio {
  readonly aceitos: number;
  readonly recusados: number;
  readonly falhasDeRede: number;
}

export const CHAVE_DE_ARMAZENAMENTO = 'rdo.rascunhos.atividade';

export interface FilaDeRascunhos {
  disponivel(): boolean;
  guarda(rascunho: RascunhoDeAtividade): void;
  lista(obraId: string, data: string): RascunhoNaFila[];
  remove(chave: string): void;
  enviaPendentes(envia: EnviaRascunho): Promise<ResumoDoEnvio>;
}

function ehRascunho(valor: unknown): valor is RascunhoNaFila {
  if (typeof valor !== 'object' || valor === null) return false;
  const campos = ['chave', 'obraId', 'data', 'descricao', 'statusId', 'statusTermo'];
  const registro: Record<string, unknown> = { ...valor };
  return campos.every((campo) => typeof registro[campo] === 'string');
}

export function criaFilaDeRascunhos(
  armazenamento: ArmazenamentoLocal | null,
): FilaDeRascunhos {
  let acessivel = armazenamento !== null;

  function le(): RascunhoNaFila[] {
    if (armazenamento === null || !acessivel) return [];
    try {
      const bruto = armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO);
      if (bruto === null) return [];
      const lido: unknown = JSON.parse(bruto);
      if (!Array.isArray(lido)) return [];
      return lido.filter(ehRascunho).map((r) => ({
        ...r,
        enviado: false,
        erro: typeof r.erro === 'string' ? r.erro : null,
      }));
    } catch {
      // Aba privada bloqueia o armazenamento, e conteúdo corrompido não é
      // recuperável. Nos dois casos a tela continua de pé sem rascunho, que é
      // melhor que uma tela branca no canteiro. Não é exceção engolida: o
      // estado vira `disponivel() === false`, visível para quem chama.
      acessivel = false;
      return [];
    }
  }

  function escreve(lista: readonly RascunhoNaFila[]): void {
    if (armazenamento === null) return;
    try {
      armazenamento.setItem(CHAVE_DE_ARMAZENAMENTO, JSON.stringify(lista));
      acessivel = true;
    } catch {
      acessivel = false;
    }
  }

  return {
    disponivel: () => acessivel,
    guarda: (rascunho) => {
      const atual = le().filter((r) => r.chave !== rascunho.chave);
      escreve([...atual, { ...rascunho, enviado: false, erro: null }]);
    },
    lista: (obraId, data) => le().filter((r) => r.obraId === obraId && r.data === data),
    remove: (chave) => {
      escreve(le().filter((r) => r.chave !== chave));
    },
    enviaPendentes: async (envia) => {
      let aceitos = 0;
      let recusados = 0;
      let falhasDeRede = 0;
      const restantes: RascunhoNaFila[] = [];
      for (const rascunho of le()) {
        try {
          const resposta = await envia(rascunho);
          if (resposta.ok) {
            aceitos += 1;
            continue;
          }
          // Recusa do servidor: o rascunho FICA, com a mensagem. Rejeitar não
          // pode apagar o que o encarregado digitou (CT-168).
          recusados += 1;
          restantes.push({ ...rascunho, erro: resposta.erro.mensagem });
        } catch {
          // Rede caiu de novo. O rascunho fica como estava e a contagem sobe,
          // para quem chamou decidir se avisa ou tenta de novo depois.
          falhasDeRede += 1;
          restantes.push(rascunho);
        }
      }
      escreve(restantes);
      return { aceitos, recusados, falhasDeRede };
    },
  };
}

const SEM_RASCUNHO: readonly RascunhoNaFila[] = [];

/**
 * A fila vista como fonte externa de estado, para o React ler com
 * `useSyncExternalStore`.
 *
 * Existe por uma razão técnica com consequência de produto: o rascunho vive no
 * APARELHO, e o servidor não sabe o que há nele. Renderizar no servidor a lista
 * de pendentes produziria HTML diferente do que o navegador tem, e a correção
 * ingênua — ler no efeito e chamar `setState` — provoca renderização em cascata
 * numa tela que precisa responder com luva e sol.
 *
 * `instantaneo` devolve SEMPRE a mesma referência enquanto nada muda; sem isso
 * o React entra em laço.
 */
export interface LojaDeRascunhos {
  assina(ouvinte: () => void): () => void;
  instantaneo(obraId: string, data: string): readonly RascunhoNaFila[];
  instantaneoDoServidor(): readonly RascunhoNaFila[];
  guarda(rascunho: RascunhoDeAtividade): void;
  remove(chave: string): void;
  enviaPendentes(envia: EnviaRascunho): Promise<ResumoDoEnvio>;
  disponivel(): boolean;
}

export function criaLojaDeRascunhos(
  armazenamento: ArmazenamentoLocal | null,
): LojaDeRascunhos {
  const fila = criaFilaDeRascunhos(armazenamento);
  const ouvintes = new Set<() => void>();
  let versao = 0;
  let chaveDoCache = '';
  let valorDoCache: readonly RascunhoNaFila[] = SEM_RASCUNHO;

  function avisa(): void {
    versao += 1;
    for (const ouvinte of ouvintes) ouvinte();
  }

  return {
    assina: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    instantaneo: (obraId, data) => {
      const chave = `${versao}|${obraId}|${data}`;
      if (chave !== chaveDoCache) {
        chaveDoCache = chave;
        valorDoCache = fila.lista(obraId, data);
      }
      return valorDoCache;
    },
    instantaneoDoServidor: () => SEM_RASCUNHO,
    guarda: (rascunho) => {
      fila.guarda(rascunho);
      avisa();
    },
    remove: (chave) => {
      fila.remove(chave);
      avisa();
    },
    enviaPendentes: async (envia) => {
      const resumo = await fila.enviaPendentes(envia);
      avisa();
      return resumo;
    },
    disponivel: () => fila.disponivel(),
  };
}

/** `localStorage` quando existe; `null` no servidor e em aba que o bloqueia. */
export function armazenamentoDoNavegador(): ArmazenamentoLocal | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') return null;
    return globalThis.localStorage;
  } catch {
    // Acessar a propriedade já lança em alguns navegadores com cookie bloqueado.
    return null;
  }
}
