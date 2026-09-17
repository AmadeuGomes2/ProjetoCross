/**
 * O consolidado de período em PDF.
 *
 * **Os mesmos 11 blocos do gabarito, na mesma ordem**, que é a ordem em que o
 * fiscal lê. O que muda é o conteúdo de cinco deles, e cada mudança foi
 * aprovada por quem responde pelo produto em 17/09/2026, respondendo A1 a A5 de
 * `docs/arquitetura/periodo.md`, seção 6:
 *
 * 1. `RDO Nº` recebe **a lista** dos números, `209, 212, 216`, nunca uma faixa;
 * 2. o campo da data recebe a faixa `02/09/2026 a 09/09/2026`, sem rótulo novo;
 * 3. o campo herdado `DIA` recebe a quantidade de dias, `6 dias`;
 * 4. a pluviometria troca os três turnos por quatro contadores de dias;
 * 5. os dois títulos de efetivo ganham `· MÉDIA POR DIA`, depois do rótulo
 *    herdado inteiro.
 *
 * Tudo o mais é herdado e não muda, erros de ortografia inclusive.
 *
 * Como no diário, cada bloco é uma **função chamada diretamente**, e não um
 * componente usado como `<Bloco />`: assim a árvore que o teste de fidelidade lê
 * é a mesma que vira papel (`../../teste/arvore.ts`).
 *
 * **Duplicação declarada, não escondida:** os blocos 3, 4 e 11 são iguais aos do
 * diário. Reaproveitá-los exigiria exportá-los de
 * `../../documento/documento-rdo.tsx`, que é arquivo do diário já entregue e
 * conferido, e o contrato proíbe editá-lo (seção 6.3). A unificação é possível e
 * fica como pendência para quem puder tocar os dois lados.
 */

import type { ReactElement } from 'react';
import { type DocumentProps, Page, Text, View } from '@react-pdf/renderer';

import { estilos } from '../../documento/estilos';
import '../../documento/hifenizacao';
import { ROTULO, ROTULO_DE_PERIODO } from '../../documento/rotulos';
import type { CelulaDeEfetivo } from '../../portas';
import type {
  GrupoDeAtividadesNoPapel,
  GrupoDeComentariosNoPapel,
  RdoDePeriodoParaDocumento,
} from '../portas';
import { envolveEmDocumento } from './envelope';
import { estilosDePeriodo } from './estilos-de-periodo';

