# Documentação do RDO digital

Esta é a porta de entrada. Ela diz **o que o sistema faz**, **onde está escrito
cada assunto**, **como o trabalho atravessa as telas**, **o que cada perfil
pode** e **quais comandos existem**.

O que ela **não** faz: repetir regra de negócio. Regra mora em
`docs/dominio/`, decisão mora em `docs/prd/`, contrato entre módulos mora em
`docs/arquitetura/`. Aqui há apontamento, nunca cópia — duas cópias divergem, e
depois ninguém sabe qual vale.

---

## 1. O que o sistema faz

CROS Construções executa pavimentação urbana para a Prefeitura de Montes
Claros. Todo dia ela entrega ao fiscal um **Relatório Diário de Obras**: efetivo
de pessoal por função, efetivo de equipamento, produção dos serviços
controlados, atividades do dia, condição de tempo, pluviometria e observações.
Esse documento é a base da medição. Hoje ele nasce numa planilha de 42 abas: o
encarregado manda o dia por WhatsApp, o engenheiro transcreve, confere se cada
uma das 31 abas de dia replicou certo e monta o consolidado à mão.

**A inversão central é esta: a planilha não é entrada do sistema, é a
especificação da saída.** A entrada é o **lançamento** — o registro atômico de
uma atividade, uma medição de produção, uma leitura de pluviômetro ou uma
observação, cada um com a data a que se refere, o autor e a hora de registro.
Quem lança é quem viu acontecer, do celular, no canteiro. O sistema não lê
planilha nenhuma.

**O RDO é sempre calculado, nunca armazenado pronto.** Pedir o RDO de 3 de
setembro é executar uma consulta sobre lançamentos, não abrir um registro
guardado. Daí saem três consequências que valem o projeto inteiro: a
transcrição some, porque o dado nasce onde acontece; a replicação some, porque
o dado existe uma vez só; e a conferência some **por construção**, porque não
existe réplica para conferir. Corrigir um lançamento de março corrige o
acumulado de setembro sem nenhuma ação extra. O que a planilha continua ditando
é só a **forma** do papel: os blocos, a ordem, os rótulos com a grafia exata —
inclusive os erros herdados, que são o vocabulário que o fiscal reconhece.

Detalhamento em `docs/spec.md`, seção 1.

---

## 2. Mapa da documentação

### Comece por aqui

| Arquivo                   | O que tem                                                              | Quando ler                                 |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| `README.md` (raiz)        | como rodar pela primeira vez, estado do projeto, aviso do ambiente     | primeiro contato com o repositório         |
| `CLAUDE.md`               | domínio em cinco parágrafos, Definition of Done, segurança, **escopo** | antes de escrever qualquer linha           |
| `docs/spec.md`            | inversão central, quem usa, restrições, fluxo da v1 em seis passos     | para entender o produto sem ler o código   |
| `docs/decisoes-do-rdo.md` | o que muda no relatório, em linguagem de dono do produto               | para conferir e aprovar o que foi decidido |

### Domínio — as regras e de onde vieram

| Arquivo                            | O que tem                                                             | Quando ler                                 |
| ---------------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `docs/dominio/mapa-planilha.md`    | as 42 abas, mestras contra derivadas, o layout do RDO bloco a bloco   | ao mexer em exportação ou em cabeçalho     |
| `docs/dominio/regras-extraidas.md` | as regras de cálculo em português, cada uma com `ABA!CÉLULA`          | ao implementar ou revisar qualquer conta   |
| `docs/dominio/inconsistencias.md`  | 42 defeitos da planilha, com célula, e os casos de teste obrigatórios | ao escrever teste de cálculo               |
| `docs/dominio/duvidas.md`          | 12 dúvidas, cada uma resolvida, pendente ou respondida com data       | quando faltar informação — **não invente** |

### Produto — o que foi decidido

