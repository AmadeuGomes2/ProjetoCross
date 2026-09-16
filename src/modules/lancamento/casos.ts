/**
 * Casos de uso do módulo `lancamento`.
 *
 * Escrita recebe `Ator` e confere o acesso à obra em TODA chamada: o
 * identificador do lançamento nunca é chave de acesso (arquitetura 5.2).
 * Leitura recebe só `obraId` e `dia`, porque é o contrato que o módulo `rdo`
 * consome como porta — quem autoriza a leitura é a rota.
 *
 * Nada aqui grava RDO montado. O acumulado é recalculado do zero em toda
 * consulta, e o único valor derivado que se grava é o número do RDO no
 * fechamento (decisão 6.2).
 */

import { diferencaEmDias, somaDias, type DiaPuro } from '../../shared/date/dia';
import { fusoDaObra, instanteAgora, type Fuso } from '../../shared/date/fuso';
import { soma, zero, type Quantidade } from '../../shared/decimal';
import {
  geraId,
  type LancamentoId,
  type ObraId,
  type ServicoControladoId,
  type UsuarioId,
} from '../../shared/id';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroConhecido,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import type {
  ComandoAtividade,
  ComandoConfirmarDia,
  ComandoCorrigir,
  ComandoEstadoDoDia,
  ComandoExcluir,
  ComandoFecharDia,
  ComandoObservacao,
  ComandoPluviometria,
  ComandoProducao,
  ComandoRetificar,
  ConteudoDeLancamento,
  ReferenciaDeServico,
  ReferenciaDeStatus,
} from './comandos';
import type {
  AcaoProtegida,
  PortasDoLancamento,
  ServicoControlado,
  StatusDeAtividade,
} from './portas';
import {
  avisosDaProducao,
  eDiaFechado,
  ERRO_DIA_FECHADO,
  ERRO_DIA_PARADO,
  ERRO_NAO_ENCONTRADO,
  ERRO_PARADO_COM_ATIVIDADE,
  ERRO_SEM_PERMISSAO,
  validaDataDeLancamento,
} from './regras';
import type { Colecao, RepositorioDeLancamento } from './repositorio';
import type {
  AtividadeDoDia,
  Ator,
  AtorNaObra,
  DiaDeObra,
  EstadoNaTela,
  LancamentoAceito,
  LinhaComum,
  LinhaDeAtividade,
  LinhaDeLancamento,
  LinhaDeObservacao,
  LinhaDePluviometria,
  LinhaDeProducao,
  NumeroDoRdo,
  ObservacaoDoDia,
  PluviometriaDoDia,
  PreenchimentoInicial,
  ProducaoPorServico,
  TipoDeLancamento,
  VersaoDeLancamento,
} from './tipos';
import { apenasVigentes, eVigente, vigenteDaCadeia } from './vigencia';

export interface DependenciasDeLancamento {
  readonly repositorio: RepositorioDeLancamento;
  readonly portas: PortasDoLancamento;
  /** Injetado: teste unitário não depende do relógio real. */
  readonly relogio: () => Date;
  readonly fuso?: Fuso;
}

type Escrita<T> = Promise<Result<T, ErroConhecido>>;
type Leitura<T> = Promise<Result<T, ErroDeDominio>>;

const ERRO_OBRA_SEM_PERIODO: ErroDeDominio = erroDeDominio(
  CODIGO_ERRO.NAO_ENCONTRADO,
  'Obra não encontrada ou sem período de contrato cadastrado.',
);

function colecaoDoTipo(
  repositorio: RepositorioDeLancamento,
  tipo: TipoDeLancamento,
): Colecao<LinhaDeLancamento> {
  switch (tipo) {
    case 'atividade':
      return repositorio.atividades;
    case 'producao':
      return repositorio.producao;
    case 'pluviometria':
      return repositorio.pluviometria;
    case 'observacao':
      return repositorio.observacoes;
  }
}

