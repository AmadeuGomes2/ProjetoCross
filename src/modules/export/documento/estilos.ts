/**
 * Estilos do RDO em A4 retrato.
 *
 * O gabarito é uma planilha impressa: quadro fechado, régua fina, tudo em caixa
 * alta nos rótulos. Fonte, espessura de borda e alinhamento fino são
 * `OBSERVAÇÃO` na tabela de gravidade da skill `fidelidade-documento` — o que
 * é crítico é bloco, ordem, rótulo, unidade e total, e isso está no componente,
 * não aqui.
 */

import { StyleSheet } from '@react-pdf/renderer';

export const BORDA = '0.5pt solid #000';

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    fontSize: 7,
    fontFamily: 'Helvetica',
  },
  titulo: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginBottom: 4,
    // Cresce para ocupar o meio da faixa; sem logo o estilo é usado sozinho e
    // `flexGrow` não muda nada, porque não há irmão para dividir espaço.
    flexGrow: 1,
  },
  /** A faixa do título quando há logo: imagem, título ao centro, vazio igual. */
  faixaDoTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  /**
   * A caixa da logo. `objectFit: contain` porque a marca chega em qualquer
   * proporção, e esticar a marca de uma empresa é defeito, não adaptação.
   */
  logo: { width: 48, height: 32, objectFit: 'contain' },
  identificacao: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  campoDeIdentificacao: { flexDirection: 'row', gap: 3, border: BORDA, padding: 2 },
  bloco: { marginTop: 4, border: BORDA },
  cabecalhoDeBloco: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
    borderBottom: BORDA,
    paddingVertical: 2,
  },
  cabecalhoDuplo: { flexDirection: 'row', borderBottom: BORDA },
  metadeEsquerda: { flex: 1, borderRight: BORDA },
  /**
   * 132pt porque `COMENTÁRIO CONTRATANTE` mede 117,8pt em `Helvetica-Bold` 8.
   * Com os 110pt antigos o rótulo não cabia e saía em duas linhas mesmo sem
   * hifenização. Encurtar o rótulo não é opção: a grafia é do gabarito.
   */
  metadeDireita: { width: 132 },
  /** Sem o contratante ao lado, o bloco 10 ocupa a largura toda. */
  larguraInteira: { flex: 1 },
  linhaDeCampo: { flexDirection: 'row', paddingVertical: 1, paddingHorizontal: 3 },
  rotulo: { fontFamily: 'Helvetica-Bold', width: 70 },
  valor: { flex: 1 },
  colunasDeEfetivo: { flexDirection: 'row', flexWrap: 'wrap' },
  /**
   * 37pt é largura calculada, não gosto. A área útil da A4 retrato com as
   * margens desta folha é 559,28pt, e o bloco 5 precisa caber **41 colunas mais
   * a do TOTAL** — 42 células — em três faixas, que é o que sobra de altura
   * depois dos outros dez blocos. 559,28 / 37 = 15 células por faixa, e
   * 42 / 15 = 3 faixas. Com os 40pt antigos cabiam 13 por faixa, davam 4
   * faixas, e o limite de 41 que o layout promete estourava o papel: o
   * renderizador quebrava sozinho e jogava as assinaturas numa folha sem
   * identificação. Ver `docs/fidelidade/2026-09-16-rdo-diario.md`, CRÍTICO 1.
   */
  colunaDeEfetivo: {
    width: 37,
    borderRight: BORDA,
    borderBottom: BORDA,
    alignItems: 'center',
  },
  rotuloDaColuna: { fontSize: 5, textAlign: 'center', paddingVertical: 1 },
  quantidadeDaColuna: { fontSize: 7, textAlign: 'center', paddingVertical: 1 },
  linhaDeTabela: { flexDirection: 'row', borderBottom: BORDA },
  celulaServico: { flex: 1, padding: 2 },
  celulaNumero: { width: 55, padding: 2, textAlign: 'right', borderLeft: BORDA },
  /**
   * A barra fica **atrás** do número, não embaixo dele: conferido no XML da
   * planilha em 16/09/2026, a regra de barra de dados não traz `showValue="0"`,
   * e o Excel desenha barra e valor no mesmo espaço da célula. Daí o trilho e a
   * barra serem absolutos, pintados antes do texto, que fica por cima.
   */
  celulaBarra: { width: 70, padding: 2, borderLeft: BORDA, justifyContent: 'center' },
  trilhoDaBarra: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: '#e6e6e6',
  },
  barra: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    backgroundColor: '#767171',
  },
  percentualSobreABarra: { textAlign: 'right' },
  celulaDescricao: { flex: 1, padding: 2, borderRight: BORDA },
  celulaStatus: { width: 90, padding: 2 },
  linhaDePluviometria: { flexDirection: 'row', borderBottom: BORDA },
  rotuloDePluviometria: {
    width: 70,
    padding: 2,
    fontFamily: 'Helvetica-Bold',
    borderRight: BORDA,
  },
  valorDePluviometria: { flex: 1, padding: 2 },
  /**
   * Sem `flex: 1`. Com `flex` e `minHeight` juntos, o `@react-pdf` 4.9 calcula
   * um deslocamento vertical absurdo para esta caixa e pinta o comentário da
   * CROS centenas de milhões de pontos fora da folha — o texto existe no
   * arquivo e não aparece no papel. `minHeight` sozinho dá a mesma altura sem o
   * defeito. Ver o caso "imprime o comentário da CROS dentro da área da página"
   * em `pdf-renderizado.test.ts`.
   */
  colunaDeComentario: { minHeight: 44, padding: 2 },
  assinaturas: { flexDirection: 'row', marginTop: 16, gap: 18 },
  /**
   * `flex-end` porque a coluna da esquerda carrega nome, titulação e registro
   * acima da régua e a da direita não carrega nada: sem isso as duas réguas
   * ficam a 25pt uma da outra, e o gabarito pede dois campos lado a lado.
   */
  assinatura: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  dadosDoResponsavel: { alignItems: 'center', marginBottom: 2 },
  linhaDeAssinatura: { borderTop: BORDA, width: '100%', paddingTop: 2 },
  rotuloDeAssinatura: { textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  marcaDeContinuacao: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
  },
});
