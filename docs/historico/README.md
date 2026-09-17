# Histórico

## `migrations-sqlite/`

As quatro migrations do tempo em que o banco era SQLite, de 16/09/2026.

Ficaram aqui, e não foram apagadas, porque **cada uma registra uma decisão** e o
raciocínio de por que foi escrita à mão em vez de gerada. Quem for entender por
que o esquema tem a forma que tem lê melhor aqui do que no esquema pronto:

- `0000` — as 22 tabelas e os 92 CHECK iniciais;
- `0001` — `usuario.e_engenheiro`, a coluna que separa quem cria obra;
- `0002` — a função muda de lugar: passa da pessoa para a **passagem** (29.1);
- `0003` — exclusão com rastro (30.1) e o CHECK de `convite` aceitando os dois
  perfis (34.1).

**Não rodam mais.** O dialeto mudou em 17/09/2026: `GLOB`, `PRAGMA` e o truque
`date(x) = x` não existem no Postgres. O esquema atual nasce de uma migration
única, gerada do mesmo `src/db/schema/`, porque **nenhum banco de produção
existia ainda** — não havia dado a preservar, e uma linha de base limpa é mais
honesta que quatro traduções de algo que nunca rodou em Postgres.

## `testes-de-migracao-sqlite/`

Os dois testes que **aplicavam aquelas migrations e conferiam o resultado**,
aposentados em 17/09/2026. Estão aqui com extensão `.md` para que o Vitest e o
`tsc` não os coletem; o conteúdo é o do arquivo original, sem uma linha mudada.

| Antes                                     | Agora                                                   |
| ----------------------------------------- | ------------------------------------------------------- |
| `src/db/migracao-engenheiro-na-conta.test.ts` | `migracao-engenheiro-na-conta.test.ts.md`, 6 casos  |
| `src/db/migracao-exclusao-e-convite.test.ts`  | `migracao-exclusao-e-convite.test.ts.md`, 15 casos  |

**Por que pararam de rodar.** Eles liam o SQL de `src/db/migrations/0000` a
`0003` e o executavam contra um `better-sqlite3` em memória, um comando por vez,
para observar **o estado intermediário** — banco na versão anterior, já com
linhas dentro — que o `migrate()` normal nunca deixa ver. Aqueles arquivos
mudaram de lugar na mesma data, e os testes passaram a falhar com `ENOENT`, não
por regra quebrada: o objeto que eles verificavam deixou de existir.

### O que cada um provava, e para onde a garantia foi

Os 21 casos eram de duas naturezas, e a triagem separou uma da outra.

**Sobre a MIGRAÇÃO — 9 casos, aposentados.** Provavam o transporte de um
esquema para o outro: "marca quem já é engenheiro ativo de alguma obra", "não
marca o encarregado", "não marca quem teve o acesso revogado", "não marca quem
não tem acesso nenhum", "preserva as linhas que já existiam", "não perde
lançamento nenhum", "não perde o convite que já existia", "não deixa tabela de
trabalho para trás" e "passa em `integrity_check` e `foreign_key_check`".
**Perderam o objeto:** não há migration a aplicar nem banco SQLite a migrar, e
não existia banco de produção — não havia o que preservar. O critério do
preenchimento retroativo de `usuario.e_engenheiro` (acesso **ativo** de
engenheiro; revogado não conta) fica registrado aqui e na própria `0001`.
Quem liga aquela coluna **hoje** são os dois caminhos da decisão 25.1 e 34.1,
cobertos por `src/modules/acesso/instalacao.test.ts` e
`src/modules/acesso/convite-de-engenheiro.test.ts`. A varredura de tabela
sobrante é coberta de lado por `schema.test.ts`, no caso que afirma a lista
exata das 22 tabelas.

**Sobre o ESQUEMA ATUAL — 11 casos, movidos para
`src/db/schema/schema.test.ts`**, convertidos para Postgres e com a mensagem
esperada **mais** específica do que era: o nome do CHECK entra na expectativa,
porque `toThrow()` pelado não distingue "recusou pelo motivo certo" de "recusou
por acidente". São os dois blocos `exclusão com rastro` e
`convite e conta de engenheiro`: a trinca do rastro de exclusão (30.1) nas
quatro tabelas de lançamento, o instante de exclusão em UTC, o convite de
engenheiro (34.1), o perfil fora da lista, a unicidade do token e o booleano
`e_engenheiro`. Um caso **novo** entrou junto, e só um: `aceita convite de
encarregado`, o lado feliz que faltava ao lado do convite de engenheiro — sem
ele, "aceita os dois perfis" (34.1) ficaria provado pela metade.

**Sobre COMPORTAMENTO — 1 caso, aposentado por duplicidade.** "A pluviometria
excluída libera o dia para uma leitura nova" já é provado, ponta a ponta e pelo
mesmo índice parcial, em
`src/modules/lancamento/repositorio-drizzle.test.ts`, no caso "excluída a
pluviometria do dia, o dia aceita uma leitura nova".
