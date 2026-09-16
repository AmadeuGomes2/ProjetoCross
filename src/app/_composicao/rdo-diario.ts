/**
 * Raiz de composição do RDO diário. **As portas estão ligadas.**
 *
 * `docs/arquitetura/v1.md`, 4.1: o módulo consumidor declara a **porta**; o
 * módulo produtor exporta uma função com a mesma forma; a ligação acontece
 * aqui, e este é o único lugar que importa de mais de um módulo. Pasta com `_`
 * não vira rota no App Router.
 *
 * ## Ordem obrigatória: autorizar, depois consultar
 *
 * `consultaRdoProtegida` é a **única** entrada pública deste arquivo, e ela
 * começa por `exigeAcessoNaObra`. As 11 portas abaixo **não autorizam** — elas
 * já rodam do lado de dentro da fronteira. Quem montar o RDO sem passar por
 * `consultaRdoProtegida` publica o bloco 10 (observação, texto livre onde a
 * planilha real traz nome de fiscal) e o bloco 11 (nome, titulação e CREA)
 * num endereço adivinhável. Foi o CRÍTICO 1 do laudo de 16/09/2026.
 *
 * ## O contrato que venceu
 *
 * Havia dois: cinco portas com o efetivo **já agregado** e onze portas com a
 * **mobilização crua**. Vence a mobilização crua. A razão não é gosto:
 * mantém `intervaloCobreODia` como implementação única da regra do dia da
 * saída (1.1 e 1.2) e deixa o zeramento de dia parado (5.1) parado onde o
 * estado do dia é conhecido, que é o `rdo`. Consequência: `pessoal` e
 * `equipamento` entregam passagens e não contam ninguém.
 *
 * | Porta                      | Origem                                      |
 * | -------------------------- | ------------------------------------------- |
 * | `cabecalho`                | `obra.obtemCabecalhoDaObra`                 |
 * | `bms`                      | `obra.resolveBmsDoDia`                      |
 * | `funcoes`                  | `taxonomia.listaFuncoesParaEfetivo`         |
 * | `pessoalMobilizado`        | `pessoal.listaMobilizacao` (sem nome)       |
 * | `equipamentosMobilizados`  | `equipamento.listaMobilizacao`              |
 * | `servicos`                 | `obra.listaServicosControlados`             |
 * | `dia`                      | `lancamento.obtemDiaDeObra`                 |
 * | `lancamentosDeProducaoAte` | `lancamento.listaProducaoVigenteAte`        |
 * | `atividades`               | `lancamento.listaAtividadesVigentes`        |
 * | `pluviometria`             | `lancamento.obtemPluviometriaVigente`       |
 * | `observacoesCros`          | `lancamento.listaObservacoesVigentes`       |
 *
 * As portas são `async` só para casar com o contrato: o driver do SQLite é
 * síncrono e os casos de uso de cadastro também são. O lugar de acomodar essa
 * diferença é a raiz de composição.
 */

