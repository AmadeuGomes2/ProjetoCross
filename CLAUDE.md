# CLAUDE.md

Instruções do projeto RDO digital. Leia antes de qualquer trabalho aqui.

---

## Domínio, em cinco parágrafos

**A obra.** CROS Construções S.A. executa serviços de pavimentação urbana para a
Prefeitura Municipal de Montes Claros, MG. Contrato `P0476/01-25 - BLOCO 02`,
início em 05/02/2026, término previsto em 05/02/2027. Um engenheiro responsável e
um encarregado de obra tocam o dia a dia.

**O RDO.** Relatório Diário de Obras é o documento contratual que a contratada
entrega ao fiscal da prefeitura. Registra, por dia: efetivo de pessoal por função,
efetivo de equipamento por identificador, produção dos serviços controlados com
executado, acumulado, quantidade de projeto e percentual, as atividades do dia com
status, a condição de tempo e a pluviometria por turno, e as observações de cada
lado. É a base da medição, agrupada em períodos chamados BMS.

**Como é hoje.** Tudo numa planilha `.xlsm` de 42 abas. Dez abas guardam dado de
verdade; 31 são cópias umas das outras, uma por dia do mês, cujo único conteúdo
próprio é a data. O encarregado manda o dia por WhatsApp, o engenheiro transcreve,
confere se replicou certo em cada aba e monta o semanal e o mensal à mão.

**A inversão central.** **A planilha não é entrada do sistema. É a especificação da
saída.** A entrada é o lançamento feito por pessoas. Lançamento é o registro
atômico, com data, autor e hora de registro. RDO diário, semanal e mensal são
visões calculadas sobre lançamentos, nunca armazenadas prontas. Com isso a
transcrição some, a replicação some, e a conferência some por construção.
O sistema **não lê planilha nenhuma**.

**O que herdamos e o que não.** As taxonomias, os blocos e o layout do documento
são herdados com as grafias exatas, inclusive os erros (`Perca de produção`,
`Impraticavél`, `INDICE ACUMUALDO`), porque são o vocabulário que o fiscal
reconhece. Os defeitos de cálculo da planilha não são herdados, e cada um virou
caso de teste obrigatório.

Leitura obrigatória antes de mexer em regra de negócio:

| Arquivo                            | O que tem                                             |
| ---------------------------------- | ----------------------------------------------------- |
| `docs/spec.md`                     | inversão central, perfis, fluxo da v1, fora do escopo |
| `docs/dominio/mapa-planilha.md`    | as 42 abas, mestras contra derivadas, layout do RDO   |
| `docs/dominio/regras-extraidas.md` | as regras de negócio em português, com a origem       |
| `docs/dominio/inconsistencias.md`  | defeitos da planilha, com célula, e os casos de teste |
| `docs/dominio/duvidas.md`          | o que ainda não foi decidido; não invente resposta    |

---

## Stack e comandos

- Next.js 16, App Router · React 19 · TypeScript com `strict: true`
- ESLint 10 flat config · Prettier · Vitest
- ExcelJS para escrita de `.xlsx`

```
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run lint        # eslint + prettier --check
npm run format      # prettier --write
npm run test        # vitest run
npm run test:watch  # vitest em modo watch
npm run typecheck   # tsc --noEmit
```

**Nunca instale o pacote `xlsx` do npm.** Está parado na 0.18.5, com prototype
pollution na leitura de arquivo (CVE-2023-30533, afeta até a 0.19.2). Usamos
ExcelJS. O `uuid` transitivo dele está fixado por `overrides` em 11.1.1 porque a
versão que ele pede tem advisory aberto; não remova esse override sem rodar
`npm audit`.

---

## Definition of Done

Uma tarefa só está pronta quando **as quatro** valem:

1. **Código** escrito e funcionando, dentro do escopo pedido, sem sobra.
2. **Teste passando**, com a saída real do `npm run test` colada. Teste escrito
   antes do código. Expectativa derivada da regra de negócio, nunca lida da
   implementação.
