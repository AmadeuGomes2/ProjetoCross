/**
 * O RDO diário em PDF.
 *
 * Os 11 blocos do gabarito, nesta ordem, que é a ordem em que o fiscal lê:
 * título · identificação · informações gerais · características do projeto ·
 * efetivo pessoal · efetivo equipamentos · produção controlada · atividades ·
 * pluviometria · comentários · assinaturas.
 *
 * Cada bloco é uma **função chamada diretamente**, e não um componente usado
 * como `<Bloco />`. É de propósito: assim a árvore que o teste de fidelidade lê
 * é a mesma árvore que vira papel, sem passar por renderização. Ver
 * `teste/arvore.ts`.
 *
 * O documento só recebe texto pronto (`RdoParaDocumento`). Nenhuma decisão de
 * formatação acontece aqui, e nenhum cálculo: o que não chegou não se imprime,
 * o que chegou se imprime como veio.
 */

import type { ReactElement } from 'react';
import {
  Document,
  type DocumentProps,
  Image,
  Page,
  Text,
  View,
} from '@react-pdf/renderer';

import type {
  CelulaDeEfetivo,
  LinhaDeAtividadeNoPapel,
  RdoParaDocumento,
} from '../portas';
import { estilos } from './estilos';
import './hifenizacao';
import { AUTOR_DO_PDF, PRODUTOR_DO_PDF, ROTULO } from './rotulos';

function campo(rotulo: string, valor: string): ReactElement {
  return (
    <View style={estilos.linhaDeCampo} key={rotulo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.valor}>{valor}</Text>
    </View>
  );
}

/**
 * Título, com a logo da contratada à esquerda quando a obra tem uma.
 *
 * A logo é acréscimo ao gabarito, pedido pelo dono do produto em 17/09/2026 —
 * registrado em `docs/decisoes-do-rdo.md`, seção "A logo da contratada".
 * Entra **ao lado** do título, e não no lugar dele: `RELATÓRIO DIÁRIO DE OBRAS`
 * é o que o fiscal procura primeiro na folha, e ele continua centralizado na
 * largura da página.
 *
 * Sem logo, a árvore é a mesma de antes — um `Text` e nada mais. O documento de
 * quem não subiu imagem nenhuma não muda em um ponto sequer.
 */