| Arquivo                          | O que tem                                                                               | Quando ler                               |
| -------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `docs/prd/v1.md`                 | o PRD guarda-chuva: decisões numeradas, modelo de dados, critérios de aceite em Gherkin | antes de implementar qualquer passo      |
| `docs/prd/v1-decisoes.md`        | a folha de decisões de 16/09/2026, bloco a bloco, com o que foi recusado                | para saber **por que** algo é assim      |
| `docs/prd/decisoes-pendentes.md` | oito perguntas ainda abertas, nenhuma bloqueante hoje                                   | antes de decidir sozinho o que está aqui |
| `docs/prd/README.md`             | como se escreve um PRD neste projeto                                                    | ao abrir um PRD novo                     |

### Arquitetura — o contrato

| Arquivo                       | O que tem                                                                      | Quando ler                          |
| ----------------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| `docs/arquitetura/v1.md`      | esquema físico tabela a tabela, os oito módulos, fronteiras de confiança       | antes de tocar em esquema ou módulo |
| `docs/arquitetura/periodo.md` | o RDO de um conjunto de dias: tipo do pedido, tipo do resultado, os três modos | ao mexer em exportação de período   |

### Verificação

| Arquivo                                          | O que tem                                                                           | Quando ler                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `docs/qa/v1.md`                                  | matriz de 265 casos, os 15 obrigatórios do domínio, o não coberto                   | ao planejar cobertura de teste                                      |
| `docs/qa/v1-casos-passos-1-3.md`                 | CT-001 a CT-085, cadastro e liberação de acesso                                     | ao testar cadastro                                                  |
| `docs/qa/v1-casos-passo-4.md`                    | lançamento do dia                                                                   | ao testar lançamento                                                |
| `docs/qa/v1-casos-passo-5.md`                    | RDO diário na tela                                                                  | ao testar cálculo do RDO                                            |
| `docs/qa/v1-casos-passo-6.md`                    | exportação em PDF                                                                   | ao testar exportação                                                |
| `docs/seguranca/2026-09-16-fatia-vertical-v1.md` | laudo de segurança da fatia vertical                                                | antes de fechar mudança que toca dado pessoal, perfil ou exportação |
| `docs/fidelidade/2026-09-16-rdo-diario.md`       | conferência do PDF contra o gabarito escrito, com o que ficou **não conferido**     | ao mudar o documento                                                |
| `docs/design/auditoria-e-plano.md`               | auditoria das telas, dez problemas, plano em cinco frentes e o que a captura provou | ao mexer em interface                                               |

### Gabaritos executáveis

Em `.claude/skills/` há seis gabaritos consultáveis: `regras-rdo` (as contas do
RDO), `fidelidade-documento` (blocos, rótulos e unidades do papel),
`padroes-codigo`, `checklist-seguranca`, `template-prd` e `template-caso-teste`.
São a forma curta do que os documentos acima explicam por extenso.

---

## 3. Os fluxos, ponta a ponta

Três caminhos, pelas telas que existem hoje. Toda rota abaixo foi conferida em
`src/app/`.

### 3.1 Como uma obra nasce

Não há cadastro público: a primeira conta de engenheiro nasce por comando de
instalação (decisão 25.1) e o encarregado nasce por convite (decisão 14.0).

1. **Primeira conta.** `npm run criar-engenheiro -- --email ... --nome "..."`. A
   senha é pedida por prompt, sem eco, e confirmada duas vezes. Não existe
   `--senha`: argumento de linha de comando fica no histórico do shell.
2. **Entrar** em `/entrar`. A sessão é cookie; o perfil **nunca** vem do cookie,
   é verificado contra a tabela `acesso` a cada requisição.
3. **Criar a obra** em `/obras/nova`: contrato, contratante, contratada, datas de
   início e término, escopo, nome, área e local, mais **pelo menos um período de
   BM'S** (decisão 21.1). Criar a obra já concede acesso de engenheiro ao criador,
   na mesma transação.
4. **Cadastrar o básico**, pelas abas de `/obras/<obra>`: `…/pessoal`,
   `…/equipamento`, `…/servicos` (quantidade de projeto) e `…/taxonomia` (as
   listas de função, tipo de equipamento e status, pré-carregadas pelo seed e
   editáveis).
