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
