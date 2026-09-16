/**
 * Duplas de teste do módulo `lancamento`.
 *
 * A frente A ainda constrói `acesso`, `obra` e `taxonomia`. Enquanto isso, o
 * módulo roda contra estas duplas, que implementam as portas de `portas.ts`.
 * Nada aqui é cópia do código da frente A: é o mínimo que satisfaz o contrato.
 *
 * Dado de teste é sintético. Nenhum nome real de trabalhador, de fiscal ou de
 * engenheiro entra aqui (CLAUDE.md, Segurança).
 */

import { criaDiaPuro, type DiaPuro } from '../../../shared/date/dia';
import { deTextoDoUsuario, type Quantidade } from '../../../shared/decimal';
import {
  idConfiavel,
  type LancamentoId,
  type ObraId,
  type ServicoControladoId,
  type StatusAtividadeId,
  type UsuarioId,
} from '../../../shared/id';
import { CODIGO_ERRO, erro, erroDeAcesso, ok } from '../../../shared/result';
import { chaveDeTermo } from '../../../shared/taxonomia';
import type { Colecao, ColecaoDeProducao, RepositorioDeLancamento } from '../repositorio';
import type { PortasDoLancamento, ServicoControlado, StatusDeAtividade } from '../portas';
import type {
  DiaDeObra,
  LinhaDeAtividade,
  LinhaDeLancamento,
  LinhaDeObservacao,
  LinhaDePluviometria,
  LinhaDeProducao,
  Perfil,
} from '../tipos';

/** Converte literal de teste em dia puro. Lança se o literal estiver errado. */
export function dia(bruto: string): DiaPuro {
  const r = criaDiaPuro(bruto);
  if (!r.ok) throw new Error(`Literal de teste invalido: ${bruto}`);
  return r.valor;
}

export function quantidade(bruto: string): Quantidade {
  const r = deTextoDoUsuario(bruto);
  if (!r.ok) throw new Error(`Literal de teste invalido: ${bruto}`);
  return r.valor;
}

export const OBRA_B02 = idConfiavel<'obra'>('obra-b02');
export const OBRA_OUTRA = idConfiavel<'obra'>('obra-outra');
export const C1 = idConfiavel<'usuario'>('usuario-c1');
export const C2 = idConfiavel<'usuario'>('usuario-c2');
export const E1 = idConfiavel<'usuario'>('usuario-e1');
export const E2 = idConfiavel<'usuario'>('usuario-e2');

/** Relógio injetado: teste unitário não depende do horário real. */
export function relogioFixo(iso: string): () => Date {
  return () => new Date(iso);
}

/**
 * Relógio que anda a cada leitura.
 *
 * Existe porque a ordem do bloco 8 é `registrado_em` e depois `id`: dois
 * lançamentos no mesmo milissegundo empatariam e cairiam no desempate por id,
 * que é UUID e não tem relação com a ordem de digitação.
 */
export function relogioQueAvanca(inicio: string, passoMs = 1000): () => Date {
  let atual = new Date(inicio).getTime() - passoMs;
  return () => {
    atual += passoMs;
    return new Date(atual);
  };
}

function criaColecaoEmMemoria<L extends LinhaDeLancamento>(): Colecao<L> & {
  readonly linhas: L[];
} {
  const linhas: L[] = [];
  return {
    linhas,
    doDia: (obraId, data) =>
      Promise.resolve(linhas.filter((l) => l.obraId === obraId && l.data === data)),
    porId: (obraId, id) =>
      Promise.resolve(linhas.find((l) => l.obraId === obraId && l.id === id) ?? null),
    cadeia: (obraId, raizId) =>
      Promise.resolve(linhas.filter((l) => l.obraId === obraId && l.raizId === raizId)),
    porRascunho: (autorId, chave) =>
      Promise.resolve(
        linhas.find((l) => l.autorId === autorId && l.chaveDeRascunho === chave) ?? null,
      ),
    grava: (linha) => {
      linhas.push(linha);
      return Promise.resolve();
    },
    atualiza: (linha) => {
      const i = linhas.findIndex((l) => l.id === linha.id);
      if (i >= 0) linhas[i] = linha;
      return Promise.resolve();
    },
    // Marca, nunca apaga (30.1). A dupla reproduz o que o banco faz: a linha
    // fica, e quem some é a leitura. Uma dupla que apagasse esconderia a metade
    // do rastro que o teste precisa ver.
    marcaExcluido: (obraId, id, exclusao) => {
      const i = linhas.findIndex((l) => l.obraId === obraId && l.id === id);
      const linha = linhas[i];
      if (linha !== undefined) linhas[i] = { ...linha, exclusao };
      return Promise.resolve();
    },
  };
}