5. **Liberar o encarregado** em `/obras/<obra>/acesso`: o engenheiro gera um
   link de **uso único**, válido por **7 dias**. O encarregado abre
   `/convite/<token>`, cria nome, e-mail e senha ali mesmo, e passa a ver aquela
   obra e só ela. Link gasto, expirado ou inválido cai em `/convite/recusado`.

Depois disso, `/obras/<obra>` abre em **estado**, não em formulário: as portas do
dia e o painel das duas últimas semanas, cada dia marcado como trabalhado, parado
ou não lançado.

### 3.2 Como um dia vira RDO na mão do fiscal

1. **O encarregado abre a obra** em `/obras` e toca "Lançar hoje", que leva a
   `/lancamento/<obra>/<AAAA-MM-DD>`. O dia de obra não precisa existir antes:
   ele é criado no primeiro lançamento.
2. **A tela do dia é um índice de blocos**, cada um com quantos lançamentos tem.
   Nada exige o dia inteiro numa tela só:
   - `…/dia` — trabalhado ou parado (com motivo obrigatório em texto livre, com
     oito sugestões) e a condição de tempo dos três turnos;
   - `…/atividades` — uma atividade por vez, com descrição e status escolhido de
     lista;
   - `…/producao` — a quantidade executada por serviço controlado;
   - `…/observacoes` — o texto livre da contratada.
3. **Cada envio é um lançamento atômico**, com data, autor e hora de registro.
   O que se repete todo dia vem pré-preenchido do dia anterior, para confirmar em
   vez de digitar, e o rascunho carrega uma chave que impede duplicar quando a
   rede cai e o envio é repetido.
4. **O engenheiro abre `/rdo/<obra>/<AAAA-MM-DD>`** e vê o documento montado na
   tela: cabeçalho, número do RDO, BM'S, efetivo por função, efetivo de
   equipamento, produção com executado/acumulado/projeto/percentual, atividades,
   pluviometria, observações e assinatura. **Nada disso está guardado**: é
   consulta sobre os lançamentos, a cada abertura.
5. **O engenheiro exporta** pelo controle "Exportar em PDF", que chama
   `GET /rdo/<obra>/<AAAA-MM-DD>/pdf`. Antes de entregar o arquivo, o sistema
   grava a trilha: quem, quando, qual obra, qual período. Sem trilha, não há
   exportação.
6. **O PDF vai para o fiscal.** É o mesmo layout que ele já conhece.

Pendência conhecida: **fechar o dia não tem tela**. A ação de servidor existe
(`src/app/(lancamento)/acoes.ts`, `fechaODia`) e o módulo `lancamento` já trata
dia fechado, retificação encadeada e exclusão lógica, mas nenhum componente
chama a ação. Só se chega ao estado "fechado" por código ou por script.

### 3.3 Como se exporta um período

1. **O engenheiro abre `/obras/<obra>`.** O seletor de período fica na visão
   geral e **só aparece para ele**.
2. **Escolhe os dias.** Um intervalo (`de`/`até`) ou dias avulsos marcados a dedo
   numa grade dos últimos 45 dias, agrupada por mês. O conjunto não precisa ser
   contíguo: 02, 05 e 09 é um pedido legítimo.
3. **Escolhe o modo**: só o consolidado, só os diários, ou o consolidado com os
   diários anexados atrás.
4. **Escolhe o formato**: PDF ou Excel.
5. **Envia**, e o navegador faz `POST /rdo/<obra>/periodo` — POST porque uma
   lista de 30 datas numa URL entra em log de servidor, em histórico e em
   `referrer`, e porque a exportação **escreve** a trilha.
6. **O servidor autoriza, monta e registra.** Uma linha de trilha por dia,
   amarradas por um `loteId`, gravadas **antes** de o arquivo sair.

O que o consolidado faz com cada bloco — média por dia no efetivo, contagem de
dias por letra na pluviometria, a lista de números de RDO — está em
`docs/decisoes-do-rdo.md`, seção 4, e no contrato em `docs/arquitetura/periodo.md`.