3. **Revisão** pelo agente `revisor-codigo`, com os itens Crítico resolvidos.
4. **Segurança** pelo agente `seguranca` quando a mudança toca dado de pessoa,
   permissão entre perfis, exportação, log ou dependência nova.

"Deve funcionar" não é pronto. Se não rodou, não está pronto.

---

## Segurança

**Dado de trabalhador é dado pessoal, sob a LGPD.** A planilha real tem 19 nomes
completos com função e data de admissão, o nome, a titulação e o CREA do
engenheiro responsável, nomes de fiscais da prefeitura e metadados de autoria.
O contrato ser público não torna a lista nominal publicável.

Regras duras:

- **Nenhum arquivo de obra real versionado.** Nem planilha, nem PDF exportado, nem
  dump de banco, nem captura de tela com nome. O `.gitignore` bloqueia
  `referencia/`, `*.xlsm`, `*.xlsx` e `*.pdf`. Fixture de teste é sintética, e
  para versionar uma precisa de exceção nominal, arquivo por arquivo.
- **Nenhum segredo no repositório.** Só `.env.example`, sempre sem valores.
- **O RDO agrega pessoal por função, nunca por nome.** O documento que circula não
  precisa dizer quem trabalhou.
- **Erro nunca vaza stack trace** para o usuário. A mensagem diz o que fazer, o
  detalhe técnico fica no log do servidor com um identificador de correlação.
- **Erro nunca vaza nome de pessoa.** Nem em log, nem em mensagem, nem em URL, nem
  em metadado de PDF ou de Excel gerado. Identifique por id, não por nome.
- **Exportação é ato registrado:** quem, quando, qual obra, qual período.
- **Perfis são fronteira de confiança.** O encarregado não vê nem edita o que é do
  engenheiro, e não vê dado de outra obra. Isso é verificado no servidor, em toda
  requisição. Esconder botão na interface não é controle de acesso.
- Toda entrada vinda do navegador é hostil até prova em contrário: validar tipo,
  faixa e domínio no servidor, sempre.

---

## Modelo

- **Lançamento é atômico.** Uma atividade, uma medição de produção, uma leitura de
  pluviômetro, uma observação. Cada um com data a que se refere, autor e hora de
  registro.
- **Lançamento de dia fechado só muda pelas mãos do engenheiro, e nunca em
  silêncio.** Enquanto o dia está aberto, o autor corrige o que é dele. Depois de
  fechado, **só o engenheiro** corrige ou exclui, de qualquer autor, e as duas
  versões ficam no histórico: a correção vira retificação encadeada, a exclusão é
  lógica e exige motivo. Decisão 30.1, de 16/09/2026, que ampliou a regra
  anterior de "imutável no dia fechado". O que não mudou é o essencial: **RDO
  entregue ao fiscal não muda sem deixar rastro.**
- **Exclusão nunca apaga linha.** `excluido_por`, `excluido_em` e
  `motivo_exclusao` nas quatro tabelas de lançamento; as leituras do RDO filtram
  por um portão único em `lancamento/vigencia.ts`. Apagar de verdade deixaria
  duas versões do mesmo dia sem ninguém saber qual vale.
- **RDO é sempre calculado, nunca armazenado pronto.** Diário, semanal e mensal
  são consultas sobre lançamentos. Corrigir um lançamento de março tem que
  corrigir o acumulado de setembro sem nenhuma ação extra. Se você sentir vontade
  de gravar um RDO montado numa tabela, pare: é sinal de que o cálculo está caro e
  o certo é otimizar a consulta, não duplicar o dado.
- **Data de obra é dia puro, sem hora.** Fuso definido e explícito em um lugar só.
  Nunca dependa do fuso do servidor nem do navegador. Um lançamento feito às 23h
  no celular pertence ao dia que o encarregado escolheu, não ao dia do relógio.
- **Taxonomia é tabela de domínio editável**, não constante no código. A planilha
  prova que a lista cresce: a validação já aponta para duas linhas vazias de
  reserva.

