---
name: defeitos-recorrentes
description: Padrões de defeito já apontados neste repositório, com contagem, para detectar reincidência nas próximas revisões
metadata:
  type: project
---

Base de comparação das revisões. Um padrão que chegar a **3 ocorrências** deixa
de ser descuido e vira regra faltando em `.claude/skills/padroes-codigo/SKILL.md`
ou abstração faltando em `src/shared/`.

## Revisão 1 — commit `d5dce94`, fatia vertical v1 (140 arquivos, 3 frentes)

| #   | Padrão                                                                                                                                                                                                                                                         | Ocorrências | Onde                                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| P1  | **Raiz de composição entregue como esboço**: porta que devolve erro fixo, ou caso de uso exportado que rota nenhuma chama. Lint, typecheck e teste passam porque nada cobre `src/app/_composicao/`.                                                            | 3           | `rdo-diario.ts`, `exportacao-rdo.ts`, `portas-de-cadastro.ts`                   |
| P2  | **Duas verdades para a mesma agregação**, escritas por frentes que não se viam: efetivo de pessoal e de equipamento existe em `modules/pessoal` + `modules/equipamento` e de novo em `modules/rdo/efetivo.ts`, com colunas zeradas, ordem e `trim` diferentes. | 2           | pessoal, equipamento                                                            |
| P3  | **Código de erro que contradiz a mensagem**: `DATA_FINAL_ANTES_DA_INICIAL` usado para sobreposição de intervalo. É o mesmo defeito que o coordenador corrigiu em 6 lugares com `TERMO_VAZIO`.                                                                  | 3           | `pessoal/casos-de-uso.ts`, `equipamento/casos-de-uso.ts`, `obra/periodo-bms.ts` |
| P4  | **Validação de intervalo copiada em vez de subir para `shared/date/`**: `validaIntervaloDaPassagem` e `validaSobreposicao` idênticas em dois módulos; `seSobrepoem` é uma terceira forma.                                                                      | 3           | pessoal, equipamento, obra                                                      |
| P5  | **Função de `shared/` ignorada e reescrita inline**: `ehFuturo` existe em `shared/date/fuso.ts` e ninguém usa; `lancamento/regras.ts` refaz a comparação.                                                                                                      | 1           | lancamento                                                                      |

## O que NÃO foi defeito (não reapontar sem prova nova)

- `any`: zero ocorrências. Nenhum `eslint-disable`, `@ts-ignore` nem `as any`.
- Exceção engolida: os 6 `catch` do diff registram log, mudam estado observável
  ou viram `Result`, e explicam o porquê em comentário.
- Data sem fuso: `shared/date/dia.ts` usa dia juliano sem `Date`; relógio é
  injetado em todos os casos de uso. `new Date()` só em raiz de composição.
- Fronteiras de agregação: entrada, saída, índice 0/9/10/11, RDO 0, 15 e 16
  atividades, acumulado igual ao projeto — todas presentes e ligadas à decisão.
- `as` em teste da frente A (5 linhas): estreita `SELECT *` de SQL cru e a
  asserção seguinte falharia alto se o tipo estivesse errado. Aceitável.

## Mudanças estruturais propostas nesta revisão

1. `padroes-codigo` não diz nada sobre **raiz de composição**. Propor regra: toda
   porta declarada precisa de implementação real ou de teste que prove a recusa
   deliberada; esboço em `_composicao/` não fecha tarefa (P1).
2. `padroes-codigo`, seção Erro, não diz que **código e mensagem precisam
   concordar**. Propor regra explícita (P3).
3. `shared/date/intervalo.ts` tem `intervaloCobreODia`, mas não tem
   `intervalosSeSobrepoem` nem `validaOrdemDasDatas`. Propor subir as duas (P4).

Ver [[frentes-paralelas-v1]].