import { listaMobilizacao as listaEquipamentosMobilizados } from '../../modules/equipamento';
import type { CasosDeLancamento } from '../../modules/lancamento';
import {
  listaServicosControlados,
  obtemCabecalhoDaObra,
  resolveBmsDoDia,
} from '../../modules/obra';
import type { CabecalhoDaObra as CabecalhoDoCadastro } from '../../modules/obra';
import { listaMobilizacao as listaPessoalMobilizado } from '../../modules/pessoal';
import { exigeAcessoNaObra, type Ator } from '../../modules/acesso';
import { consultaRdoDiario } from '../../modules/rdo/borda/consulta-rdo';
import type { ErroDeConsultaDoRdo } from '../../modules/rdo/borda/consulta-rdo';
import type { CabecalhoDaObra, PortasDoRdo } from '../../modules/rdo/portas';
import type { RdoDiario } from '../../modules/rdo/tipos';
import { listaFuncoesParaEfetivo } from '../../modules/taxonomia';
import { zero } from '../../shared/decimal';
import { idConfiavel, type ObraId } from '../../shared/id';
import {
  erro,
  erroDeDominio,
  ok,
  type ErroConhecido,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import { ambienteDaComposicao, type AmbienteDaComposicao } from './ambiente';
import {
  paraAcesso,
  paraEquipamento,
  paraObra,
  paraPessoal,
  paraTaxonomia,
} from './ambiente-de-cadastro';
import { casosDeLancamento, portasDeLancamento } from './lancamento';

/**
 * O responsável técnico muda de nome de campo entre `obra` e `rdo`: lá é
 * `crea`, aqui é `registro`. É deliberado — o bloco 11 imprime um registro
 * profissional que amanhã pode não ser CREA, e o RDO não precisa saber qual é.
 * A tradução mora aqui, que é onde os dois contratos se encontram.
 */
function cabecalhoParaRdo(
  bruto: Result<CabecalhoDoCadastro, ErroDeDominio>,
): Result<CabecalhoDaObra, ErroDeDominio> {
  if (!bruto.ok) return bruto;
  const obra = bruto.valor;
  return ok({
    obraId: obra.obraId,
    contrato: obra.contrato,
    contratante: obra.contratante,
    contratada: obra.contratada,
    escopo: obra.escopo,
    dataInicio: obra.dataInicio,
    dataTermino: obra.dataTermino,
    nomeProjeto: obra.nomeProjeto,
    area: obra.area,
    local: obra.local,
    responsavelTecnico:
      obra.respTecnico === null
        ? null
        : {
            nome: obra.respTecnico.nome,
            titulo: obra.respTecnico.titulo,
            registro: obra.respTecnico.crea,
          },
  });
}

/**
 * As leituras do `lancamento` devolvem `ErroConhecido`; a porta do `rdo` pede
 * `ErroDeDominio`. A conversão é explícita, e não um `as`: erro de entrada e
 * erro de acesso guardam o mesmo código e a mesma mensagem, e é isso que
 * precisa chegar a quem lê a tela. Um `as` aqui calaria o compilador e
 * quebraria na primeira leitura que recusasse por acesso.
 */
function comoErroDeDominio(e: ErroConhecido): ErroDeDominio {
  return e.tipo === 'dominio' ? e : erroDeDominio(e.codigo, e.mensagem);
}

export function criaPortasDoRdo(
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
  casos: CasosDeLancamento = casosDeLancamento(portasDeLancamento(ambiente), ambiente),
): PortasDoRdo {
  const amb = ambiente.cadastro;

  return {
    cabecalho: async (obraId) =>
      cabecalhoParaRdo(obtemCabecalhoDaObra(obraId, paraObra(amb))),
    bms: async (obraId, dia) => resolveBmsDoDia(obraId, dia, paraObra(amb)),
    funcoes: async () => listaFuncoesParaEfetivo(paraTaxonomia(amb)),
    pessoalMobilizado: async (obraId) => listaPessoalMobilizado(obraId, paraPessoal(amb)),
    equipamentosMobilizados: async (obraId) =>
      listaEquipamentosMobilizados(obraId, paraEquipamento(amb)),
    servicos: async (obraId) => {
      const lista = listaServicosControlados(obraId, paraObra(amb));
      if (!lista.ok) return lista;
      return ok(
        lista.valor.map((s) => ({
          servicoId: s.servicoId,
          nome: s.nome,
          ordem: s.ordem,
          // Quantidade de projeto nunca definida vira zero, e não erro: a
          // decisão 13.4 proíbe gravar zero, mas o serviço nasce com a obra e
          // pode passar dias sem quantidade. `divideParaPercentual` devolve
          // `null` para denominador zero, então o bloco 7 sai com a linha e
          // sem percentual — que é melhor que um RDO recusado.
          quantidadeDeProjeto: s.quantidadeDeProjeto ?? zero(),
        })),
      );
    },

    dia: async (obraId, dia) => {
      const lido = await casos.obtemDiaDeObra(obraId, dia);
      if (!lido.ok) return erro(comoErroDeDominio(lido.erro));
      const registro = lido.valor;
      // Decisão 4.2: ausência de linha é o terceiro estado, `não lançado`.
      if (registro === null) return ok(null);
      return ok({
        estado: registro.estado,
        motivoParada: registro.motivoParada,
        numeroRdoCongelado: registro.numeroRdoCongelado,
        eDiaFechado: registro.fechadoEm !== null,
      });
    },

    lancamentosDeProducaoAte: async (obraId, dia) => {
      const lido = await casos.listaProducaoVigenteAte(obraId, dia);
      if (!lido.ok) return erro(comoErroDeDominio(lido.erro));
      return ok(
        lido.valor.map((l) => ({
          lancamentoId: l.id,
          servicoId: l.servicoId,
          data: l.data,
          quantidade: l.quantidade,
        })),
      );
    },

    atividades: async (obraId, dia) => {
      const lido = await casos.listaAtividadesVigentes(obraId, dia);
      if (!lido.ok) return erro(comoErroDeDominio(lido.erro));
      // O autor não atravessa: `AtividadeDoDia` do `rdo` não tem o campo, e o
      // bloco 8 não mostra quem lançou (decisão 14.0).
      return ok(
        lido.valor.map((a) => ({
          lancamentoId: a.id,
          descricao: a.descricao,
          status: a.statusTermo,
        })),
      );
    },

    pluviometria: async (obraId, dia) => {
      const lido = await casos.obtemPluviometriaVigente(obraId, dia);
      if (!lido.ok) return erro(comoErroDeDominio(lido.erro));
      const leitura = lido.valor;
      if (leitura === null) return ok(null);
      return ok({
        noiteAnterior: leitura.noiteAnterior,
        manha: leitura.manha,
        tarde: leitura.tarde,
        indiceMm: leitura.indiceMm,
      });
    },

    observacoesCros: async (obraId, dia) => {
      // Cada bloco lê a SUA fonte: o defeito C10 da planilha, em que o rótulo
      // diz CROS e a fórmula lê a aba do contratante, não se herda.
      const lido = await casos.listaObservacoesVigentes(obraId, dia, 'CROS');
      if (!lido.ok) return erro(comoErroDeDominio(lido.erro));
      return ok(lido.valor.map((o) => ({ lancamentoId: o.id, texto: o.texto })));
    },
  };
}

/**
 * Consultar o RDO de uma obra. **A única entrada deste arquivo.**
 *
 * A ordem é autorizar e só então interpretar o pedido: quem não tem acesso à
 * obra não deve nem descobrir que a data estava mal escrita. Obra inexistente e
 * obra sem acesso devolvem o mesmo erro, para não revelar existência (CT-075).
 *
 * O `obraId` vem da URL e é hostil: aqui ele só ganha a marca de tipo, e quem
 * responde se ele existe é `exigeAcessoNaObra`, contra a tabela `acesso`, em
 * toda chamada e sem cache.
 */
export async function consultaRdoProtegida(
  ator: Ator,
  bruto: { readonly obraId: string; readonly dia: string },
  ambiente: AmbienteDaComposicao = ambienteDaComposicao(),
): Promise<Result<RdoDiario, ErroDeConsultaDoRdo>> {
  const obraId: ObraId = idConfiavel<'obra'>(bruto.obraId);
  const permitido = exigeAcessoNaObra(
    ator,
    obraId,
    'encarregado',
    paraAcesso(ambiente.cadastro),
  );
  if (!permitido.ok) {
    return erro({
      tipo: 'dominio',
      codigo: permitido.erro.codigo,
      mensagem: permitido.erro.mensagem,
    });
  }

  return consultaRdoDiario(bruto, criaPortasDoRdo(ambiente));
}