---

## Fidelidade do documento

O PDF exportado é comparado contra o layout da planilha de referência, guardada em
`referencia/`, fora do repositório.

**Divergência de layout é defeito, não preferência.** O RDO é lido por um fiscal
que já conhece o formato; um documento que não parece um RDO gera pedido de
correção e atrasa medição.

O que precisa bater: os blocos, a ordem deles, os rótulos com a grafia exata, as
unidades e os totais. O gabarito está em
`.claude/skills/fidelidade-documento/SKILL.md`, e o agente `fidelidade-documento`
verifica. Ele reporta, não corrige.

Mudança de layout só entra com aprovação explícita de quem responde pelo produto.

---

## Mobile

**Toda tela de lançamento é desenhada primeiro para celular, em pé, com uma mão.**

O encarregado lança no canteiro, possivelmente com luva, sol na tela e sinal
instável. A comparação não é com outro software: é com mandar um áudio no
WhatsApp, que custa três segundos. Se lançar for mais trabalhoso que isso, ele não
usa e o produto falha.

Portanto:

- alvo de toque grande; nada de tabela com rolagem horizontal;
- o que se repete todo dia vem preenchido do dia anterior, para confirmar em vez
  de digitar;
- escolher de lista onde houver taxonomia; digitar só o que é livre;
- o que foi digitado não se perde quando a rede cai, e sincroniza depois;
- nada de exigir o dia inteiro numa tela só.

Desenhar para desktop e depois "adaptar" é o caminho errado aqui.

---

## Fora do escopo da v1

**Se eu pedir algo desta lista, pergunte antes de fazer.**

- Mapa linear por estaca, a aba `LINEAR`. O domínio não foi compreendido: não
  sabemos o que são PE, CV, PD, APP, nem o código 5. Ver `duvidas.md`, dúvida 8.
- RDO semanal e mensal. Dependem de um layout que ainda não existe.
- Exportação em Excel. O PDF é o que o fiscal recebe.
- Assinatura digital do RDO.
- Fluxo de aprovação e comentário do contratante.
- Múltiplas obras simultâneas.
- Importar a planilha legada. Ver `duvidas.md`, dúvida 9.
- Foto anexada à atividade.
- Integração com o mapa de controle em servidor de arquivos.
- Controle de presença diária. Ver `duvidas.md`, dúvida 11.

Perguntar custa uma frase. Construir fora do escopo custa a semana.

---

## Contexto

Relatório de subagente: **no máximo 15 linhas**.

- Referencie `arquivo:linha`. Quem quiser o código, abre.
- **Não cole código** no relatório. Nem trecho, nem diff, nem saída inteira de
  comando. Cite o resultado e o caminho.
- Diga o que mudou, o que quebrou e o que ficou pendente. Nessa ordem.
- Sem preâmbulo, sem repetir o enunciado da tarefa, sem resumo do resumo.
- Se a conclusão é incerta, diga que é incerta e o que falta para decidir.

Vale para todos os agentes em `.claude/agents/`.

---

## Trabalho em paralelo

Com mais de uma frente aberta ao mesmo tempo:

- **Cada agente edita só o módulo atribuído a ele.** Sem incursão em módulo
  vizinho, nem para "consertar de passagem".
- **Exigem perguntar antes de tocar**, sempre, porque são compartilhados:
  - `package.json` e `package-lock.json`
  - migrations e esquema de banco
  - arquivos de configuração: `tsconfig.json`, `eslint.config.mjs`,
    `next.config.ts`, `vitest.config.mts`, `.claude/**`
  - `src/shared/**`
- Precisou de algo do módulo alheio? Peça o contrato, não edite o arquivo.
- Antes de paralelizar, o agente `arquiteto` define o modelo de dados e o contrato
  entre módulos. Sem isso, duas frentes produzem duas verdades.
- Duplicação que deveria estar em `src/shared/` é apontada pelo `revisor-codigo`.
  Se você precisou copiar, diga; não copie em silêncio.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
