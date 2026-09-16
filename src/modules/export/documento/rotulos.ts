/**
 * Os rótulos do RDO, com a grafia exata do documento que o fiscal lê há meses.
 *
 * `.claude/skills/fidelidade-documento/SKILL.md`: divergência de layout é
 * defeito, não preferência. Os erros de ortografia herdados **não se corrigem**
 * — são o vocabulário do cliente:
 *
 *   `DATA INICIO`                 sem acento
 *   `CARACTERISTICAS DO PROJETO`  sem acento
 *   `NOITE ANTER`                 abreviado assim, sem ponto
 *   `INDICE`                      sem acento
 *   `BM'S`                        com apóstrofo
 *   `EXEC.` e `ACUM.`             com ponto final
 *   `EFETIVO EQUIPAMENTOS`        no plural
 *   `COMENTÁRIOS CROS`            plural, contratada
 *   `COMENTÁRIO CONTRATANTE`      singular, contratante
 *
 * Mudar qualquer um deles exige aprovação de quem responde pelo produto.
 */

export const ROTULO = {
  TITULO: 'RELATÓRIO DIÁRIO DE OBRAS',

  BMS: "BM'S",
  NUMERO_DO_RDO: 'RDO Nº',

  INFORMACOES_GERAIS: 'INFORMAÇÕES GERAIS',
  CONTRATO: 'CONTRATO:',
  DATA_INICIO: 'DATA INICIO:',
  DATA_FINAL: 'DATA FINAL:',
  CONTRATANTE: 'CONTRATANTE:',
  CONTRATADA: 'CONTRATADA:',
  ESCOPO: 'ESCOPO:',

  CARACTERISTICAS: 'CARACTERISTICAS DO PROJETO',
  NOME: 'NOME:',
  AREA: 'ÁREA:',
  LOCAL: 'LOCAL:',

  EFETIVO_PESSOAL: 'EFETIVO PESSOAL',
  EFETIVO_EQUIPAMENTOS: 'EFETIVO EQUIPAMENTOS',
  TOTAL: 'TOTAL',

  PRODUCAO_CONTROLADA: 'PRODUÇÃO CONTROLADA',
  SERVICO: 'SERVIÇO',
  EXEC: 'EXEC.',
  ACUM: 'ACUM.',
  PROJETO: 'PROJETO',

  ATIVIDADES: 'ATIVIDADES',
  STATUS: 'STATUS',

  PLUVIOMETRIA: 'PLUVIOMETRIA',
  NOITE_ANTERIOR: 'NOITE ANTER',
  MANHA: 'MANHÃ',
  TARDE: 'TARDE',
  INDICE: 'INDICE',

  COMENTARIOS_CROS: 'COMENTÁRIOS CROS',
  COMENTARIO_CONTRATANTE: 'COMENTÁRIO CONTRATANTE',

  REPRESENTANTE_CROS: 'REPRESENTANTE CROS CONSTRUÇÕES S/A',
  REPRESENTANTE_CONTRATANTE: 'REPRESENTANTE CONTRATANTE',

  /** Cabeçalho da segunda página, decisão 11.1. */
  CONTINUACAO: 'CONTINUAÇÃO',
} as const;

/**
 * Metadados do PDF.
 *
 * `docs/arquitetura/v1.md`, 5.3: nenhum deles aceita nome de pessoa. Metadado é
 * o vazamento que ninguém vê ao abrir o arquivo (CT-252).
 */
export const AUTOR_DO_PDF = 'RDO digital';
export const PRODUTOR_DO_PDF = 'RDO digital';