---

## 4. O que cada perfil pode

Fonte viva: `test/permissoes-por-perfil.test.ts` e
`src/app/_composicao/cadastro.ts`. As regras mudaram em **17/09/2026**; a tabela
abaixo é a de depois. Em toda linha, **engenheiro cobre o que encarregado
cobre**.

| Operação                                             | Engenheiro | Encarregado |
| ---------------------------------------------------- | :--------: | :---------: |
| Criar obra                                           |    sim     |     não     |
| Editar cadastro da obra e responsável técnico        |    sim     |     não     |
| Cadastrar, editar e excluir período de BM'S          |    sim     |     não     |
| Ler cabeçalho da obra, períodos e BM'S do dia        |    sim     |     sim     |
| Cadastrar pessoa, registrar passagem, trocar função  |    sim     |     não     |
| Ler a lista de pessoal e a mobilização               |    sim     |   **sim**   |
| Cadastrar equipamento e registrar passagem           |    sim     |   **sim**   |
| Encerrar passagem de equipamento                     |    sim     |     não     |
| Ler a frota e a mobilização de equipamento           |    sim     |   **sim**   |
| Ler os serviços controlados                          |    sim     |     sim     |
| Definir quantidade de projeto e ler o histórico dela |    sim     |     não     |
| Acrescentar termo à taxonomia                        |    sim     |     não     |
| Ler termos e sugestões de motivo de parada           |    sim     |     sim     |
| Lançar e corrigir lançamento com o dia aberto        |    sim     |     sim     |
| Fechar o dia                                         |    sim     |     não     |
| Retificar ou excluir lançamento em dia fechado       |    sim     |     não     |
| **Consultar o RDO na tela**                          |    sim     |   **não**   |
| Exportar o RDO diário em PDF                         |    sim     |     não     |
| Consultar e exportar o RDO de período                |    sim     |     não     |
| Gerar convite, listar acessos e revogar acesso       |    sim     |     não     |

Duas coisas que nenhuma decisão de perfil move:

- **Quem não tem acesso à obra não recebe nada** — nem o dado, nem a confirmação
  de que a obra existe. Obra inexistente e obra sem acesso devolvem o mesmo erro.
- **Esconder o botão não é controle de acesso.** A verificação acontece no
  servidor, em toda requisição, em duas camadas: a função protegida da composição
  e o `obra_id` obrigatório em toda consulta de repositório. O controle de
  exportação some da tela do encarregado **e** a rota recusa com 403.

---

## 5. Operação

Precisa de Node 20.9 ou mais novo. **O banco é Postgres** desde 17/09/2026 —
antes era SQLite em arquivo, e serverless não tem disco persistente.

Há dois jeitos de rodar na sua máquina, e o primeiro não exige conta em lugar
nenhum:

| Jeito           | Como                                        | Quando                             |
| --------------- | ------------------------------------------- | ---------------------------------- |
| **banco local** | `RDO_BANCO_LOCAL=1`, ou `npm run dev:local` | desenvolver e demonstrar           |
| **Neon**        | `DATABASE_URL` no `.env.local`              | conferir contra o banco de verdade |

O banco local é **PGlite**, o Postgres compilado para WebAssembly, rodando
dentro do processo e gravando em `tmp/banco-local`. É o mesmo motor que a suíte
de testes usa: mesmo dialeto, mesmas migrations, mesmas restrições. Não é um
segundo dialeto, e por isso não recria o problema que a migração resolveu.

Duas coisas para saber sobre ele:

- **um processo por vez.** A pasta abre com exclusividade, então pare o
  `npm run dev:local` antes de rodar `npm run demonstracao`;
- **encerrar à força corrompe a pasta.** Se o banco não abrir mais, apague
  `tmp/banco-local` e rode a demonstração de novo — ela repovoa tudo.

