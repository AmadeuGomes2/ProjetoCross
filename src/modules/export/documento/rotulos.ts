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
 * Os rótulos que **só o consolidado de período** usa.
 *
 * Aprovados por quem responde pelo produto em 17/09/2026, respondendo os pontos
 * A1 a A5 de `docs/arquitetura/periodo.md`, seção 6. Ficam num objeto separado
 * de propósito: nada aqui altera o gabarito do diário, e a conferência de
 * fidelidade do RDO diário continua olhando só para `ROTULO`.
 *
 * Duas coisas que a aprovação deixou explícitas:
 *
 * - o rótulo herdado do efetivo continua **inteiro e na frente**; o complemento
 *   se acrescenta, não substitui. Por isso os dois são compostos a partir de
 *   `ROTULO`, e não redigitados — assim uma mudança no herdado não deixa as
 *   duas grafias divergirem;
 * - `INDICE` continua sem acento, no `ROTULO` de sempre. Os quatro contadores
 *   de dias é que são novos, com `IMPRATIC.` abreviado assim, com ponto.
 */
const MEDIA_POR_DIA = 'MÉDIA POR DIA';

export const ROTULO_DE_PERIODO = {
  /** Campo herdado do dia da semana, que num conjunto vira a contagem de dias. */
  DIA: 'DIA',

  EFETIVO_PESSOAL_MEDIA: `${ROTULO.EFETIVO_PESSOAL} · ${MEDIA_POR_DIA}`,
  EFETIVO_EQUIPAMENTOS_MEDIA: `${ROTULO.EFETIVO_EQUIPAMENTOS} · ${MEDIA_POR_DIA}`,

  DIAS_BONS: 'DIAS BONS',
  DIAS_CHUVOSOS: 'DIAS CHUVOSOS',
  DIAS_IMPRATICAVEIS: 'DIAS IMPRATIC.',
  DIAS_PARADOS: 'DIAS PARADOS',
} as const;

/**
 * Metadados do PDF.
 *
 * `docs/arquitetura/v1.md`, 5.3: nenhum deles aceita nome de pessoa. Metadado é
 * o vazamento que ninguém vê ao abrir o arquivo (CT-252).
 */
export const AUTOR_DO_PDF = 'RDO digital';
export const PRODUTOR_DO_PDF = 'RDO digital';