function campo(rotulo: string, valor: string): ReactElement {
  return (
    <View style={estilos.linhaDeCampo} key={rotulo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

/**
 * `6 dias`, e `1 dia` quando o conjunto tem um dia só.
 *
 * O singular não é capricho: exportar um dia isolado é o caso mais comum depois
 * do mês fechado, e `1 dias` aparece no campo que o fiscal lê primeiro.
 */
export function textoDaQuantidadeDeDias(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'dia' : 'dias'}`;
}

/** A lista dos números de RDO: `209, 212, 216`. Nunca faixa. */
export function textoDosNumerosDoRdo(numeros: readonly number[]): string {
  return numeros.join(', ');
}

function blocoIdentificacao(rdo: RdoDePeriodoParaDocumento): ReactElement {
  const identificacao = rdo.identificacao;
  return (
    <View style={estilos.identificacao}>
      <View style={estilos.campoDeIdentificacao}>
        <Text>{identificacao.data}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text style={estilos.rotuloDeAssinatura}>{ROTULO_DE_PERIODO.DIA}</Text>
        <Text>{textoDaQuantidadeDeDias(identificacao.quantidadeDeDias)}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text style={estilos.rotuloDeAssinatura}>{ROTULO.BMS}</Text>
        <Text>{identificacao.bms}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text style={estilos.rotuloDeAssinatura}>{ROTULO.NUMERO_DO_RDO}</Text>
        <Text>{textoDosNumerosDoRdo(identificacao.numerosDoRdo)}</Text>
      </View>
    </View>
  );
}

/**
 * Título e identificação presos ao alto de **toda** página.
 *
 * O consolidado não tem orçamento de linhas: ele carrega os dias todos e deixa
 * o renderizador quebrar a página. Por isso o cabeçalho é `fixed` — a folha que
 * o renderizador criar sozinho chega ao fiscal sabendo de que período ela é.
 */
function cabecalhoDaPagina(rdo: RdoDePeriodoParaDocumento): ReactElement {
  return (
    <View fixed>
      <Text style={estilos.titulo}>{ROTULO.TITULO}</Text>
      {blocoIdentificacao(rdo)}
    </View>
  );
}

function blocoInformacoesGerais(rdo: RdoDePeriodoParaDocumento): ReactElement {
  const dados = rdo.informacoesGerais;
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{ROTULO.INFORMACOES_GERAIS}</Text>
      {campo(ROTULO.CONTRATO, dados.contrato)}
      {campo(ROTULO.DATA_INICIO, dados.dataInicio)}
      {campo(ROTULO.DATA_FINAL, dados.dataFinal)}
      {campo(ROTULO.CONTRATANTE, dados.contratante)}
      {campo(ROTULO.CONTRATADA, dados.contratada)}
      {campo(ROTULO.ESCOPO, dados.escopo)}
    </View>
  );
}

function blocoCaracteristicas(rdo: RdoDePeriodoParaDocumento): ReactElement {
  const dados = rdo.caracteristicas;
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{ROTULO.CARACTERISTICAS}</Text>
      {campo(ROTULO.NOME, dados.nome)}
      {campo(ROTULO.AREA, dados.area)}
      {campo(ROTULO.LOCAL, dados.local)}
    </View>
  );
}

function colunaDeEfetivo(celula: CelulaDeEfetivo): ReactElement {
  return (
    <View style={estilos.colunaDeEfetivo} key={celula.chave}>
      <Text style={estilos.rotuloDaColuna}>{celula.rotulo}</Text>
      {/* Média zero é exibida em branco, como a contagem zero do gabarito. */}
      <Text style={estilos.quantidadeDaColuna}>{celula.quantidade}</Text>
    </View>
  );
}

function blocoDeEfetivo(
  cabecalho: string,
  celulas: readonly CelulaDeEfetivo[],
  total: string,
): ReactElement {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{cabecalho}</Text>
      <View style={estilos.colunasDeEfetivo}>
        {celulas.map(colunaDeEfetivo)}
        <View style={estilos.colunaDeEfetivo} key="total">
          <Text style={estilos.rotuloDaColuna}>{ROTULO.TOTAL}</Text>
          <Text style={estilos.quantidadeDaColuna}>{total}</Text>
        </View>
      </View>
    </View>
  );
}

function blocoDeProducao(rdo: RdoDePeriodoParaDocumento): ReactElement {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{ROTULO.PRODUCAO_CONTROLADA}</Text>
      <View style={estilos.linhaDeTabela}>
        <Text style={estilos.celulaServico}>{ROTULO.SERVICO}</Text>
        <Text style={estilos.celulaNumero}>{ROTULO.EXEC}</Text>
        <Text style={estilos.celulaNumero}>{ROTULO.ACUM}</Text>
        <Text style={estilos.celulaNumero}>{ROTULO.PROJETO}</Text>
        <View style={estilos.celulaBarra} />
      </View>
      {rdo.producao.map((linha) => (
        <View style={estilos.linhaDeTabela} key={linha.chave}>
          <Text style={estilos.celulaServico}>{linha.servico}</Text>
          <Text style={estilos.celulaNumero}>{linha.exec}</Text>
          <Text style={estilos.celulaNumero}>{linha.acum}</Text>
          <Text style={estilos.celulaNumero}>{linha.projeto}</Text>
          {/* Trilho e barra antes do número: o gabarito quer o número sobre a barra. */}
          <View style={estilos.celulaBarra}>
            <View style={estilos.trilhoDaBarra} />
            <View
              style={{
                ...estilos.barra,
                width: `${Math.round(Math.min(Math.max(linha.fracao, 0), 1) * 100)}%`,
              }}
            />
            <Text style={estilos.percentualSobreABarra}>{linha.percentual}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function linhaDeData(chave: string, data: string): ReactElement {
  return (
    <View style={estilosDePeriodo.linhaDeData} key={`data-${chave}`}>
      <Text style={estilosDePeriodo.data}>{data}</Text>
    </View>
  );
}

/**
 * As atividades, agrupadas por data.
 *
 * O dia **não lançado** aparece com a data e sem linha nenhuma: o grupo vazio
 * não some da lista (contrato, 2.5). Sumir seria corte silencioso, e quem lê
 * deduziria o buraco na sequência — ou não o notaria.
 *
 * O que se escreve na linha de um dia não lançado é decisão do dono do produto
 * ainda em aberto (A5); enquanto não vier, o documento imprime o que a projeção
 * mandar, e não inventa vocabulário.
 */
function blocoDeAtividades(grupos: readonly GrupoDeAtividadesNoPapel[]): ReactElement {
  return (
    <View style={estilos.bloco}>
      <View style={estilos.linhaDeTabela}>
        <Text style={estilos.celulaDescricao}>{ROTULO.ATIVIDADES}</Text>
        <Text style={estilos.celulaStatus}>{ROTULO.STATUS}</Text>
      </View>
      {grupos.map((grupo) => (
        <View key={grupo.chave}>
          {linhaDeData(grupo.chave, grupo.data)}
          {grupo.linhas.map((linha) => (
            <View style={estilos.linhaDeTabela} key={linha.chave}>
              <Text style={estilos.celulaDescricao}>{linha.descricao}</Text>
              <Text style={estilos.celulaStatus}>{linha.status}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Pluviometria do período.
 *
 * Os quatro contadores ocupam as linhas em que o diário imprime os três turnos,
 * e `INDICE` continua embaixo, que é onde o fiscal o procura. Contador zerado
 * imprime `0`: "zero em branco" é regra do efetivo, não de contagem de dias.
 */
function blocoDePluviometria(rdo: RdoDePeriodoParaDocumento): ReactElement {
  const dados = rdo.pluviometria;
  const linha = (rotulo: string, valor: string): ReactElement => (
    <View style={estilos.linhaDePluviometria} key={rotulo}>
      <Text style={estilos.rotuloDePluviometria}>{rotulo}</Text>
      <Text style={estilos.valorDePluviometria}>{valor}</Text>
    </View>
  );
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{ROTULO.PLUVIOMETRIA}</Text>
      {linha(ROTULO_DE_PERIODO.DIAS_BONS, String(dados.diasBons))}
      {linha(ROTULO_DE_PERIODO.DIAS_CHUVOSOS, String(dados.diasChuvosos))}
      {linha(ROTULO_DE_PERIODO.DIAS_IMPRATICAVEIS, String(dados.diasImpraticaveis))}
      {linha(ROTULO_DE_PERIODO.DIAS_PARADOS, String(dados.diasParados))}
      {linha(ROTULO.INDICE, dados.indice)}
    </View>
  );
}

function blocoDeComentarios(grupos: readonly GrupoDeComentariosNoPapel[]): ReactElement {
  return (
    // Cada coluna carrega o próprio rótulo e o próprio conteúdo: é assim que a
    // fonte de um bloco não alcança o outro. Na planilha, o quadro rotulado
    // COMENTÁRIOS CROS lê a aba do contratante, e reproduzir isso seria falha
    // de fidelidade, não fidelidade (R12).
    <View style={estilos.bloco}>
      <View style={estilos.cabecalhoDuplo}>
        <View style={estilos.metadeEsquerda}>
          <Text style={estilos.cabecalhoDeBloco}>{ROTULO.COMENTARIOS_CROS}</Text>
          <View style={estilos.colunaDeComentario}>
            {grupos.map((grupo) => (
              <View key={grupo.chave}>
                <Text style={estilosDePeriodo.data}>{grupo.data}</Text>
                {grupo.linhas.map((texto, indice) => (
                  <Text key={`${grupo.chave}-${indice}-${texto}`}>{texto}</Text>
                ))}
              </View>
            ))}
          </View>
        </View>
        {/* Decisão 10.1: o bloco do contratante aparece e sai sempre vazio. */}
        <View style={estilos.metadeDireita}>
          <Text style={estilos.cabecalhoDeBloco}>{ROTULO.COMENTARIO_CONTRATANTE}</Text>
          <View style={estilos.colunaDeComentario} />
        </View>
      </View>
    </View>
  );
}

function blocoDeAssinaturas(rdo: RdoDePeriodoParaDocumento): ReactElement {
  const responsavel = rdo.responsavelTecnico;
  return (
    <View style={estilos.assinaturas}>
      <View style={estilos.assinatura}>
        {responsavel === null ? null : (
          <View style={estilos.dadosDoResponsavel}>
            <Text>{responsavel.nome}</Text>
            <Text>{responsavel.titulo}</Text>
            <Text>{responsavel.registro}</Text>
          </View>
        )}
        <View style={estilos.linhaDeAssinatura}>
          <Text style={estilos.rotuloDeAssinatura}>{ROTULO.REPRESENTANTE_CROS}</Text>
        </View>
      </View>
      <View style={estilos.assinatura}>
        <View style={estilos.linhaDeAssinatura}>
          <Text style={estilos.rotuloDeAssinatura}>
            {ROTULO.REPRESENTANTE_CONTRATANTE}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** A página do consolidado, para o pacote montar junto com os diários. */
export function paginaDoConsolidado(rdo: RdoDePeriodoParaDocumento): ReactElement {
  return (
    <Page size="A4" orientation="portrait" style={estilos.pagina} key="consolidado">
      {cabecalhoDaPagina(rdo)}
      {blocoInformacoesGerais(rdo)}
      {blocoCaracteristicas(rdo)}
      {blocoDeEfetivo(
        ROTULO_DE_PERIODO.EFETIVO_PESSOAL_MEDIA,
        rdo.efetivoPessoal.colunas,
        rdo.efetivoPessoal.total,
      )}
      {blocoDeEfetivo(
        ROTULO_DE_PERIODO.EFETIVO_EQUIPAMENTOS_MEDIA,
        rdo.efetivoEquipamentos.colunas,
        rdo.efetivoEquipamentos.total,
      )}
      {blocoDeProducao(rdo)}
      {blocoDeAtividades(rdo.atividades)}
      {blocoDePluviometria(rdo)}
      {blocoDeComentarios(rdo.comentariosCros)}
      {blocoDeAssinaturas(rdo)}
    </Page>
  );
}

/** O título do arquivo: datas e nada mais. Nunca nome de pessoa. */
export function tituloDoConsolidado(rdo: RdoDePeriodoParaDocumento): string {
  return `RDO ${rdo.identificacao.data}`;
}

export function montaDocumentoDoConsolidado(
  rdo: RdoDePeriodoParaDocumento,
): ReactElement<DocumentProps> {
  return envolveEmDocumento(tituloDoConsolidado(rdo), rdo.informacoesGerais.contrato, [
    paginaDoConsolidado(rdo),
  ]);
}