| Comando                    | Quando se usa                                                             |
| -------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`              | desenvolver contra o `DATABASE_URL` do `.env.local`                       |
| `npm run dev:local`        | desenvolver com o banco local, sem nuvem; sobe em `http://localhost:3000` |
| `npm run build`            | conferir que a produção compila                                           |
| `npm start`                | rodar o build de produção                                                 |
| `npm run lint`             | antes de commitar: `eslint` mais `prettier --check`                       |
| `npm run format`           | quando o `lint` reclamar de formatação                                    |
| `npm run typecheck`        | `tsc --noEmit`; pega o que o teste não pega                               |
| `npm run test`             | a suíte inteira, uma vez; é o que fecha uma tarefa                        |
| `npm run test:watch`       | enquanto se escreve o teste                                               |
| `npm run db:migrate`       | aplicar as migrations num banco novo ou atrasado; idempotente             |
| `npm run db:seed`          | carregar as taxonomias herdadas; idempotente                              |
| `npm run db:preparar`      | os dois acima, em ordem: é o que se roda na primeira vez                  |
| `npm run db:generate`      | gerar migration nova depois de mexer no esquema Drizzle                   |
| `npm run criar-engenheiro` | criar a **primeira** conta de engenheiro, que não tem caminho pela web    |
| `npm run demonstracao`     | criar contas, obra e um mês de obra fictícia; é o que prepara o ambiente  |
| `npm run telas`            | capturar as telas com Playwright; a saída vai para `tmp/telas/`           |
| `npm run console`          | varrer as rotas e reportar o que o console do navegador reclamar          |
| `npm run perfis`           | entrar como cada perfil e conferir, no navegador, o que foi combinado     |

### Do zero a um ambiente com dado

Três comandos, sem nuvem e sem passo manual no navegador:

```bash
npm install
RDO_BANCO_LOCAL=1 npm run demonstracao
npm run dev:local
```

Entre em `http://localhost:3000/entrar` com uma das duas contas:

| Perfil      | E-mail                   | Senha              |
| ----------- | ------------------------ | ------------------ |
| engenheira  | `engenheira@obra.local`  | `Engenheira#2026`  |
| encarregado | `encarregado@obra.local` | `Encarregado#2026` |

**Essas duas contas são de banco descartável** e estão escritas em
`scripts/demonstracao.ts`. Não existem fora da sua máquina.

O que a demonstração faz, e por que vale confiar nela: ela **cria o que falta**
— a conta de instalação da engenheira (decisão 25.1), a obra do contrato, a
conta do encarregado por convite de verdade, gerado e aceito — e depois lança um
mês de obra. Tudo **pelos casos de uso, nunca por `INSERT`**, então ela quebra
aqui se alguma regra for violada, em vez de quebrar na frente do cliente. É
idempotente: rodar de novo dá o mesmo banco.

Todo nome que ela carrega é inventado — dado de trabalhador é dado pessoal sob a
LGPD, e captura de tela circula.

Contra o Neon em vez do banco local, o caminho continua sendo
`npm run db:preparar` mais `npm run criar-engenheiro`, com `DATABASE_URL`
apontando para a string **direta** (ver `docs/deploy.md`).

`telas`, `console` e `perfis` exigem o servidor no ar: os três descobrem a obra,
o dia e as sessões sozinhos por `scripts/contexto-de-telas.ts`, que **entra pelo
navegador**, como uma pessoa entraria. Ele não abre o banco — com o banco local
não conseguiria, porque o servidor já o está segurando.

---

## 6. Mapa do código

```
src/shared/     dia puro, decimal exato, id tipado, taxonomia, erro, log, contrato
src/db/         esquema Drizzle, migrations, seed, criar-engenheiro, migrate
src/modules/    acesso, taxonomia, obra, pessoal, equipamento, lancamento, rdo, export
src/app/        rotas do App Router: (cadastro), (lancamento), (rdo), _composicao
test/           os testes que atravessam módulos, com banco de verdade
scripts/        demonstração, captura de telas, varredura de console, validação de perfis
```

Os oito módulos, e o que cada um sabe:

