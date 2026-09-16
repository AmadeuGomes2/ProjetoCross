/**
 * Limites de página herdados do layout da planilha.
 *
 * `.claude/skills/regras-rdo/SKILL.md`, seção 6: 15 atividades por RDO diário,
 * 4 linhas de comentário, 41 colunas de função e 41 de equipamento. Em uso
 * real: 11 atividades, 12 funções e 14 equipamentos.
 *
 * Transbordo nunca é truncamento silencioso (decisão 11.1): passar do limite
 * gera segunda página de continuação, e o total continua somando tudo.
 */

export const ATIVIDADES_NA_PAGINA_1 = 15;
export const LINHAS_DE_COMENTARIO_NA_PAGINA_1 = 4;
export const COLUNAS_DE_EFETIVO_NA_PAGINA_1 = 41;

/**
 * Largura da linha de comentário, em caracteres.
 *
 * É parâmetro de layout, não regra de negócio: é o que cabe na largura do bloco
 * 10 em A4 retrato com a fonte do documento. Mora aqui, num lugar só, porque
 * quem decide o transbordo (o `rdo`) e quem imprime a continuação (o `export`)
 * precisam contar as linhas do mesmo jeito.
 */
export const LARGURA_DA_LINHA_DE_COMENTARIO = 88;
