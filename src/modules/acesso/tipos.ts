/**
 * Tipos da fronteira de confiança.
 *
 * docs/arquitetura/v1.md, 2.4 e 5.2. O perfil **não é do usuário**: é da
 * relação dele com a obra (decisão 14.0). Por isso `Ator` não carrega perfil
 * nenhum, e `AtorNaObra` só existe como resultado de `exigeAcessoNaObra`.
 *
 * Consequência de projeto: não há como escrever um caso de uso protegido que
 * "esqueça" de verificar o perfil, porque o tipo que ele precisa só é
 * produzido pela verificação.
 */

import type { AmbienteBase } from '@/shared/contrato/ambiente';
import type { ObraId, SessaoId, UsuarioId } from '../../shared/id';

export type Perfil = 'engenheiro' | 'encarregado';

/** Quem está na requisição. Sem perfil: perfil se resolve por obra. */
export interface Ator {
  readonly usuarioId: UsuarioId;
  readonly sessaoId: SessaoId;
}

/** Só `exigeAcessoNaObra` produz este tipo. É a prova de que a checagem correu. */
export interface AtorNaObra {
  readonly usuarioId: UsuarioId;
  readonly obraId: ObraId;
  readonly perfil: Perfil;
}

export interface ObraResumo {
  readonly obraId: ObraId;
  readonly contrato: string;
  readonly perfil: Perfil;
}

/**
 * Dependências do módulo.
 *
 * O relógio é injetado porque validade de convite e de sessão são fronteiras
 * de teste: com `new Date()` dentro do caso de uso, o teste de "último minuto
 * dentro dos 7 dias" (CT-078) não existe.
 *
 * Cada módulo declara o seu `Ambiente`. `src/shared/` está fora do alcance
 * desta frente, então a forma se repete em cinco módulos; está anotado no
 * relatório de entrega como candidato a subir para `shared/`.
 */
export type Ambiente = AmbienteBase;

/**
 * `engenheiro` cobre tudo que `encarregado` cobre.
 *
 * Origem: PRD, tabela "Quem usa" — toda linha é "os dois podem" ou "só o
 * engenheiro". Com dois perfis, o perfil mínimo exigido diz exatamente a mesma
 * coisa que uma lista de ações, e não precisa ser mantido em dois lugares.
 */
export function perfilAtende(perfil: Perfil, minimo: Perfil): boolean {
  if (minimo === 'encarregado') return true;
  return perfil === 'engenheiro';
}
