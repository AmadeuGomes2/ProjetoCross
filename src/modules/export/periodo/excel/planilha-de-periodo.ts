/**
 * A planilha do período, escrita com ExcelJS.
 *
 * **Nunca o pacote `xlsx`** (CLAUDE.md): parado na 0.18.5, com prototype
 * pollution na leitura de arquivo, CVE-2023-30533.
 *
 * Duas obrigações que a revisão trata como Crítico (contrato, 4.3):
 *
 * 1. **Injeção de fórmula.** Valor de texto que começa com `=`, `+`, `-` ou `@`
 *    é interpretado como fórmula por quem abre a planilha. Isto não é
 *    hipotético aqui: `formataBrDuasCasasOuTraco`
 *    (`src/shared/decimal/index.ts:166`) devolve `-` para produção zero, e essa
 *    célula vai para a máquina do fiscal — onde `-` viraria um erro de fórmula
 *    no lugar do valor que o gabarito manda imprimir. Toda célula de texto é
 *    escrita **como texto**, com formato de texto explícito, e nenhuma célula
 *    deste gerador é criada como fórmula.
 * 2. **Metadados.** `creator` e `lastModifiedBy` são o sistema. A planilha
 *    legada vaza quatro nomes só nos metadados, e metadado é o vazamento que
 *    ninguém vê ao abrir o arquivo.
 *
 * A planilha **espelha** o documento: ela não recalcula nada e não recebe
 * número cru para arredondar do seu jeito. É o que impede o fiscal de receber
 * dois números para o mesmo serviço.
 */

import ExcelJS from 'exceljs';

import type { RdoParaDocumento } from '../../portas';
import type { PacoteParaDocumento } from '../portas';
import type { LinhaDaPlanilha } from './linha';
import { linhasDoConsolidado } from './linhas-do-consolidado';
import { linhasDoDiario } from './linhas-do-diario';

const AUTOR_DA_PLANILHA = 'RDO digital';

/** Formato de texto do Excel. Célula assim não é reinterpretada como número. */
const FORMATO_DE_TEXTO = '@';

/** Larguras que fazem os rótulos longos caberem sem ninguém arrastar coluna. */
const LARGURAS = [34, 22, 18, 18, 18, 18] as const;

function escreveTexto(celula: ExcelJS.Cell, valor: string): void {
  // `celula.value` com uma string é gravado como texto, e nunca como fórmula:
  // fórmula, neste escritor, só existiria com `{ formula: ... }`, que não
  // aparece em lugar nenhum daqui. O formato de texto é a segunda camada, para
  // que uma reedição na máquina do fiscal também não converta o valor.
  celula.value = valor;
  celula.numFmt = FORMATO_DE_TEXTO;
}

function escreveAba(
  planilha: ExcelJS.Workbook,
  nome: string,
  linhas: readonly LinhaDaPlanilha[],
): void {
  const aba = planilha.addWorksheet(nome);

  LARGURAS.forEach((largura, indice) => {
    aba.getColumn(indice + 1).width = largura;
  });

  for (const linha of linhas) {
    const atual = aba.addRow([]);
    linha.forEach((valor, indice) => {
      const celula = atual.getCell(indice + 1);
      if (typeof valor === 'number') {
        celula.value = valor;
        return;
      }
      escreveTexto(celula, valor);
    });
    atual.commit();
  }
}

/**
 * O nome da aba de um diário anexado.
 *
 * O número do RDO identifica o dia sem ambiguidade e cabe no limite de 31
 * caracteres do Excel. A data não serve: `/` é proibido em nome de aba.
 */
function nomeDaAbaDoDiario(diario: RdoParaDocumento): string {
  return `RDO ${diario.identificacao.numeroDoRdo}`;
}

export async function montaPlanilhaDoPacote(
  pacote: PacoteParaDocumento,
): Promise<Uint8Array> {
  const planilha = new ExcelJS.Workbook();
  planilha.creator = AUTOR_DA_PLANILHA;
  planilha.lastModifiedBy = AUTOR_DA_PLANILHA;

  if (pacote.modo === 'consolidado') {
    escreveAba(planilha, 'Consolidado', linhasDoConsolidado(pacote.consolidado));
  } else if (pacote.modo === 'diarios') {
    for (const diario of pacote.diarios) {
      escreveAba(planilha, nomeDaAbaDoDiario(diario), linhasDoDiario(diario));
    }
  } else {
    // O resumo primeiro, a evidência depois — a mesma ordem das páginas do PDF.
    escreveAba(planilha, 'Consolidado', linhasDoConsolidado(pacote.consolidado));
    for (const diario of pacote.diarios) {
      escreveAba(planilha, nomeDaAbaDoDiario(diario), linhasDoDiario(diario));
    }
  }

  return new Uint8Array(await planilha.xlsx.writeBuffer());
}