export interface RepositorioEmMemoria extends RepositorioDeLancamento {
  readonly dias: Map<string, DiaDeObra>;
  readonly atividades: Colecao<LinhaDeAtividade> & {
    readonly linhas: LinhaDeAtividade[];
  };
  readonly producao: ColecaoDeProducao & { readonly linhas: LinhaDeProducao[] };
  readonly pluviometria: Colecao<LinhaDePluviometria> & {
    readonly linhas: LinhaDePluviometria[];
  };
  readonly observacoes: Colecao<LinhaDeObservacao> & {
    readonly linhas: LinhaDeObservacao[];
  };
}

function restaura<L>(vivo: L[], copia: readonly L[]): void {
  vivo.splice(0, vivo.length, ...copia);
}

export function criaRepositorioEmMemoria(): RepositorioEmMemoria {
  const dias = new Map<string, DiaDeObra>();
  const atividades = criaColecaoEmMemoria<LinhaDeAtividade>();
  const producaoBase = criaColecaoEmMemoria<LinhaDeProducao>();
  const pluviometria = criaColecaoEmMemoria<LinhaDePluviometria>();
  const observacoes = criaColecaoEmMemoria<LinhaDeObservacao>();

  const producao: ColecaoDeProducao & { readonly linhas: LinhaDeProducao[] } = {
    ...producaoBase,
    ate: (obraId, ate) =>
      Promise.resolve(
        producaoBase.linhas.filter((l) => l.obraId === obraId && l.data <= ate),
      ),
  };

  return {
    dias,
    dia: {
      obtem: (obraId, data) => Promise.resolve(dias.get(`${obraId}|${data}`) ?? null),
      salva: (d) => {
        dias.set(`${d.obraId}|${d.data}`, d);
        return Promise.resolve();
      },
    },
    atividades,
    producao,
    pluviometria,
    observacoes,
    // Instantâneo e desfazimento: a dupla precisa provar que um lançamento
    // recusado não deixa o dia criado para trás.
    executaEmTransacao: async (operacao) => {
      const copiaDias = new Map(dias);
      const copiaAtividades = [...atividades.linhas];
      const copiaProducao = [...producaoBase.linhas];
      const copiaPluviometria = [...pluviometria.linhas];
      const copiaObservacoes = [...observacoes.linhas];
      try {
        return await operacao();
      } catch (e) {
        dias.clear();
        for (const [chave, valor] of copiaDias) dias.set(chave, valor);
        restaura(atividades.linhas, copiaAtividades);
        restaura(producaoBase.linhas, copiaProducao);
        restaura(pluviometria.linhas, copiaPluviometria);
        restaura(observacoes.linhas, copiaObservacoes);
        throw e;
      }
    },
  };
}

export interface ConfiguracaoDasPortas {
  readonly dataInicio: string;
  readonly dataTermino: string;
  readonly statusTermos: readonly string[];
  readonly servicos: readonly {
    readonly nome: string;
    readonly projeto: string | null;
  }[];
  readonly acessos: readonly {
    readonly usuarioId: UsuarioId;
    readonly obraId: ObraId;
    readonly perfil: Perfil;
  }[];
}

export const CONFIGURACAO_PADRAO: ConfiguracaoDasPortas = {
  dataInicio: '2026-02-05',
  dataTermino: '2027-02-05',
  statusTermos: [
    'Produção',
    'Informativo',
    'Mobilização',
    'Limpeza',
    'Perca de produção',
  ],
  servicos: [
    { nome: 'REC.(FRESA+CAPA)', projeto: '2210,392' },
    { nome: 'IM.(SUBLEITO+BASE+CAPA)', projeto: '5000' },
  ],
  acessos: [
    { usuarioId: C1, obraId: OBRA_B02, perfil: 'encarregado' },
    { usuarioId: C2, obraId: OBRA_B02, perfil: 'encarregado' },
    { usuarioId: E1, obraId: OBRA_B02, perfil: 'engenheiro' },
    { usuarioId: E2, obraId: OBRA_OUTRA, perfil: 'engenheiro' },
  ],
};

