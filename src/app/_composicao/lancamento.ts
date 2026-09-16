/**
 * Raiz de composição do módulo `lancamento`. **As portas estão ligadas.**
 *
 * Arquitetura 4.1: "a ligação acontece na raiz de composição... é o único lugar
 * que importa de mais de um módulo."
 *
 * ## O adaptador de acesso, que não era "uma linha"
 *
 * `lancamento` declara `exigeAcessoNaObra(ator, obraId, acao)`, assíncrona e
 * com três argumentos. `acesso` oferece
 * `exigeAcessoNaObra(ator, obraId, perfilMinimo, amb)`, síncrona e com quatro.
 * As duas não casam por estrutura, e o laudo de segurança de 16/09/2026
 * (ATENÇÃO 2) mostrou que a falta desse adaptador é onde a ligação trava — e
 * onde alguém é tentado a ligar algo que não verifica nada.
 *
 * O adaptador é o mapa abaixo. Ele é a única tradução de **ação** para **perfil
 * mínimo** do sistema, e a regra não muda: a decisão 22.1 continua sendo
 * verificada dentro do módulo, em `casos.ts`, então mesmo um mapa errado não
 * deixa encarregado fechar dia nem retificar.
 *
 * Quem é o portador da requisição mora em `sessao.ts`, ao lado do cookie. Aqui
 * não entra `next/headers`: este arquivo precisa rodar em teste de integração
 * sem um ciclo de requisição do Next em volta.
 */

import { exigeAcessoNaObra, type Perfil } from '../../modules/acesso';
import {
  criaCasosDeLancamento,
  type AcaoProtegida,
  type CasosDeLancamento,
  type PortasDoLancamento,
  type ServicoControlado,
} from '../../modules/lancamento';
import { criaRepositorioDrizzle } from '../../modules/lancamento/repositorio-drizzle';
import { listaServicosControlados, obtemCabecalhoDaObra } from '../../modules/obra';
import {
  listaSugestoesDeMotivo,
  listaTermosAtivos,
  resolveTermo,
} from '../../modules/taxonomia';
import { idConfiavel, type ObraId } from '../../shared/id';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import { paraAcesso, paraObra, paraTaxonomia } from './ambiente-de-cadastro';

/**
 * Ação → perfil mínimo. A tabela "Quem usa" do PRD, em código, num lugar só.
 *
 * `lancar` e `corrigir_lancamento` são dos dois perfis: o encarregado lança e
 * corrige enquanto o dia está aberto. `fechar_dia` (9.1) e
 * `retificar_lancamento` (22.1) são só do engenheiro.
 */
const PERFIL_MINIMO_DA_ACAO: Readonly<Record<AcaoProtegida, Perfil>> = {
  lancar: 'encarregado',
  corrigir_lancamento: 'encarregado',
  fechar_dia: 'engenheiro',
  retificar_lancamento: 'engenheiro',
};

function servicosDaObra(
  ambiente: AmbienteDaComposicao,
  obraId: ObraId,
): ServicoControlado[] {
  const lista = listaServicosControlados(obraId, paraObra(ambiente.cadastro));
  if (!lista.ok) return [];
  return lista.valor.map((s) => ({
    id: s.servicoId,
    obraId,
    nome: s.nome,
    quantidadeProjeto: s.quantidadeDeProjeto,
  }));
}

export function portasDeLancamento(
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): PortasDoLancamento {
  const amb = ambiente.cadastro;

  return {
    exigeAcessoNaObra: async (ator, obraId, acao) =>
      exigeAcessoNaObra(ator, obraId, PERFIL_MINIMO_DA_ACAO[acao], paraAcesso(amb)),

    periodoDaObra: async (obraId) => {
      const cabecalho = obtemCabecalhoDaObra(obraId, paraObra(amb));
      if (!cabecalho.ok) return null;
      return {
        dataInicio: cabecalho.valor.dataInicio,
        dataTermino: cabecalho.valor.dataTermino,
      };
    },

    status: {
      porId: async (id) => {
        const termos = listaTermosAtivos('status_atividade', paraTaxonomia(amb));
        if (!termos.ok) return null;
        const achado = termos.valor.find((t) => t.id === String(id));
        return achado === undefined
          ? null
          : { id: idConfiavel<'status_atividade'>(achado.id), termo: achado.termo };
      },
      // Comparação por `chaveDeTermo`, nunca por igualdade exata, e **nunca
      // cria termo**: foi assim que a planilha ganhou status gêmeos (CT-101).
      porTermo: async (termo) => {
        const achado = resolveTermo('status_atividade', termo, paraTaxonomia(amb));
        if (achado === null || !achado.ativo) return null;
        return { id: idConfiavel<'status_atividade'>(achado.id), termo: achado.termo };
      },
      ativos: async () => {
        const termos = listaTermosAtivos('status_atividade', paraTaxonomia(amb));
        if (!termos.ok) return [];
        return termos.valor.map((t) => ({
          id: idConfiavel<'status_atividade'>(t.id),
          termo: t.termo,
        }));
      },
    },

    servicos: {
      porId: async (obraId, id) =>
        servicosDaObra(ambiente, obraId).find((s) => s.id === id) ?? null,
      // Espaço INTERNO não é espaço de ponta: a normalização do R13 não pode
      // transformar `REC. (FRESA+CAPA)` em `REC.(FRESA+CAPA)` (CT-125).
      porNome: async (obraId, nome) =>
        servicosDaObra(ambiente, obraId).find((s) => s.nome.trim() === nome.trim()) ??
        null,
      daObra: async (obraId) => servicosDaObra(ambiente, obraId),
    },

    sugestoesDeMotivo: async () => {
      const lista = listaSugestoesDeMotivo(paraTaxonomia(amb));
      return lista.ok ? lista.valor : [];
    },
  };
}

export function casosDeLancamento(
  portas: PortasDoLancamento = portasDeLancamento(),
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): CasosDeLancamento {
  return criaCasosDeLancamento({
    repositorio: criaRepositorioDrizzle(ambiente.conexao),
    portas,
    // Relógio injetado: o teste de integração não depende do relógio real.
    relogio: ambiente.cadastro.relogio,
  });
}
