---
name: padroes-codigo
description: Convenções de código deste projeto — estrutura de pastas, nomes, tipos, tratamento de erro, datas e dinheiro/quantidade. Use ao escrever ou revisar qualquer código do RDO digital.
---

# Padrões de código — RDO digital

Convenções deste projeto, não conselhos gerais. Onde houver conflito com hábito
pessoal, vale o que está aqui.

---

## Estrutura de pastas

```
src/
  app/                 rotas do App Router; página fina, sem regra de negócio
  modules/
    obra/              cadastro de obra, contrato, datas
    pessoal/           pessoas, funções, períodos
    equipamento/       equipamentos, tipos, períodos
    lancamento/        atividade, produção, pluviometria, observação
    rdo/               montagem das visões diária, semanal e mensal
    export/            PDF e Excel
  shared/              o que mais de um módulo usa; mexer exige perguntar
    date/              dia puro, fuso, formatação pt-BR
    taxonomia/         status, tempo, turno, motivo de parada
    result/            tipo de resultado e erros de domínio
  db/                  esquema e acesso
test/
  fixtures/            apoio de teste, só dado sintético
```

Regra: **módulo não importa de módulo.** Se dois precisam da mesma coisa, ela sobe
para `shared/`. Subir para `shared/` exige perguntar, porque é ponto de contenção
em trabalho paralelo. Ver `CLAUDE.md`, seção Trabalho em paralelo.

A página em `app/` chama um caso de uso do módulo e renderiza. Se houver `if` de
regra de negócio numa página, está no lugar errado.

---

## Nomes

- Arquivos e pastas em `kebab-case`: `calcula-efetivo-do-dia.ts`.
- Tipos e classes em `PascalCase`; funções e variáveis em `camelCase`.
- **Domínio em português, sem acento no identificador:** `Lancamento`,
  `efetivoPorFuncao`, `producaoAcumulada`, `servicoControlado`. Traduzir o domínio
  para inglês cria um dicionário a mais entre o código e quem usa o sistema.
- Termos de infraestrutura em inglês, como já são: `repository`, `handler`.
- Booleano começa com `e`, `tem`, `pode`: `eDiaFechado`, `temProducao`.
- Nada de abreviação inventada. `qtd` não, `quantidade` sim. `RDO` e `BMS` sim,
  são do domínio.

---

## Tipos

- `strict: true`, mais `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e
  `noImplicitReturns`. Já configurados; não afrouxe.
- **`any` é erro de lint.** Sem exceção combinada previamente. Quando o tipo é
  desconhecido de verdade, use `unknown` e estreite com validação.
- **Nada de `as`** para calar o compilador. Se precisou, ou o tipo está errado ou
  falta validação. `as const` é permitido.
- Prefira tipo restrito a `string`: união literal para taxonomia, tipo de marca
  para identificador. Um `string` que aceita qualquer coisa é onde entra o dado
  sujo.
- Modele o impossível fora do tipo. Se um dia parado não pode ter atividade, o
  tipo do dia parado não tem o campo.

---

## Erro

Três categorias, tratadas de formas diferentes:

1. **Erro esperado de domínio** (data final antes da inicial, produção acima do
   projeto): é resultado, não exceção. Retorne um `Result` com o erro tipado, para
   que o chamador seja obrigado a tratar.
2. **Erro de entrada** (campo faltando, tipo errado): rejeite na borda, com
   mensagem que diz o que corrigir.
3. **Erro inesperado**: deixe subir até a borda, registre com identificador de
   correlação e devolva mensagem genérica.

Regras duras:

- **Nunca engula exceção.** `catch {}` vazio é erro de lint. Se o erro é
  realmente ignorável, escreva por que num comentário e registre em nível baixo.
- **Nunca vaze stack trace** para o usuário. Nem em ambiente de desenvolvimento,
  porque essa distinção sempre vaza para produção.
- **Nunca ponha nome de pessoa em mensagem de erro nem em log.** Use o
  identificador. Ver `CLAUDE.md`, seção Segurança, e a skill
  `checklist-seguranca`.
- Mensagem de erro é para quem vai agir: "A data final não pode ser anterior à
  inicial" e não "Validação falhou no campo 3".

---

## Datas

O ponto mais perigoso do projeto. A planilha usa três formatos diferentes e um
deles é americano.

- **Data de obra é dia puro**, sem hora e sem deslocamento. Não use `Date` para
  representá-la; use um tipo próprio ou uma string `AAAA-MM-DD` validada, em um
  único lugar de `shared/date/`.
- **Fuso definido e explícito.** Nunca dependa do fuso do servidor nem do
  navegador. Um lançamento feito às 23h pertence ao dia que o encarregado
  escolheu.
- **Exibição sempre em pt-BR**, `dd/mm/aaaa`. Nunca mostre `mm/dd`.
- Comparação de dia é comparação de dia, não de instante. `03/09` às 00:00 num
  fuso é `02/09` às 21:00 em outro, e é assim que se perde um dia de RDO.
- Aritmética de calendário passa por `shared/date/`. Não some 86.400.000
  milissegundos.

---

## Quantidades

- Produção é decimal com casas que importam: a planilha tem `2210.392`. Ponto
  flutuante binário não serve para somar acumulado. Use inteiro na menor unidade
  ou decimal exato, decidido uma vez em `shared/`.
- Nunca arredonde no meio do cálculo. Arredonde só na exibição, e diga com quantas
  casas.
- Percentual é derivado, nunca armazenado.

---

## Comparação de texto de taxonomia

A planilha tem `Perca de Produção` contra `Perca de produção` e funções com espaço
no fim, como `Servente `. No Excel isso passa; em código, não.

Ao comparar termo de taxonomia: recorte os espaços das pontas e compare sem
diferenciar maiúsculas. Ao **exibir**, use a grafia oficial do cadastro, inclusive
os erros de ortografia herdados, que são o vocabulário do cliente.

---

## Testes

- Ficam ao lado do que testam, como `*.test.ts`, ou em `test/` quando forem de
  integração.
- **Teste antes do código.** Ver a skill `template-caso-teste`.
- **Expectativa vem da regra de negócio, nunca lida da implementação.** Rodar o
  código, ver o resultado e colar como esperado transforma o teste em fotografia
  do defeito.
- Todo cálculo de agregação (efetivo, acumulado, resumo do dia, número do RDO)
  precisa de teste com valor de fronteira. Sem exceção: são os cálculos que a
  planilha errou.
- Nada de rede, relógio real nem sistema de arquivos em teste unitário. Injete.

---

## Comentário

Comente **por quê**, não o quê. O caso legítimo mais comum aqui é registrar uma
decisão de domínio contraintuitiva:

```ts
// A pessoa conta no efetivo do dia da saída: a data de saída é o último dia
// trabalhado. A planilha legada fazia dos dois jeitos em colunas diferentes.
// Ver docs/dominio/regras-extraidas.md, secao 1.1.
```

Comentário que repete o nome da função é ruído. Comentário que explica uma regra
do cliente vale mais que o código.

---

## O que o revisor sempre verifica

`any`, exceção engolida, duplicação que deveria estar em `shared/`, cálculo de
agregação sem teste, e data sem fuso definido. Escreva já sabendo disso.