export interface PortasDeTeste extends PortasDoLancamento {
  /** Quantos termos a taxonomia tem. Prova que nenhum foi criado por engano. */
  contaStatus(): number;
  contaServicos(): number;
  idDoStatus(termo: string): StatusAtividadeId;
  idDoServico(nome: string): ServicoControladoId;
}

export function criaPortasDeTeste(
  configuracao: Partial<ConfiguracaoDasPortas> = {},
): PortasDeTeste {
  const cfg: ConfiguracaoDasPortas = { ...CONFIGURACAO_PADRAO, ...configuracao };

  const status = new Map<string, StatusDeAtividade>();
  for (const termo of cfg.statusTermos) {
    status.set(chaveDeTermo(termo), {
      id: idConfiavel<'status_atividade'>(`status-${chaveDeTermo(termo)}`),
      termo,
    });
  }

  const servicos = new Map<string, ServicoControlado>();
  for (const s of cfg.servicos) {
    servicos.set(chaveDeTermo(s.nome), {
      id: idConfiavel<'servico_controlado'>(`servico-${chaveDeTermo(s.nome)}`),
      obraId: OBRA_B02,
      nome: s.nome,
      quantidadeProjeto: s.projeto === null ? null : quantidade(s.projeto),
    });
  }

  const porIdStatus = new Map([...status.values()].map((s) => [String(s.id), s]));
  const porIdServico = new Map([...servicos.values()].map((s) => [String(s.id), s]));

  return {
    exigeAcessoNaObra: (ator, obraId) => {
      const achado = cfg.acessos.find(
        (a) => a.usuarioId === ator.usuarioId && a.obraId === obraId,
      );
      if (achado === undefined) {
        // Obra inexistente e obra sem acesso devolvem o MESMO erro, para não
        // revelar existência (arquitetura 4.9).
        return Promise.resolve(
          erro(
            erroDeAcesso(
              CODIGO_ERRO.NAO_ENCONTRADO,
              'Obra não encontrada ou sem acesso.',
            ),
          ),
        );
      }
      return Promise.resolve(
        ok({ usuarioId: achado.usuarioId, obraId: achado.obraId, perfil: achado.perfil }),
      );
    },
    periodoDaObra: (obraId) =>
      Promise.resolve(
        obraId === OBRA_B02 || obraId === OBRA_OUTRA
          ? { dataInicio: dia(cfg.dataInicio), dataTermino: dia(cfg.dataTermino) }
          : null,
      ),
    status: {
      porId: (id) => Promise.resolve(porIdStatus.get(String(id)) ?? null),
      porTermo: (termo) => Promise.resolve(status.get(chaveDeTermo(termo)) ?? null),
      ativos: () => Promise.resolve([...status.values()]),
    },
    servicos: {
      porId: (_obraId, id) => Promise.resolve(porIdServico.get(String(id)) ?? null),
      porNome: (_obraId, nome) =>
        Promise.resolve(servicos.get(chaveDeTermo(nome)) ?? null),
      daObra: () => Promise.resolve([...servicos.values()]),
    },
    sugestoesDeMotivo: () =>
      Promise.resolve([
        'Domingo',
        'Feriado',
        'Chuva',
        'Excesso de umidade no trecho',
        'Interferência de terceiro',
        'Impraticável',
        'Sem frente de serviço',
        'Outro',
      ]),
    contaStatus: () => status.size,
    contaServicos: () => servicos.size,
    idDoStatus: (termo) => {
      const s = status.get(chaveDeTermo(termo));
      if (s === undefined) throw new Error(`Status de teste ausente: ${termo}`);
      return s.id;
    },
    idDoServico: (nome) => {
      const s = servicos.get(chaveDeTermo(nome));
      if (s === undefined) throw new Error(`Servico de teste ausente: ${nome}`);
      return s.id;
    },
  };
}

export function idDeLancamento(valor: string): LancamentoId {
  return idConfiavel<'lancamento'>(valor);
}