function blocoTitulo(logo: string | null): ReactElement {
  if (logo === null) return <Text style={estilos.titulo}>{ROTULO.TITULO}</Text>;

  return (
    <View style={estilos.faixaDoTitulo}>
      {/*
        `jsx-a11y/alt-text` acha que este é o `<img>` do HTML. Não é: é o
        `Image` do `@react-pdf/renderer`, que desenha num PDF e não tem atributo
        `alt` — PDF descreve imagem por `/Alt` na árvore de estrutura, que este
        renderizador não expõe. A regra não se aplica, e silenciá-la aqui é mais
        honesto que inventar uma prop que o componente ignora.
      */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image src={logo} style={estilos.logo} />
      <Text style={estilos.titulo}>{ROTULO.TITULO}</Text>
      {/* Espelho da logo, sem desenhar nada: mantém o título no centro da
          página em vez de empurrá-lo para a direita. */}
      <View style={estilos.logo} />
    </View>
  );
}

function blocoIdentificacao(rdo: RdoParaDocumento): ReactElement {
  return (
    <View style={estilos.identificacao}>
      <View style={estilos.campoDeIdentificacao}>
        <Text>{rdo.identificacao.data}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text>{rdo.identificacao.diaDaSemana}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text style={estilos.rotuloDeAssinatura}>{ROTULO.BMS}</Text>
        <Text>{rdo.identificacao.bms}</Text>
      </View>
      <View style={estilos.campoDeIdentificacao}>
        <Text style={estilos.rotuloDeAssinatura}>{ROTULO.NUMERO_DO_RDO}</Text>
        <Text>{String(rdo.identificacao.numeroDoRdo)}</Text>
      </View>
    </View>
  );
}

/**
 * Título, identificação e a marca de continuação, presos ao alto de **toda**
 * página.
 *
 * Decisão 11.1: a página que nasce do transbordo traz o mesmo cabeçalho de
 * identificação. `fixed` faz isso valer inclusive para a página que o
 * renderizador criar por conta própria, se algum dia o volume passar do que o
 * papel aguenta: o fiscal nunca recebe folha solta sem saber de que dia ela é.
 * A marca sai só a partir da segunda página, e por isso depende do número da
 * página, que só existe na hora de paginar.
 */
function cabecalhoDaPagina(rdo: RdoParaDocumento): ReactElement {
  return (
    <View fixed>
      {blocoTitulo(rdo.logo)}
      {blocoIdentificacao(rdo)}
      <Text
        style={estilos.marcaDeContinuacao}
        render={({ pageNumber }): string => (pageNumber > 1 ? ROTULO.CONTINUACAO : '')}
      />
    </View>
  );
}

function blocoInformacoesGerais(rdo: RdoParaDocumento): ReactElement {
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

function blocoCaracteristicas(rdo: RdoParaDocumento): ReactElement {
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
      {/* Gabarito, bloco 5: quantidade zero é exibida em branco, não como 0. */}
      <Text style={estilos.quantidadeDaColuna}>{celula.quantidade}</Text>
    </View>
  );
}

function blocoDeEfetivo(
  cabecalho: string,
  celulas: readonly CelulaDeEfetivo[],
  total: string | null,
): ReactElement {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.cabecalhoDeBloco}>{cabecalho}</Text>
      <View style={estilos.colunasDeEfetivo}>
        {celulas.map(colunaDeEfetivo)}
        {total === null ? null : (
          <View style={estilos.colunaDeEfetivo} key="total">
            <Text style={estilos.rotuloDaColuna}>{ROTULO.TOTAL}</Text>
            <Text style={estilos.quantidadeDaColuna}>{total}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function blocoDeProducao(rdo: RdoParaDocumento): ReactElement {
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
          {/*
            Trilho e barra vêm antes do número de propósito: o que é pintado
            depois fica por cima, e o gabarito quer o número **sobre** a barra,
            como o Excel desenha a barra de dados da célula.
          */}
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

function blocoDeAtividades(linhas: readonly LinhaDeAtividadeNoPapel[]): ReactElement {
  return (
    <View style={estilos.bloco}>
      <View style={estilos.linhaDeTabela}>
        <Text style={estilos.celulaDescricao}>{ROTULO.ATIVIDADES}</Text>
        <Text style={estilos.celulaStatus}>{ROTULO.STATUS}</Text>
      </View>
      {linhas.map((linha) => (
        <View style={estilos.linhaDeTabela} key={linha.chave}>
          <Text style={estilos.celulaDescricao}>{linha.descricao}</Text>
          <Text style={estilos.celulaStatus}>{linha.status}</Text>
        </View>
      ))}
    </View>
  );
}

function blocoDePluviometria(rdo: RdoParaDocumento): ReactElement {
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
      {linha(ROTULO.NOITE_ANTERIOR, dados.noiteAnterior)}
      {linha(ROTULO.MANHA, dados.manha)}
      {linha(ROTULO.TARDE, dados.tarde)}
      {linha(ROTULO.INDICE, dados.indice)}
    </View>
  );
}

function blocoDeComentarios(
  linhas: readonly string[],
  comContratante: boolean,
): ReactElement {
  return (
    // Cada coluna carrega o próprio rótulo e o próprio conteúdo, e é por isso
    // que a fonte de um bloco não alcança o outro. Na planilha, `01!F52` rotula
    // COMENTÁRIOS CROS e lê a aba do contratante; reproduzir esse defeito seria
    // falha de fidelidade, não fidelidade (R12).
    <View style={estilos.bloco}>
      <View style={estilos.cabecalhoDuplo}>
        <View style={comContratante ? estilos.metadeEsquerda : estilos.larguraInteira}>
          <Text style={estilos.cabecalhoDeBloco}>{ROTULO.COMENTARIOS_CROS}</Text>
          <View style={estilos.colunaDeComentario}>
            {linhas.map((texto, indice) => (
              <Text key={`${indice}-${texto}`}>{texto}</Text>
            ))}
          </View>
        </View>
        {/*
          Decisão 10.1: o bloco do contratante aparece e sai sempre vazio — uma
          vez por RDO, na página 1. Repetir o quadro vazio na continuação daria
          ao documento dois blocos 10, que o gabarito não tem.
        */}
        {comContratante ? (
          <View style={estilos.metadeDireita}>
            <Text style={estilos.cabecalhoDeBloco}>{ROTULO.COMENTARIO_CONTRATANTE}</Text>
            <View style={estilos.colunaDeComentario} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function blocoDeAssinaturas(rdo: RdoParaDocumento): ReactElement {
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

function paginaDeContinuacao(rdo: RdoParaDocumento): ReactElement {
  const efetivo = rdo.efetivoPessoal.continuacao;
  const equipamentos = rdo.efetivoEquipamentos.continuacao;
  const atividades = rdo.atividades.continuacao;
  const comentarios = rdo.comentariosCros.continuacao;

  return (
    <Page size="A4" orientation="portrait" style={estilos.pagina} key="continuacao">
      {cabecalhoDaPagina(rdo)}
      {efetivo.length === 0
        ? null
        : blocoDeEfetivo(ROTULO.EFETIVO_PESSOAL, efetivo, null)}
      {equipamentos.length === 0
        ? null
        : blocoDeEfetivo(ROTULO.EFETIVO_EQUIPAMENTOS, equipamentos, null)}
      {atividades.length === 0 ? null : blocoDeAtividades(atividades)}
      {comentarios.length === 0 ? null : blocoDeComentarios(comentarios, false)}
    </Page>
  );
}

export function montaDocumentoDoRdo(rdo: RdoParaDocumento): ReactElement<DocumentProps> {
  return (
    <Document
      title={`RDO ${rdo.identificacao.numeroDoRdo} — ${rdo.identificacao.data}`}
      author={AUTOR_DO_PDF}
      subject={rdo.informacoesGerais.contrato}
      keywords=""
      creator={AUTOR_DO_PDF}
      producer={PRODUTOR_DO_PDF}
      language="pt-BR"
    >
      <Page size="A4" orientation="portrait" style={estilos.pagina}>
        {cabecalhoDaPagina(rdo)}
        {blocoInformacoesGerais(rdo)}
        {blocoCaracteristicas(rdo)}
        {blocoDeEfetivo(
          ROTULO.EFETIVO_PESSOAL,
          rdo.efetivoPessoal.pagina1,
          rdo.efetivoPessoal.total,
        )}
        {blocoDeEfetivo(
          ROTULO.EFETIVO_EQUIPAMENTOS,
          rdo.efetivoEquipamentos.pagina1,
          rdo.efetivoEquipamentos.total,
        )}
        {blocoDeProducao(rdo)}
        {blocoDeAtividades(rdo.atividades.pagina1)}
        {blocoDePluviometria(rdo)}
        {blocoDeComentarios(rdo.comentariosCros.pagina1, true)}
        {blocoDeAssinaturas(rdo)}
      </Page>
      {rdo.temContinuacao ? paginaDeContinuacao(rdo) : null}
    </Document>
  );
}
