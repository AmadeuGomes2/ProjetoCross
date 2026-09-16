/**
 * Comparação de termo de taxonomia.
 *
 * A planilha tem `Perca de Produção` no painel e `Perca de produção` na
 * fórmula, e funções com espaço no fim, como `Servente `. No Excel a comparação
 * ignora maiúsculas e o acaso resolve; em código, não resolve.
 * Ver docs/dominio/inconsistencias.md, C8 e E5. Caso de teste obrigatório 13.
 *
 * Regra: comparar sem diferenciar caixa e sem os espaços das pontas; exibir
 * sempre a grafia oficial do cadastro, inclusive os erros de ortografia
 * herdados, que são o vocabulário do cliente.
 */

/** Recorta as pontas e colapsa espaço interno repetido. Não mexe em acento. */
export function normalizaTermo(bruto: string): string {
  return bruto.trim().replace(/\s+/g, ' ');
}

/** Chave de comparação. Nunca use para exibir. */
export function chaveDeTermo(bruto: string): string {
  return normalizaTermo(bruto).toLocaleLowerCase('pt-BR');
}

export function mesmoTermo(a: string, b: string): boolean {
  return chaveDeTermo(a) === chaveDeTermo(b);
}

export function contemTermo(lista: readonly string[], termo: string): boolean {
  return lista.some((t) => mesmoTermo(t, termo));
}

/**
 * Letra do turno de pluviometria.
 *
 * Decisão 2.1: o tempo é lançado só como três turnos mais o índice em mm; a
 * condição de tempo de 6 termos deixa de existir.
 * A letra `N`, que a macro VBA pintava, não entra: nenhuma outra parte da
 * planilha a aceitava.
 */
export const LETRAS_DE_TURNO = ['B', 'C', 'I'] as const;
export type LetraDeTurno = (typeof LETRAS_DE_TURNO)[number];

export function ehLetraDeTurno(valor: unknown): valor is LetraDeTurno {
  return (
    typeof valor === 'string' && (LETRAS_DE_TURNO as readonly string[]).includes(valor)
  );
}

/**
 * Resumo do dia.
 *
 * Grafias herdadas de propósito: `Perca` no lugar de "Perda" e `Impraticavél`
 * com o acento na vogal errada. São os rótulos que o fiscal lê há meses.
 * Ver .claude/skills/fidelidade-documento/SKILL.md.
 */
export const RESUMO_DO_DIA = {
  TRABALHADO: 'Trabalhado',
  PERCA: 'Perca de produção',
  IMPRATICAVEL: 'Impraticavél',
  VAZIO: '',
} as const;

export type ResumoDoDia = (typeof RESUMO_DO_DIA)[keyof typeof RESUMO_DO_DIA];

/** Estado do dia. Decisão 4.2: são três, e `não lançado` é ausência de registro. */
export const ESTADO_DO_DIA = {
  TRABALHADO: 'trabalhado',
  PARADO: 'parado',
} as const;

export type EstadoDoDia = (typeof ESTADO_DO_DIA)[keyof typeof ESTADO_DO_DIA];

/**
 * Sugestões de motivo de dia parado.
 *
 * Decisão 20.1: o motivo é TEXTO LIVRE OBRIGATÓRIO. Estas oito são sugestões
 * tocáveis que preenchem o campo sem fechá-lo, extraídas dos 110 registros
 * reais de dia parado da planilha, que tinham 13 grafias distintas.
 *
 * Isto NÃO é lista fechada. Validar o motivo contra ela é defeito.
 */
export const SUGESTOES_MOTIVO_PARADA = [
  'Domingo',
  'Feriado',
  'Chuva',
  'Excesso de umidade no trecho',
  'Interferência de terceiro',
  'Impraticável',
  'Sem frente de serviço',
  'Outro',
] as const;

/**
 * Status de atividade, as 14 grafias exatas de DADOS!G3:G16.
 * Carga inicial da tabela de domínio (decisão 19.1), não constante de uso.
 */
export const STATUS_ATIVIDADE_INICIAIS = [
  'Produção',
  'Informativo',
  'Pendências - Cliente',
  'Pendências - CROS',
  'Mobilização',
  'Desmobilização',
  'Alterações - Cliente',
  'Fornecimento',
  'Removido/Alteração',
  'Serviço Fo. Es.',
  'Paralisação',
  'Transporte',
  'Limpeza',
  'Levantamento',
] as const;

/** As 12 funções observadas no cadastro real, normalizadas nas pontas. */
export const FUNCOES_INICIAIS = [
  'Auxiliar eng.',
  'ADM',
  'Feitor',
  'Servente',
  'Motorista',
  'Pedreiro',
  'Operador III',
  'Operador II',
  'Op. Rolo C.',
  'Enc. Geral',
  'Op. Retro',
  'Topografo',
] as const;

/** Os 8 tipos de equipamento observados. Não aparecem no RDO. */
export const TIPOS_EQUIPAMENTO_INICIAIS = [
  'APOIO',
  'PATROL',
  'RETRO',
  'BASCULA',
  'CARRO',
  'ROLO',
  'TRATOR',
  'CARREGADEIRA',
] as const;

/** Os 4 serviços controlados, com a grafia exata de PRODUÇÃO!B2:B5. */
export const SERVICOS_CONTROLADOS_INICIAIS = [
  'REC.(FRESA+CAPA)',
  'REC.(FRESA+BINDER+CAPA)',
  'RECICLAGEM(BASE+CAPA)',
  'IM.(SUBLEITO+BASE+CAPA)',
] as const;
