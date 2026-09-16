/**
 * Leitura e edição das listas de domínio.
 *
 * R13: taxonomia é **tabela editável**, com a grafia exata herdada — erros de
 * ortografia inclusive, porque são o vocabulário que o fiscal reconhece —, e
 * vale para o sistema inteiro (19.2). A validação da planilha já reservava
 * duas linhas vazias para termos novos: a lista cresce, e constante no código
 * não cresce.
 *
 * Toda comparação passa por `chaveDeTermo` de `shared/taxonomia`, nunca por
 * igualdade exata (caso de teste obrigatório 13).
 */

import { instanteAgora } from '../../shared/date/fuso';
import { geraId, idConfiavel } from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import {
  chaveDeTermo,
  LETRAS_DE_TURNO,
  normalizaTermo,
  type LetraDeTurno,
} from '../../shared/taxonomia';
import * as repositorio from './repositorio';
import type { Ambiente, FuncaoParaEfetivo, Termo, TipoDeTaxonomia } from './tipos';

export function listaTermos(
  tipo: TipoDeTaxonomia,
  amb: Ambiente,
): Result<Termo[], ErroDeDominio> {
  return ok(repositorio.listaTermosDaTabela(amb.db, tipo));
}

/** Só os termos em uso. Termo desativado continua no histórico, mas não na tela. */
export function listaTermosAtivos(
  tipo: TipoDeTaxonomia,
  amb: Ambiente,
): Result<Termo[], ErroDeDominio> {
  return ok(repositorio.listaTermosDaTabela(amb.db, tipo).filter((t) => t.ativo));
}

/**
 * As colunas de função do bloco 5 do RDO, na ordem do cadastro.
 *
 * Devolve **todos** os termos, inclusive os desativados, e é de propósito: o
 * RDO é documento histórico, e uma função desativada hoje pode ter gente
 * mobilizada num dia de março. Filtrar por `ativo` aqui faria a coluna sumir e
 * levaria o `TOTAL` junto — truncamento silencioso, que este projeto não
 * aceita em lugar nenhum. Quem não pode oferecer termo desativado é a tela de
 * escolha, e para isso existe `listaTermosAtivos`.
 *
 * A quantidade zero não some: o gabarito mostra a coluna com a célula em
 * branco, e quem decide isso é `rdo/efetivo.ts`.
 */
export function listaFuncoesParaEfetivo(
  amb: Ambiente,
): Result<FuncaoParaEfetivo[], ErroDeDominio> {
  return ok(
    repositorio
      .listaTermosDaTabela(amb.db, 'funcao')
      .map((t) => ({
        funcaoId: idConfiavel<'funcao'>(t.id),
        termo: t.termo,
        ordem: t.ordem,
      }))
      .sort((a, b) => a.ordem - b.ordem),
  );
}

/**
 * Encontra o termo do cadastro a partir do que a pessoa digitou ou escolheu.
 *
 * É a porta que `pessoal` e `equipamento` consomem. Devolve `null` quando não
 * existe: **não cria termo por efeito colateral** (CT-037). Foi assim que a
 * planilha ganhou `Servente ` e `Servente` como duas funções diferentes.
 */
export function resolveTermo(
  tipo: TipoDeTaxonomia,
  bruto: string,
  amb: Ambiente,
): Termo | null {
  if (bruto.trim() === '') return null;
  return repositorio.buscaPorChave(amb.db, tipo, bruto);
}

/**
 * Acrescenta um termo novo.
 *
 * Duplicado por caixa ou por espaço nas pontas é recusado, e a mensagem mostra
 * a grafia que já existe (CT-069): quem digitou `" perca de Produção "`
 * precisa ver que o cadastro já tem `Perca de produção`.
 *
 * A autorização **não** mora aqui: é a rota, por `exigeAcessoNaObra` com
 * perfil `engenheiro`, que a faz (arquitetura, 5.2). Ver
 * `src/app/_composicao/cadastro.ts`.
 */
export function acrescentaTermo(
  tipo: TipoDeTaxonomia,
  bruto: string,
  amb: Ambiente,
): Result<string, ErroDeDominio> {
  const termo = normalizaTermo(bruto);
  if (termo === '') {
    return erro(erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o termo a acrescentar.'));
  }

  const existente = repositorio.buscaPorChave(amb.db, tipo, termo);
  if (existente !== null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.JA_EXISTE,
        `Já existe o termo "${existente.termo}" nesta lista.`,
      ),
    );
  }

  const id = repositorio.insereTermo(amb.db, tipo, {
    termo,
    termoNormalizado: chaveDeTermo(termo),
    ordem: repositorio.proximaOrdem(amb.db, tipo),
    criadoEm: instanteAgora(amb.relogio),
  });

  registra('info', geraId<'correlacao'>(), 'taxonomia.termo_acrescentado', {});
  return ok(id);
}

/**
 * As oito sugestões de motivo de dia parado.
 *
 * Decisão 20.1: o motivo é **texto livre obrigatório**. Isto não é lista
 * fechada e validar o motivo contra ela seria defeito; as sugestões só
 * preenchem o campo sem fechá-lo.
 */
export function listaSugestoesDeMotivo(amb: Ambiente): Result<string[], ErroDeDominio> {
  return ok(repositorio.listaSugestoes(amb.db));
}

/**
 * As três letras de turno.
 *
 * **Não é tabela**, de propósito (arquitetura, decisão 5 da seção 7):
 * acrescentar uma letra mudaria a árvore do resumo do dia (R7), e isso é
 * código, não dado. O `N` que a macro VBA pinta não entra: a árvore não o
 * conhece e o resumo dele seria sempre vazio.
 */
export function listaLetrasDeTurno(): readonly LetraDeTurno[] {
  return LETRAS_DE_TURNO;
}