export function criaCasosDeLancamento(deps: DependenciasDeLancamento) {
  const { repositorio, portas, relogio } = deps;
  const fuso = deps.fuso ?? fusoDaObra();

  const agora = () => instanteAgora(relogio);

  function comum(
    obraId: ObraId,
    data: DiaPuro,
    autorId: UsuarioId,
    chaveDeRascunho: string | null,
  ): LinhaComum {
    const id = geraId<'lancamento'>();
    return {
      id,
      obraId,
      data,
      autorId,
      registradoEm: agora(),
      atualizadoPor: null,
      atualizadoEm: null,
      // A raiz é o próprio id no original: gravada no insert, nunca muda.
      raizId: id,
      retificaId: null,
      chaveDeRascunho,
    };
  }

  async function autoriza(
    ator: Ator,
    obraId: ObraId,
    acao: AcaoProtegida,
  ): Promise<Result<AtorNaObra, ErroConhecido>> {
    return portas.exigeAcessoNaObra(ator, obraId, acao);
  }

  /** Acesso, período da obra, validação da data e o dia atual, nesta ordem. */
  async function preparaEscrita(
    ator: Ator,
    obraId: ObraId,
    data: DiaPuro,
    acao: AcaoProtegida,
  ): Promise<
    Result<{ atorNaObra: AtorNaObra; diaAtual: DiaDeObra | null }, ErroConhecido>
  > {
    const acesso = await autoriza(ator, obraId, acao);
    if (!acesso.ok) return acesso;
    const periodo = await portas.periodoDaObra(obraId);
    if (periodo === null) return erro(ERRO_OBRA_SEM_PERIODO);
    const dataValida = validaDataDeLancamento(data, periodo, fuso, relogio);
    if (!dataValida.ok) return dataValida;
    const diaAtual = await repositorio.dia.obtem(obraId, data);
    return ok({ atorNaObra: acesso.valor, diaAtual });
  }

  /**
   * O primeiro lançamento do dia cria o dia como `trabalhado`, na mesma
   * transação (arquitetura, pergunta P2). Sem isso existiria o estado
   * impossível "tem atividade mas o dia é não lançado".
   */
  async function garanteDia(
    obraId: ObraId,
    data: DiaPuro,
    atorNaObra: AtorNaObra,
    diaAtual: DiaDeObra | null,
  ): Promise<DiaDeObra> {
    if (diaAtual !== null) return diaAtual;
    const novo: DiaDeObra = {
      obraId,
      data,
      estado: 'trabalhado',
      motivoParada: null,
      registradoPor: atorNaObra.usuarioId,
      registradoEm: agora(),
      atualizadoPor: null,
      atualizadoEm: null,
      fechadoPor: null,
      fechadoEm: null,
      numeroRdoCongelado: null,
    };
    await repositorio.dia.salva(novo);
    return novo;
  }

  async function resolveStatus(
    referencia: ReferenciaDeStatus,
  ): Promise<StatusDeAtividade | null> {
    return referencia.tipo === 'id'
      ? portas.status.porId(referencia.id)
      : portas.status.porTermo(referencia.termo);
  }

  async function resolveServico(
    obraId: ObraId,
    referencia: ReferenciaDeServico,
  ): Promise<ServicoControlado | null> {
    return referencia.tipo === 'id'
      ? portas.servicos.porId(obraId, referencia.id)
      : portas.servicos.porNome(obraId, referencia.nome);
  }

  async function temAtividade(obraId: ObraId, data: DiaPuro): Promise<boolean> {
    const linhas = await repositorio.atividades.doDia(obraId, data);
    return apenasVigentes(linhas).length > 0;
  }

  async function acumuladoDoServico(
    obraId: ObraId,
    data: DiaPuro,
    servicoId: ServicoControladoId,
  ): Promise<Quantidade> {
    const linhas = await repositorio.producao.ate(obraId, data);
    const vigentes = apenasVigentes(linhas).filter((l) => l.servicoId === servicoId);
    return soma(vigentes.map((l) => l.quantidade));
  }

  async function declaraEstadoDoDia(
    comando: ComandoEstadoDoDia,
    ator: Ator,
  ): Escrita<void> {
    const preparo = await preparaEscrita(ator, comando.obraId, comando.data, 'lancar');
    if (!preparo.ok) return preparo;
    const { atorNaObra, diaAtual } = preparo.valor;
    if (eDiaFechado(diaAtual)) return erro(ERRO_DIA_FECHADO);

    if (
      comando.estado === 'parado' &&
      (await temAtividade(comando.obraId, comando.data))
    ) {
      // Decisão 24.1: nada é apagado em silêncio para acomodar a troca.
      return erro(ERRO_PARADO_COM_ATIVIDADE);
    }

    const motivoParada = comando.estado === 'parado' ? comando.motivoParada : null;
    if (diaAtual === null) {
      await repositorio.dia.salva({
        obraId: comando.obraId,
        data: comando.data,
        estado: comando.estado,
        motivoParada,
        registradoPor: atorNaObra.usuarioId,
        registradoEm: agora(),
        atualizadoPor: null,
        atualizadoEm: null,
        fechadoPor: null,
        fechadoEm: null,
        numeroRdoCongelado: null,
      });
      return ok(undefined);
    }
    await repositorio.dia.salva({
      ...diaAtual,
      estado: comando.estado,
      motivoParada,
      atualizadoPor: atorNaObra.usuarioId,
      atualizadoEm: agora(),
    });
    return ok(undefined);
  }

  async function lancaAtividade(
    comando: ComandoAtividade,
    ator: Ator,
  ): Escrita<LancamentoAceito> {
    const preparo = await preparaEscrita(ator, comando.obraId, comando.data, 'lancar');
    if (!preparo.ok) return preparo;
    const { atorNaObra, diaAtual } = preparo.valor;
    if (eDiaFechado(diaAtual)) return erro(ERRO_DIA_FECHADO);
    // Decisão 4.3: rejeitado com mensagem, e o estado do dia NÃO muda.
    if (diaAtual !== null && diaAtual.estado === 'parado') return erro(ERRO_DIA_PARADO);

    if (comando.chaveDeRascunho !== null) {
      const jaEnviado = await repositorio.atividades.porRascunho(
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      );
      if (jaEnviado !== null) return ok({ id: jaEnviado.id, avisos: [] });
    }

    const status = await resolveStatus(comando.status);
    if (status === null) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'Status de atividade não encontrado no cadastro.',
        ),
      );
    }

    const linha: LinhaDeAtividade = {
      ...comum(
        comando.obraId,
        comando.data,
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      ),
      tipo: 'atividade',
      descricao: comando.descricao,
      statusId: status.id,
    };
    await repositorio.executaEmTransacao(async () => {
      await garanteDia(comando.obraId, comando.data, atorNaObra, diaAtual);
      await repositorio.atividades.grava(linha);
    });
    return ok({ id: linha.id, avisos: [] });
  }

  async function lancaProducao(
    comando: ComandoProducao,
    ator: Ator,
  ): Escrita<LancamentoAceito> {
    const preparo = await preparaEscrita(ator, comando.obraId, comando.data, 'lancar');
    if (!preparo.ok) return preparo;
    const { atorNaObra, diaAtual } = preparo.valor;
    if (eDiaFechado(diaAtual)) return erro(ERRO_DIA_FECHADO);

    if (comando.chaveDeRascunho !== null) {
      const jaEnviado = await repositorio.producao.porRascunho(
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      );
      if (jaEnviado !== null) return ok({ id: jaEnviado.id, avisos: [] });
    }

    const servico = await resolveServico(comando.obraId, comando.servico);
    if (servico === null) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'Serviço controlado não encontrado no cadastro desta obra.',
        ),
      );
    }

    const linha: LinhaDeProducao = {
      ...comum(
        comando.obraId,
        comando.data,
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      ),
      tipo: 'producao',
      servicoId: servico.id,
      quantidade: comando.quantidade,
    };
    const dia = await repositorio.executaEmTransacao(async () => {
      const diaGarantido = await garanteDia(
        comando.obraId,
        comando.data,
        atorNaObra,
        diaAtual,
      );
      await repositorio.producao.grava(linha);
      return diaGarantido;
    });

    // Decisão 12.1: produção em dia parado ou sem atividade é ACEITA e avisada.
    const diaEstaParado = dia.estado === 'parado';
    const avisos = avisosDaProducao({
      diaEstaParado,
      // Num dia parado a ausência de atividade é a regra, não o aviso.
      diaTemAtividade:
        diaEstaParado || (await temAtividade(comando.obraId, comando.data)),
      acumulado: await acumuladoDoServico(comando.obraId, comando.data, servico.id),
      quantidadeProjeto: servico.quantidadeProjeto,
    });
    return ok({ id: linha.id, avisos });
  }

  async function lancaPluviometria(
    comando: ComandoPluviometria,
    ator: Ator,
  ): Escrita<LancamentoAceito> {
    const preparo = await preparaEscrita(ator, comando.obraId, comando.data, 'lancar');
    if (!preparo.ok) return preparo;
    const { atorNaObra, diaAtual } = preparo.valor;
    if (eDiaFechado(diaAtual)) return erro(ERRO_DIA_FECHADO);

    if (comando.chaveDeRascunho !== null) {
      const jaEnviado = await repositorio.pluviometria.porRascunho(
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      );
      if (jaEnviado !== null) return ok({ id: jaEnviado.id, avisos: [] });
    }

    // Existe UMA cadeia de pluviometria por dia (índice único do esquema, 2.20):
    // relançar o dia aberto corrige a leitura, não cria uma segunda.
    const existente = vigenteDaCadeia(
      await repositorio.pluviometria.doDia(comando.obraId, comando.data),
    );
    if (existente !== null) {
      await repositorio.pluviometria.atualiza({
        ...existente,
        noiteAnterior: comando.noiteAnterior,
        manha: comando.manha,
        tarde: comando.tarde,
        indiceMm: comando.indiceMm,
        atualizadoPor: atorNaObra.usuarioId,
        atualizadoEm: agora(),
      });
      return ok({ id: existente.id, avisos: [] });
    }

    const linha: LinhaDePluviometria = {
      ...comum(
        comando.obraId,
        comando.data,
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      ),
      tipo: 'pluviometria',
      noiteAnterior: comando.noiteAnterior,
      manha: comando.manha,
      tarde: comando.tarde,
      indiceMm: comando.indiceMm,
    };
    await repositorio.executaEmTransacao(async () => {
      await garanteDia(comando.obraId, comando.data, atorNaObra, diaAtual);
      await repositorio.pluviometria.grava(linha);
    });
    return ok({ id: linha.id, avisos: [] });
  }

  async function lancaObservacao(
    comando: ComandoObservacao,
    ator: Ator,
  ): Escrita<LancamentoAceito> {
    const preparo = await preparaEscrita(ator, comando.obraId, comando.data, 'lancar');
    if (!preparo.ok) return preparo;
    const { atorNaObra, diaAtual } = preparo.valor;
    if (eDiaFechado(diaAtual)) return erro(ERRO_DIA_FECHADO);

    if (comando.chaveDeRascunho !== null) {
      const jaEnviado = await repositorio.observacoes.porRascunho(
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      );
      if (jaEnviado !== null) return ok({ id: jaEnviado.id, avisos: [] });
    }

    const linha: LinhaDeObservacao = {
      ...comum(
        comando.obraId,
        comando.data,
        atorNaObra.usuarioId,
        comando.chaveDeRascunho,
      ),
      tipo: 'observacao',
      lado: 'CROS',
      texto: comando.texto,
    };
    await repositorio.executaEmTransacao(async () => {
      await garanteDia(comando.obraId, comando.data, atorNaObra, diaAtual);
      await repositorio.observacoes.grava(linha);
    });
    return ok({ id: linha.id, avisos: [] });
  }

  /** Um toque: grava o estado do dia e, se houver, os turnos. */
  async function confirmaDia(comando: ComandoConfirmarDia, ator: Ator): Escrita<void> {
    const estado = await declaraEstadoDoDia(comando, ator);
    if (!estado.ok) return estado;
    if (comando.turnos === null) return ok(undefined);
    const pluviometria = await lancaPluviometria(
      {
        obraId: comando.obraId,
        data: comando.data,
        noiteAnterior: comando.turnos.noiteAnterior,
        manha: comando.turnos.manha,
        tarde: comando.turnos.tarde,
        indiceMm: comando.indiceMm ?? zero(),
        chaveDeRascunho: null,
      },
      ator,
    );
    if (!pluviometria.ok) return pluviometria;
    return ok(undefined);
  }

  async function aplicaConteudo(
    obraId: ObraId,
    linha: LinhaDeLancamento,
    conteudo: ConteudoDeLancamento,
  ): Promise<Result<LinhaDeLancamento, ErroConhecido>> {
    if (linha.tipo !== conteudo.tipo) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'O conteúdo enviado não corresponde ao tipo do lançamento.',
        ),
      );
    }
    if (linha.tipo === 'atividade' && conteudo.tipo === 'atividade') {
      const status = await resolveStatus(conteudo.status);
      if (status === null) {
        return erro(
          erroDeDominio(
            CODIGO_ERRO.NAO_ENCONTRADO,
            'Status de atividade não encontrado no cadastro.',
          ),
        );
      }
      return ok({ ...linha, descricao: conteudo.descricao, statusId: status.id });
    }
    if (linha.tipo === 'producao' && conteudo.tipo === 'producao') {
      const servico = await resolveServico(obraId, conteudo.servico);
      if (servico === null) {
        return erro(
          erroDeDominio(
            CODIGO_ERRO.NAO_ENCONTRADO,
            'Serviço controlado não encontrado no cadastro desta obra.',
          ),
        );
      }
      return ok({ ...linha, servicoId: servico.id, quantidade: conteudo.quantidade });
    }
    if (linha.tipo === 'pluviometria' && conteudo.tipo === 'pluviometria') {
      return ok({
        ...linha,
        noiteAnterior: conteudo.noiteAnterior,
        manha: conteudo.manha,
        tarde: conteudo.tarde,
        indiceMm: conteudo.indiceMm,
      });
    }
    if (linha.tipo === 'observacao' && conteudo.tipo === 'observacao') {
      return ok({ ...linha, texto: conteudo.texto });
    }
    return erro(ERRO_NAO_ENCONTRADO);
  }

  async function corrigeLancamento(comando: ComandoCorrigir, ator: Ator): Escrita<void> {
    const acesso = await autoriza(ator, comando.obraId, 'corrigir_lancamento');
    if (!acesso.ok) return acesso;
    const colecao = colecaoDoTipo(repositorio, comando.conteudo.tipo);
    const linha = await colecao.porId(comando.obraId, comando.lancamentoId);
    if (linha === null) return erro(ERRO_NAO_ENCONTRADO);
    const dia = await repositorio.dia.obtem(comando.obraId, linha.data);
    // R17: dia fechado não aceita alteração, por ninguém. Só retificação.
    if (eDiaFechado(dia)) return erro(ERRO_DIA_FECHADO);

    const atualizada = await aplicaConteudo(comando.obraId, linha, comando.conteudo);
    if (!atualizada.ok) return atualizada;
    await colecao.atualiza({
      ...atualizada.valor,
      atualizadoPor: acesso.valor.usuarioId,
      atualizadoEm: agora(),
    });
    return ok(undefined);
  }

  async function excluiLancamento(comando: ComandoExcluir, ator: Ator): Escrita<void> {
    const acesso = await autoriza(ator, comando.obraId, 'corrigir_lancamento');
    if (!acesso.ok) return acesso;
    const colecao = colecaoDoTipo(repositorio, comando.tipo);
    const linha = await colecao.porId(comando.obraId, comando.lancamentoId);
    if (linha === null) return erro(ERRO_NAO_ENCONTRADO);
    const dia = await repositorio.dia.obtem(comando.obraId, linha.data);
    if (eDiaFechado(dia)) return erro(ERRO_DIA_FECHADO);
    await colecao.exclui(comando.obraId, comando.lancamentoId);
    return ok(undefined);
  }

  async function fechaDia(comando: ComandoFecharDia, ator: Ator): Escrita<NumeroDoRdo> {
    const acesso = await autoriza(ator, comando.obraId, 'fechar_dia');
    if (!acesso.ok) return acesso;
    // Decisão 9.1: o engenheiro fecha o dia. Exportar o PDF não fecha.
    if (acesso.valor.perfil !== 'engenheiro') return erro(ERRO_SEM_PERMISSAO);
    const periodo = await portas.periodoDaObra(comando.obraId);
    if (periodo === null) return erro(ERRO_OBRA_SEM_PERIODO);
    const dataValida = validaDataDeLancamento(comando.data, periodo, fuso, relogio);
    if (!dataValida.ok) return dataValida;

    const dia = await repositorio.dia.obtem(comando.obraId, comando.data);
    if (dia === null) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'Não há lançamento neste dia para fechar.',
        ),
      );
    }
    if (eDiaFechado(dia)) {
      return erro(erroDeDominio(CODIGO_ERRO.DIA_FECHADO, 'O dia já está fechado.'));
    }

    // R4: o número do RDO é a diferença em dias corridos para o início do
    // contrato, e o primeiro dia é o RDO 0 (6.1). Ele é calculado enquanto o
    // dia está aberto e CONGELADO aqui (6.2): mudar a data de início da obra
    // não pode renumerar o que já foi entregue ao fiscal.
    const numero = diferencaEmDias(periodo.dataInicio, comando.data);
    await repositorio.dia.salva({
      ...dia,
      fechadoPor: acesso.valor.usuarioId,
      fechadoEm: agora(),
      numeroRdoCongelado: numero,
    });
    return ok(numero);
  }

  async function retificaLancamento(
    comando: ComandoRetificar,
    ator: Ator,
  ): Escrita<LancamentoId> {
    const acesso = await autoriza(ator, comando.obraId, 'retificar_lancamento');
    if (!acesso.ok) return acesso;
    // Decisão 22.1: só o engenheiro retifica, e retifica o lançamento de
    // QUALQUER autor, inclusive o dele. Ser o autor não dá direito.
    if (acesso.valor.perfil !== 'engenheiro') return erro(ERRO_SEM_PERMISSAO);

    const colecao = colecaoDoTipo(repositorio, comando.conteudo.tipo);
    const original = await colecao.porId(comando.obraId, comando.lancamentoId);
    if (original === null) return erro(ERRO_NAO_ENCONTRADO);
    const dia = await repositorio.dia.obtem(comando.obraId, original.data);
    if (!eDiaFechado(dia)) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.DIA_FECHADO,
          'O dia ainda está aberto: corrija o lançamento. Retificação é só depois do fechamento.',
        ),
      );
    }
    const cadeia = await colecao.cadeia(comando.obraId, original.raizId);
    if (!eVigente(original, cadeia)) {
      // A cadeia é linear: duas retificações do mesmo lançamento fariam "a
      // versão vigente" deixar de ter resposta única.
      return erro(
        erroDeDominio(
          CODIGO_ERRO.NAO_ENCONTRADO,
          'Este lançamento já foi retificado. Retifique a versão vigente.',
        ),
      );
    }

    const base: LinhaComum = {
      ...comum(comando.obraId, original.data, acesso.valor.usuarioId, null),
      raizId: original.raizId,
      retificaId: original.id,
    };
    const novaLinha = await aplicaConteudo(
      comando.obraId,
      { ...original, ...base },
      comando.conteudo,
    );
    if (!novaLinha.ok) return novaLinha;
    await colecao.grava({ ...novaLinha.valor, atualizadoPor: null, atualizadoEm: null });
    return ok(novaLinha.valor.id);
  }

  async function obtemDiaDeObra(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<DiaDeObra | null> {
    return ok(await repositorio.dia.obtem(obraId, data));
  }

  async function estadoNaTela(obraId: ObraId, data: DiaPuro): Leitura<EstadoNaTela> {
    const dia = await repositorio.dia.obtem(obraId, data);
    // Decisão 4.2: `não lançado` é a AUSÊNCIA de registro.
    return ok(dia === null ? 'nao_lancado' : dia.estado);
  }

  async function listaAtividadesVigentes(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<AtividadeDoDia[]> {
    const vigentes = apenasVigentes(await repositorio.atividades.doDia(obraId, data));
    const termos = new Map<string, string>();
    const atividades: AtividadeDoDia[] = [];
    for (const linha of vigentes) {
      let termo = termos.get(String(linha.statusId));
      if (termo === undefined) {
        const status = await portas.status.porId(linha.statusId);
        termo = status?.termo ?? '';
        termos.set(String(linha.statusId), termo);
      }
      atividades.push({
        id: linha.id,
        data: linha.data,
        descricao: linha.descricao,
        statusId: linha.statusId,
        statusTermo: termo,
      });
    }
    return ok(atividades);
  }

  async function obtemPluviometriaVigente(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<PluviometriaDoDia | null> {
    const linha = vigenteDaCadeia(await repositorio.pluviometria.doDia(obraId, data));
    if (linha === null) return ok(null);
    return ok({
      id: linha.id,
      data: linha.data,
      noiteAnterior: linha.noiteAnterior,
      manha: linha.manha,
      tarde: linha.tarde,
      indiceMm: linha.indiceMm,
    });
  }

  async function listaObservacoesVigentes(
    obraId: ObraId,
    data: DiaPuro,
    lado: 'CROS' | 'CONTRATANTE',
  ): Leitura<ObservacaoDoDia[]> {
    // Decisão 10.1: na v1 o lado do contratante existe no layout e sai vazio.
    if (lado === 'CONTRATANTE') return ok([]);
    const vigentes = apenasVigentes(await repositorio.observacoes.doDia(obraId, data));
    return ok(
      vigentes.map((l) => ({ id: l.id, data: l.data, lado: l.lado, texto: l.texto })),
    );
  }

  function agrupaPorServico(linhas: readonly LinhaDeProducao[]): ProducaoPorServico[] {
    const porServico = new Map<ServicoControladoId, Quantidade[]>();
    for (const linha of linhas) {
      const atual = porServico.get(linha.servicoId) ?? [];
      atual.push(linha.quantidade);
      porServico.set(linha.servicoId, atual);
    }
    return [...porServico.entries()].map(([servicoId, quantidades]) => ({
      servicoId,
      quantidade: soma(quantidades),
    }));
  }

  async function somaProducaoDoDia(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<ProducaoPorServico[]> {
    return ok(
      agrupaPorServico(apenasVigentes(await repositorio.producao.doDia(obraId, data))),
    );
  }

  async function somaProducaoAte(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<ProducaoPorServico[]> {
    // Recalculado do zero: corrigir março corrige setembro sozinho.
    return ok(
      agrupaPorServico(apenasVigentes(await repositorio.producao.ate(obraId, data))),
    );
  }

  async function listaHistoricoDoLancamento(
    obraId: ObraId,
    tipo: TipoDeLancamento,
    lancamentoId: LancamentoId,
  ): Leitura<VersaoDeLancamento[]> {
    const colecao = colecaoDoTipo(repositorio, tipo);
    const linha = await colecao.porId(obraId, lancamentoId);
    if (linha === null) return erro(ERRO_NAO_ENCONTRADO);
    const cadeia = [...(await colecao.cadeia(obraId, linha.raizId))].sort((a, b) =>
      a.registradoEm < b.registradoEm ? -1 : 1,
    );
    return ok(
      cadeia.map((versao) => ({
        id: versao.id,
        retificaId: versao.retificaId,
        autorId: versao.autorId,
        registradoEm: versao.registradoEm,
        vigente: eVigente(versao, cadeia),
        conteudo: versao,
      })),
    );
  }

  /**
   * Decisão 15.1: vem o estado do dia e os turnos do dia anterior, e mais nada.
   *
   * O motivo da parada NÃO é herdado: "Domingo" numa segunda-feira seria um
   * motivo falso confirmado sem leitura. Atividade também não, pela mesma razão.
   */
  async function obtemPreenchimentoInicial(
    obraId: ObraId,
    data: DiaPuro,
  ): Leitura<PreenchimentoInicial> {
    const dia = await repositorio.dia.obtem(obraId, data);
    const anterior = await repositorio.dia.obtem(obraId, somaDias(data, -1));
    const pluviometriaAnterior = vigenteDaCadeia(
      await repositorio.pluviometria.doDia(obraId, somaDias(data, -1)),
    );
    return ok({
      data,
      estadoNaTela: dia === null ? 'nao_lancado' : dia.estado,
      estadoSugerido: anterior?.estado ?? null,
      turnosSugeridos:
        pluviometriaAnterior === null
          ? null
          : {
              noiteAnterior: pluviometriaAnterior.noiteAnterior,
              manha: pluviometriaAnterior.manha,
              tarde: pluviometriaAnterior.tarde,
            },
      indiceMm: null,
      atividadesSugeridas: [],
      eDiaFechado: eDiaFechado(dia),
    });
  }

  return {
    declaraEstadoDoDia,
    confirmaDia,
    lancaAtividade,
    lancaProducao,
    lancaPluviometria,
    lancaObservacao,
    corrigeLancamento,
    excluiLancamento,
    fechaDia,
    retificaLancamento,
    obtemDiaDeObra,
    estadoNaTela,
    listaAtividadesVigentes,
    obtemPluviometriaVigente,
    listaObservacoesVigentes,
    somaProducaoDoDia,
    somaProducaoAte,
    listaHistoricoDoLancamento,
    obtemPreenchimentoInicial,
  };
}

export type CasosDeLancamento = ReturnType<typeof criaCasosDeLancamento>;
