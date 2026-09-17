import type { Impacto } from '../_composicao/impacto';

/**
 * O aviso que aparece antes de alterar ou excluir um cadastro.
 *
 * Regra do dono do produto, 17/09/2026: *"importante colocar aviso sempre que
 * for alterar uma informação, no que ela impacta"*.
 *
 * Três decisões de redação, e nenhuma é enfeite:
 *
 * 1. **Diz o número.** "Existem lançamentos" não ajuda ninguém a decidir. "18
 *    dias lançados, 12 fechados, 4 RDOs já exportados" ajuda. Aviso vago é
 *    aviso que se aprende a ignorar.
 * 2. **Diz o que NÃO vai acontecer.** É a parte que tira o medo: alteração de
 *    cadastro não apaga nada de dia já lançado. Sem essa frase, o engenheiro
 *    deixa de corrigir um erro de digitação por achar que vai estragar o
 *    histórico.
 * 3. **Diz onde se faz o que ele talvez queira.** Para tirar algo de um RDO,
 *    abre-se aquele RDO. O caminho fica escrito, não subentendido.
 *
 * Não some sozinho e não tem botão de fechar: é informação para decidir, não
 * notificação de sucesso.
 */
export function AvisoDeImpacto({
  impacto,
  oQueMuda,
  oQueNaoMuda,
}: {
  readonly impacto: Impacto;
  /** O que a ação faz, em uma frase. Ex.: "Alterar o cabeçalho". */
  readonly oQueMuda: string;
  /**
   * O efeito nos RDOs, em uma frase, **sem a palavra "não" isolada**: o leitor
   * apressado lê a frase pela metade. Ex.: "vale para todos os RDOs, inclusive
   * os já emitidos".
   */
  readonly oQueNaoMuda: string;
}) {
  // Sem dia lançado não há o que avisar: o aviso viraria ruído de tela vazia.
  if (impacto.diasLancados === 0) return null;

  const dias = `${impacto.diasLancados} ${impacto.diasLancados === 1 ? 'dia lançado' : 'dias lançados'}`;
  const fechados =
    impacto.diasFechados === 0
      ? null
      : `${impacto.diasFechados} ${impacto.diasFechados === 1 ? 'fechado' : 'fechados'}`;
  const saidos =
    impacto.exportacoes === 0
      ? null
      : `${impacto.exportacoes} ${impacto.exportacoes === 1 ? 'RDO já exportado' : 'RDOs já exportados'}`;

  return (
    <p className="recado recado--aviso" role="status">
      <strong>Isto alcança {[dias, fechados, saidos].filter(Boolean).join(', ')}.</strong>{' '}
      {oQueMuda} {oQueNaoMuda}
    </p>
  );
}

/**
 * A frase padrão para alteração de cadastro, que é o caso mais comum.
 *
 * Fica aqui, e não solta em cada tela, porque o texto precisa ser o mesmo em
 * todas: quem lê a mesma frase em cinco lugares aprende a regra; quem lê cinco
 * variações acha que são cinco regras.
 */
export const NAO_MEXE_NO_QUE_JA_FOI_LANCADO =
  'Os lançamentos desses dias ficam como estão. Para tirar algo de um RDO, ' +
  'abra o RDO daquele dia e remova o lançamento lá.';
