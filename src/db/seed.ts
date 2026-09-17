/**
 * Carga inicial das taxonomias (decisão 19.1).
 *
 * As listas vivem em `src/shared/taxonomia` com a **grafia exata herdada**,
 * erros de ortografia inclusive, porque são o vocabulário que o fiscal
 * reconhece. Aqui elas só viram linha de tabela: taxonomia é tabela de domínio
 * editável, nunca constante no código (R13). Depois do seed, quem manda é o
 * banco, e acrescentar termo não exige deploy.
 *
 * **Idempotente.** Rodar duas vezes não duplica: o conflito é resolvido pelo
 * UNIQUE de `termo_normalizado`, que é a mesma chave que faz
 * `" perca de Produção "` colidir com `"Perca de produção"` (caso de teste
 * obrigatório 13). O `id` é sorteado a cada execução, então a idempotência
 * **não** pode depender dele.
 *
 * `servico_controlado` NÃO entra aqui: serviço tem `obra_id` e pertence à obra,
 * não ao sistema. As quatro linhas iniciais são criadas junto com a obra, pelo
 * módulo `obra`.
 */

import { fileURLToPath } from 'node:url';

import { instanteAgora, type Instante } from '../shared/date/fuso';
import { geraId } from '../shared/id';
import {
  chaveDeTermo,
  FUNCOES_INICIAIS,
  normalizaTermo,
  STATUS_ATIVIDADE_INICIAIS,
  SUGESTOES_MOTIVO_PARADA,
  TIPOS_EQUIPAMENTO_INICIAIS,
} from '../shared/taxonomia';
import { criaBanco, type BancoRdo } from './index';
import { funcao, statusAtividade, sugestaoMotivoParada, tipoEquipamento } from './schema';

/** A ordem de exibição é a ordem da lista herdada, começando em 1. */
function linhasDeTermo<T extends string>(termos: readonly string[], criadoEm: Instante) {
  return termos.map((termo, indice) => ({
    id: geraId<T>(),
    termo: normalizaTermo(termo),
    termoNormalizado: chaveDeTermo(termo),
    ordem: indice + 1,
    ativo: 1,
    criadoEm,
  }));
}

/**
 * **Todo `insert` leva `await`.** O construtor do Drizzle é preguiçoso: ele só
 * manda a consulta quando alguém espera a promessa. Sem o `await` a função
 * termina, a transação fecha e **nada é gravado, sem erro nenhum** — foi o que
 * aconteceu na conversão para Postgres de 17/09/2026, e a semente passou a
 * devolver zero linhas em silêncio. No `better-sqlite3` o `.run()` executava na
 * hora e a diferença não existia.
 */
export async function semeiaTaxonomias(
  db: BancoRdo,
  criadoEm: Instante = instanteAgora(),
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .insert(funcao)
      .values(linhasDeTermo<'funcao'>(FUNCOES_INICIAIS, criadoEm))
      .onConflictDoNothing();

    await tx
      .insert(tipoEquipamento)
      .values(linhasDeTermo<'tipo_equipamento'>(TIPOS_EQUIPAMENTO_INICIAIS, criadoEm))
      .onConflictDoNothing();

    await tx
      .insert(statusAtividade)
      .values(linhasDeTermo<'status_atividade'>(STATUS_ATIVIDADE_INICIAIS, criadoEm))
      .onConflictDoNothing();

    // As oito sugestões de motivo de dia parado. NÃO são taxonomia fechada
    // (decisão 20.1): só preenchem um campo de texto livre, e por isso nenhuma
    // chave estrangeira aponta para esta tabela.
    await tx
      .insert(sugestaoMotivoParada)
      .values(
        SUGESTOES_MOTIVO_PARADA.map((texto, indice) => ({
          id: geraId<'sugestao_motivo_parada'>(),
          texto: normalizaTermo(texto),
          textoNormalizado: chaveDeTermo(texto),
          ordem: indice + 1,
          ativo: 1,
        })),
      )
      .onConflictDoNothing();
  });
}

/**
 * Semeia o banco configurado por ambiente. Ponto de entrada para a instalação;
 * o teste usa `semeiaTaxonomias` com um banco em memória.
 */
export async function semeiaBancoConfigurado(): Promise<void> {
  const conexao = criaBanco();
  try {
    await semeiaTaxonomias(conexao.db);
  } finally {
    conexao.fecha();
  }
}

/**
 * Ponto de entrada da linha de comando: `npm run db:seed`.
 *
 * Só dispara quando este arquivo é executado direto, nunca quando é importado
 * por um teste. Sem esta guarda, importar o módulo semearia o banco de verdade
 * no meio de uma suíte.
 */
const esteArquivo = fileURLToPath(import.meta.url);

if (process.argv[1] === esteArquivo) {
  semeiaBancoConfigurado();
  // Saída em stderr: `console.log` é proibido pela regra do projeto.
  console.warn('Taxonomias semeadas.');
}