| Módulo        | Responsabilidade                                                                 |
| ------------- | -------------------------------------------------------------------------------- |
| `acesso`      | usuário, sessão, perfil na obra, convite, instalação da primeira conta           |
| `taxonomia`   | as listas editáveis de função, tipo de equipamento e status                      |
| `obra`        | cadastro da obra, períodos de BM'S, serviços controlados e quantidade de projeto |
| `pessoal`     | pessoa e passagem pela obra; entrega passagens, **não conta ninguém**            |
| `equipamento` | equipamento e passagem pela obra, mesma forma                                    |
| `lancamento`  | o coração da inversão: o registro atômico, o estado do dia, a vigência           |
| `rdo`         | só cálculo, nenhum banco: efetivo, acumulado, número do RDO, transbordo          |
| `export`      | o documento: PDF, Excel e a trilha de exportação                                 |

**A regra dura: módulo não importa módulo.** O consumidor declara a **porta** — o
tipo da função de que precisa —, o produtor exporta uma função com a mesma forma,
e a ligação acontece em `src/app/_composicao/`, o único lugar do sistema que
importa de mais de um módulo. Pasta com `_` não vira rota no App Router.

A conferência das duas pontas é estrutural: se `rdo` e `export` divergirem sobre
o que é um documento, quem acusa é o `tsc` na linha da composição — não o fiscal
recebendo um papel torto.

Os arquivos da composição, e o que cada um liga:

| Arquivo                                         | Liga                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `ambiente.ts`, `ambiente-de-cadastro.ts`        | a conexão e o relógio, numa forma só                                           |
| `sessao.ts`                                     | quem é o portador da requisição, e nada além disso                             |
| `cadastro.ts`                                   | as operações de cadastro protegidas: **autoriza antes de validar**             |
| `lancamento.ts`                                 | ação → perfil mínimo, e as portas do módulo `lancamento`                       |
| `rdo-diario.ts`                                 | as onze portas do RDO diário                                                   |
| `rdo-de-periodo.ts`                             | as portas do consolidado, presas ao conjunto autorizado                        |
| `exportacao-rdo.ts`, `exportacao-de-periodo.ts` | o documento e a trilha, nessa ordem                                            |
| `impacto.ts`                                    | quantos dias e quantas exportações uma edição de cadastro encontra pela frente |

Outras duas regras que o código sustenta e que valem repetir aqui porque são
transversais: **exclusão nunca apaga linha** (as leituras passam por um portão
único em `src/modules/lancamento/vigencia.ts`) e **data de obra é dia puro, sem
hora**, resolvida no fuso da obra pelo servidor, nunca pelo relógio do navegador.

Estado hoje: **830 testes em 69 arquivos, todos passando** (`npm run test`,
17/09/2026).

---

## 7. Fora do escopo da v1

**A fonte é `CLAUDE.md`, seção "Fora do escopo da v1".** Se um pedido cair
naquela lista, a regra é perguntar antes de fazer. A lista também aparece, com o
motivo de cada item, em `docs/spec.md`, seção 7.

Duas ressalvas, porque a lista está desatualizada e ignorar isso custa tempo:

- **RDO de período e exportação em Excel saíram do "fora do escopo"** pelas
  decisões do dono do produto de 17/09/2026 (`DP1` a `DP9`). Estão implementados
  e testados. `docs/arquitetura/periodo.md`, seção 0, registra que a atualização
  do `CLAUDE.md` e do `docs/prd/v1.md` ficou pendente com o coordenador.
- **O resto da lista continua valendo**: mapa linear por estaca, assinatura
  digital, fluxo de aprovação do contratante, múltiplas obras simultâneas,
  importação da planilha legada, foto anexada à atividade, integração com o mapa
  de controle e controle de presença diária.

Também continua **não conferido** o que depende da planilha de referência, que
não está no repositório: fonte, corpo, espessura de borda, largura de coluna e
alinhamento fino do PDF. Ver `docs/fidelidade/2026-09-16-rdo-diario.md`.
