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
  },
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
  metadeDireita: { width: 110 },
  linhaDeCampo: { flexDirection: 'row', paddingVertical: 1, paddingHorizontal: 3 },
  rotulo: { fontFamily: 'Helvetica-Bold', width: 70 },
  valor: { flex: 1 },
  colunasDeEfetivo: { flexDirection: 'row', flexWrap: 'wrap' },
  colunaDeEfetivo: {
    width: 40,
    borderRight: BORDA,
    borderBottom: BORDA,
    alignItems: 'center',
  },
  rotuloDaColuna: { fontSize: 5, textAlign: 'center', paddingVertical: 1 },
  quantidadeDaColuna: { fontSize: 7, textAlign: 'center', paddingVertical: 1 },
  linhaDeTabela: { flexDirection: 'row', borderBottom: BORDA },
  celulaServico: { flex: 1, padding: 2 },
  celulaNumero: { width: 55, padding: 2, textAlign: 'right', borderLeft: BORDA },
  celulaBarra: { width: 70, padding: 2, borderLeft: BORDA },
  trilhoDaBarra: { height: 6, backgroundColor: '#e6e6e6' },
  barra: { height: 6, backgroundColor: '#767171' },
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
  colunaDeComentario: { flex: 1, minHeight: 44, padding: 2 },
  assinaturas: { flexDirection: 'row', marginTop: 16, gap: 18 },
  assinatura: { flex: 1, alignItems: 'center' },
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
