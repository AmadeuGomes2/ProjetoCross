/**
 * O controle "Exportar em PDF" da tela do RDO diário.
 *
 * Decisão 27.1, de 16/09/2026: **só o engenheiro exporta**, e o encarregado
 * não vê o controle. Antes o link aparecia para os dois e só falhava depois do
 * clique, com 403 — a interface prometia o que não ia cumprir.
 *
 * Esconder o botão **não é** controle de acesso: a rota
 * `/rdo/[obraId]/[dia]/pdf` continua exigindo perfil `engenheiro` em
 * `comAtorNaObra`, e o módulo `export` confere o perfil de novo antes de gerar
 * qualquer byte. Esta é a terceira camada, a que evita o beco sem saída.
 *
 * Quem decide é `perfilAtende`, do módulo `acesso`: a regra "engenheiro cobre
 * tudo que encarregado cobre" mora num lugar só, e a tela não repete a lista.
 */

import type { ReactElement } from 'react';

import { perfilAtende, type Perfil } from '../../../modules/acesso';
import type { ObraId } from '../../../shared/id';
import estilos from './rdo.module.css';

export function ControleDeExportacao({
  perfil,
  obraId,
  dia,
}: {
  /** `null` é "não sei quem é": não oferece nada. */
  readonly perfil: Perfil | null;
  readonly obraId: ObraId;
  readonly dia: string;
}): ReactElement | null {
  if (perfil === null || !perfilAtende(perfil, 'engenheiro')) return null;

  return (
    <p className={estilos.pagina}>
      <a href={`/rdo/${obraId}/${dia}/pdf`}>Exportar em PDF</a>
    </p>
  );
}
