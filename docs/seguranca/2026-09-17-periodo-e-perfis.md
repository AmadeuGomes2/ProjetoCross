# Revisão de segurança — período, perfis e exportação em Excel

Data: 2026-09-17 · Escopo: `git log c7af33f~1..HEAD`, 12 commits, 87 arquivos.
Mudança de matriz de perfis, exportação de RDO por período, gerador de Excel,
aviso de impacto, edição de cadastro de obra e de BM'S.

Auditoria anterior: `docs/seguranca/2026-09-16-fatia-vertical-v1.md`.

---

## Verificado

### Dado pessoal (prioridade 1)

- **Log.** `ContextoDeLog` (`src/shared/log/index.ts:34-48`) continua sem campo
  de texto livre: só identificador, dia, perfil, código e contagem. Nome de
  pessoa não entra por descuido porque não compila. Mecanismo re-conferido, não
  presumido.
- **`console.log`.** Zero ocorrências em `src/`. As quatro linhas que a busca
  acha são comentários dizendo que é proibido.
- **Log da exportação de período.** `exporta-rdo-de-periodo.ts:116-131` e
  `export/repositorio.ts:105-119` registram `obraId`, `usuarioId` e
  `quantidade`. **A lista de dias não vai para o log**, como pedido. A causa da
  exceção entra como `causa.name`, nunca `causa.message`.
- **Conjunto de dias fora da URL.** `POST /rdo/<obra>/periodo`
  (`src/app/(rdo)/rdo/[obraId]/periodo/route.ts:23`), corpo JSON. O cliente
  (`src/app/(rdo)/_componentes/seletor-de-periodo.tsx:126-131`) usa `fetch` com
  `body`, sem query. Nenhum `?dias=` em nenhum caminho. O download é por
  `createObjectURL`, que não vira histórico nem `referrer`.
- **Nome do arquivo.** `nome-do-arquivo-de-periodo.ts:28` monta
  `rdo-periodo-<data>-a-<data>.<ext>` a partir de dois `DiaPuro` já validados.
  Sem nome de pessoa e sem texto de usuário no `content-disposition`.
- **Metadado do PDF de período.** `periodo/documento/envelope.tsx:25-33`:
  `author` e `creator` são a constante `'RDO digital'`
  (`export/documento/rotulos.ts:107-108`), `keywords` vazio, `title` são datas,
  `subject` é o número do contrato.
- **Metadado do Excel.** `planilha-de-periodo.ts:90-91` grava `creator` e
  `lastModifiedBy` como `'RDO digital'`. Conferido **nos bytes**, não no
  comentário: gerei uma pasta com o mesmo escritor e li `docProps/core.xml` —
  `dc:creator`, `cp:lastModifiedBy` constantes, `dc:title`, `dc:subject`,
  `dc:description`, `cp:keywords`, `cp:category` vazios; `docProps/app.xml` com
  `Company` e `Manager` vazios.
- **O documento agrega por função.** `PessoaMobilizada`
  (`src/modules/rdo/portas.ts:93-96`) tem `pessoaId` e passagens, **sem campo de
  nome**. `export/periodo/portas.ts:19` reafirma "nenhum campo de nome de
  trabalhador e nenhum campo de autor". O único nome nos dois formatos é o do
  responsável técnico, no bloco 11 de assinatura — layout herdado, e é o que
  motivou fechar o RDO no engenheiro.
- **Excel não carrega nada que o PDF não carregue.** Comparei
  `excel/linhas-do-consolidado.ts` com `documento/documento-de-periodo.tsx` e
  `excel/linhas-do-diario.ts` com o diário: mesmos blocos, mesmos campos, mesma
  origem (o mesmo `PacoteParaDocumento`). A planilha concatena `pagina1` e
  `continuacao`, que é divisão de papel, não corte de dado.
- **Recusa sem nome.** `test/permissoes-por-perfil.test.ts:192-203` e
  `src/app/_composicao/rdo-de-periodo.test.ts:212-219` afirmam isso. A mensagem
  é frase única (`acesso/autorizacao.ts:29-34`), e obra inexistente e obra sem
  acesso devolvem a mesma (CT-075) — conferido também para o período.
- **Repositório.** `git log --all --stat` filtrado por `.xlsx .xlsm .xls .pdf
.png .jpg .sqlite .db .csv .env`: nenhum arquivo em commit nenhum.
  `git status --ignored`: só `.next/`, `node_modules/`, `tmp/`,
  `.claude/worktrees/`, `.claude/subagentes.log`, `tsconfig.tsbuildinfo`.
- **Fixture sintética.** Nenhum nome próprio em `test/fixtures/`. Os nomes dos
  testes novos são `P1`, `P9`, `TR-77`, `eng@exemplo.invalido`.
- **Exportação é ato registrado.** `registro_exportacao` grava `usuario_id`,
  `momento`, `obra_id`, `data_rdo`, `formato` e `lote_id` — **uma linha por
  dia**, numa transação, **antes** de o arquivo ser devolvido
  (`exporta-rdo-de-periodo.ts:91-110`; `export/repositorio.ts:78-104`). Trilha
  que falha impede a entrega do arquivo. Confirmado.

### Controle de acesso (prioridade 2)

- **Duas camadas na exportação de período, confirmadas.** Camada 1: a rota usa
  `comAtorNaObra('engenheiro', …)` (`periodo/route.ts:23`), que lê a tabela
  `acesso` em toda requisição, sem cache (`acesso/autorizacao.ts:150-156`).
  Camada 2: o módulo recusa de novo em `exporta-rdo-de-periodo.ts:67-73`. Existe
  ainda uma terceira: `portasDoRdoDePeriodoProtegidas`
  (`_composicao/rdo-de-periodo.ts:350-359`) exige `engenheiro` antes de entregar
  porta nenhuma. **O `perfil` que o módulo confere não vem do navegador**: sai de
  `AtorNaObra`, que sai da linha do banco. `respondeComOPeriodoExportado` tem um
  único chamador, a rota — verificado por grep.
- **`(rdo)/rdo/[obraId]/[dia]/page.tsx` agora autentica** (linhas 46-50:
  `atorDaRequisicao`, `redirect('/entrar')`, `consultaRdoProtegida`). Era
  CRÍTICO 1 do laudo de 16/09. **Fechado.**
- **O teste-guardião deixou de passar a vazio.** `rotas-protegidas.test.ts` foi
  reescrito: varre `page.tsx`, `route.ts` e todo arquivo com `'use server'`, e
  afirma primeiro o tamanho do que encontrou. Era ATENÇÃO 1 de 16/09.
  **Fechado.**
- **RDO virou do engenheiro.** `_composicao/rdo-diario.ts:238-252`: perfil mínimo
  passou de `'encarregado'` para `'engenheiro'`. Vale para a tela e para a rota
  do PDF, porque as duas passam por ali. Recusa provada em
  `permissoes-por-perfil.test.ts:126-129`.
- **As três ações novas autorizam.** `editarObraAction`, `editarPeriodoAction` e
  `excluirPeriodoAction` (`src/app/(cadastro)/acoes.ts:318-371`) chamam funções
  que começam por `autoriza(ator, obraId, 'engenheiro', amb)`
  (`_composicao/cadastro.ts:570, 588, 615`).
- **O encarregado continua barrado onde importa**, no servidor e com teste:
  cadastrar pessoa, encerrar passagem de equipamento, definir quantidade de
  projeto, acrescentar termo, ver a lista de acessos, consultar o RDO
  (`permissoes-por-perfil.test.ts:125-180`).
- **Esconder botão não virou controle.** A tela de pessoal esconde os
  formulários com `ehEngenheiro` (`pessoal/page.tsx`), e o servidor recusa de
  qualquer forma. As duas camadas existem.
- **`impacto.ts` autoriza antes de ler.** `autorizado()` (linha 112-114) roda
  antes de toda consulta, nas quatro funções públicas (linhas 129, 146, 177,
  200). Sem acesso, devolve `NADA`, que é indistinguível de "não houve impacto"
  — **não dá para deduzir nada sobre obra alheia pela contagem**. Toda consulta
  de `contaNaJanela` e `impactoDasPassagens` filtra por `obraId`, inclusive as
  que recebem `periodoId`, `pessoaId` e `equipamentoId` da borda — não há IDOR
  por adivinhar id. Provado em `test/impacto-de-alteracao.test.ts:179-185`.
- **Segunda camada no banco intacta.** Toda consulta de
  `lancamento/repositorio-drizzle.ts` filtra por `obraId`, inclusive as novas
  `dosDias` e `nosDias` (linhas 144, 240, 343, 451, 559).
- **`buscaAcessoAtivo`** (`acesso/repositorio.ts:174-178`) casa `usuarioId` **e**
  `obraId`. A fronteira da obra é uma linha da tabela, não uma checagem de tela.
- **Validação da entrada da rota.** `leiaPedidoDeExportacao`
  (`exportacao-de-periodo.ts:189-224`) recusa corpo não-objeto, `dias` vazio ou
  não-array, item não-string, dia que o calendário não tem, modo fora da lista e
  formato fora de `PDF|XLSX`. Ordena e deduplica no servidor, sem confiar na
  tela. Corpo ilegível vira 400 sem detalhe de analisador
  (`periodo/route.ts:27-33`).

### Injeção, segredo e CVE (prioridade 3)

- **Injeção de fórmula no Excel: verificada nos bytes, não no comentário.**
  Gerei uma pasta com o mesmo escritor de `planilha-de-periodo.ts:42-49`,
  contendo `-`, `=1+1`, `+55 na estaca`, `@fresagem`, `=cmd|' /C calc'!A0` e
  `-2+3+cmd|' /C calc'!A0`, e li o XML cru. **Todas as sete células saem como
  `<c t="s">`**, apontando para `sharedStrings.xml`; não existe **nenhum**
  elemento `<f>` no arquivo. Célula `t="s"` é texto declarado no formato, e o
  Excel não a avalia ao abrir — ao contrário de CSV. O `numFmt="@"` é segunda
  camada. `escreveAba` (linhas 62-73) não tem caminho que escape de
  `escreveTexto` para valor não-numérico, e `{ formula: … }` não aparece em
  lugar nenhum do gerador. **A afirmação do cabeçalho se sustenta.**
- **Texto livre.** Descrição de atividade e observação vão para PDF e Excel como
  texto. O PDF é `@react-pdf/renderer`, que não passa por HTML. Limite de
  tamanho: validado no lançamento, fora deste escopo.
- **`npm audit`: `found 0 vulnerabilities`.**
- **`npm ls xlsx`: vazio.** O pacote proibido não entrou, nem transitivo.
- **Os dois `overrides` continuam em `package.json`:** `uuid: ^11.1.1` e
  `esbuild: ^0.25.0`. É o `uuid` que mantém o audit limpo apesar do ExcelJS.
- **Nenhuma dependência nova.** O diff de `package.json` no escopo é uma linha:
  o script `perfis`. `exceljs@4.4.0` já estava.
- **Segredo.** Busca por `senha|password|secret|token|api_key` com valor
  atribuído em todo o diff do escopo: nada. `.env.example` sem valores;
  `.env.local` não existe no repositório.
- **Endereço interno.** Nenhum `192.168.*`, `10.*` nem caminho UNC em `src/` ou
  `scripts/`.
- **Transporte.** `poweredByHeader: false` em `next.config.ts:7`. A resposta da
  exportação leva `cache-control: no-store`
  (`exportacao-de-periodo.ts:176-177`) — documento com dado de obra não fica em
  cache compartilhado.
- **Suíte.** `npm run test`: 69 arquivos, **830 testes, todos passando**.

---

## Achados

Nenhum CRÍTICO.

### ATENÇÃO 1 — A exportação de período não tem teto de dias, e o teto existe

- **Onde:** `src/app/_composicao/exportacao-de-periodo.ts:189-224`
  (`leiaPedidoDeExportacao`).
- **O que acontece:** a função valida cada dia, mas **nunca confere quantos
  dias vieram**. O teto do projeto existe, está escrito e está testado —
  `DIAS_MAXIMOS_DA_CONSULTA = 366` em `src/modules/rdo/borda/esquemas.ts:76`,
  aplicado por `interpretaPedidoDeRdoDePeriodo`
  (`src/modules/rdo/borda/esquemas-de-periodo.ts:92-103`), que confere o
  comprimento _antes_ de olhar item nenhum, exatamente pelo motivo certo. Só que
  o único chamador dessa função é
  `src/modules/rdo/borda/consulta-de-periodo.ts:41`, e
  `consultaRdoDePeriodo` **não tem chamador nenhum** — verifiquei por grep em
  `src/` e `test/`. A borda que carrega a defesa é código morto; a composição
  reimplementou uma validação mais fina e a rota usa essa.
- **Consequência concreta:** um POST com dezenas de milhares de datas de
  calendário válidas é aceito e processado. `portasDoRdoDePeriodoProtegidas`
  (`_composicao/rdo-de-periodo.ts:362`) manda o conjunto inteiro para
  `instantaneoDoPeriodo`, que monta cinco consultas com um `inArray` de N
  parâmetros — antes de qualquer conferência de período de contrato. No modo
  `diarios`, `montaPacote` (`exportacao-de-periodo.ts:81-85`) entra num laço de
  uma montagem de RDO diário **por dia** antes de o consolidado existir. O
  contrato acaba limitando o laço, porque `montaRdoDiario`
  (`src/modules/rdo/monta-rdo-diario.ts:50-55`) recusa dia fora dele e o laço
  aborta no primeiro — mas a leitura grande, o `JSON.parse` do corpo grande e a
  alocação do array acontecem antes disso, e o route handler do App Router não
  aplica limite de tamanho de corpo por padrão.
- **Como reproduzir:** autenticado como engenheiro da obra, `POST
/rdo/<obraId>/periodo` com `{"modo":"diarios","formato":"PDF","dias":[…]}` e
  50.000 datas distintas e válidas (p.ex. de 1900-01-01 em diante). Compare com
  o mesmo pedido passando por `interpretaPedidoDeRdoDePeriodo`, que recusa em
  `PERIODO_LONGO_DEMAIS` sem tocar em item nenhum.
- **Por que ATENÇÃO e não CRÍTICO:** exige sessão válida de engenheiro **com
  acesso àquela obra**. Não vaza dado, não dá acesso indevido, não executa
  código. É desgaste de servidor por dentro, que é o que o próprio
  `leitura-de-periodo.ts:15-18` chama de superfície de ataque.
- **Correção sugerida:** aplicar o teto em `leiaPedidoDeExportacao`, **antes** do
  laço que valida cada dia, e decidir o destino de `consulta-de-periodo.ts`. Uma
  borda morta guardando a defesa boa enquanto o caminho vivo usa outra mais
  fraca é exatamente como este furo nasceu; duas validações para a mesma entrada
  vão divergir de novo.

### ATENÇÃO 2 — A fronteira da obra não é pinada com duas obras

- **Onde:** `test/permissoes-por-perfil.test.ts:182-204`, bloco "a fronteira da
  obra, que nenhuma decisão de perfil move".
- **O que acontece:** o bloco testa só `estranho`, um ator **sem acesso nenhum a
  obra nenhuma**. O cenário (`beforeEach`, linhas 81-94) cria **uma** obra. Não
  existe, em lugar nenhum da suíte, um caso em que o **encarregado da obra A**
  tenta ler a obra B pelo id. É justamente a troca de identificador na
  requisição que o checklist manda testar, e este conjunto de commits mexeu
  exatamente na matriz de perfis.
- **O mecanismo está de pé** — conferi os dois níveis: `buscaAcessoAtivo`
  (`src/modules/acesso/repositorio.ts:174-178`) casa `usuarioId` **e** `obraId`,
  e toda consulta de `src/modules/lancamento/repositorio-drizzle.ts` filtra por
  `obraId`. Não encontrei caminho que vaze. O problema é que hoje isso é
  invariante mantido por leitura de código, não por teste: trocar `obraId` por
  um parâmetro esquecido numa consulta nova passaria verde.
- **Como reproduzir:** no cenário do teste, criar uma segunda obra com outra
  engenheira e chamar `listaPessoalProtegida(encarregado, obraDaOutra)`,
  `listaEquipamentosProtegida`, `cadastraEquipamentoProtegido` e
  `impactoDoCabecalho`. Deve recusar em todas, com a mesma frase.
- **Correção sugerida:** um `describe` com duas obras, um caso por operação que
  mudou de perfil em 17/09. É o único jeito de a decisão de perfil e a fronteira
  da obra ficarem independentes uma da outra no teste, como já são no código.

### ATENÇÃO 3 — Leitura nominal pelo encarregado: defensável, mas sem dono e sem trilha

- **Onde:** `src/app/_composicao/cadastro.ts:288` (`listaPessoalProtegida`,
  `'engenheiro'` → `'encarregado'`), com a justificativa em
  `src/app/(cadastro)/obras/[obraId]/pessoal/page.tsx:3-10`.
- **É defensável, e a resposta é sim.** O encarregado convive com essas pessoas
  todo dia, mobiliza e desmobiliza gente no canteiro, e precisa conferir quem
  está na obra antes de lançar o efetivo. Ele já sabe os nomes; negar a lista
  não protege dado nenhum e empurra a conferência para o WhatsApp, que é pior.
  A superfície de vazamento **não cresceu**: o RDO continua agregando por função
  (`PessoaMobilizada` sem campo de nome), os metadados continuam constantes, o
  log continua sem campo de texto, e o encarregado continua sem cadastrar,
  alterar ou desmobilizar pessoa.
- **O que muda, e precisa ficar escrito:** o número de contas que leem a lista
  nominal completa — nome, função, datas de admissão e saída — passou de uma
  para N. Combinado com a sessão de **12 h absoluta, sem expiração por
  inatividade** (`acesso/autenticacao.ts`, `HORAS_DE_SESSAO`; item 1 das
  decisões pendentes de 16/09), num aparelho de canteiro, o custo de um celular
  perdido subiu de "lançar RDO indevido" para "lista nominal do efetivo".
- **O que falta, e não é código:** (a) a decisão que reverte o CT-034 está
  registrada em comentário de teste e de página, não em `docs/decisoes-do-rdo.md`
  com **quem** decidiu e **quando** — achado sem dono volta como novo a cada
  auditoria; (b) **exportação é ato registrado, leitura de lista nominal não é**
  (`CLAUDE.md`, Segurança). Não havia por que registrar quando só o engenheiro
  lia. Com N encarregados, "quem abriu a lista nominal e quando" passa a ser
  pergunta respondível, e hoje não é.
- **Correção sugerida:** nada no código de permissão — ele está certo. Registrar
  a decisão com autor e data, e decidir se a leitura da lista nominal entra na
  trilha. Reavaliar a sessão de 12 h à luz de quem agora vê a lista.

### OBSERVAÇÃO 1 — Os dois instantâneos de `montaPacote`: correção, não segurança

- **Onde:** `src/app/_composicao/exportacao-de-periodo.ts:66-85`, já declarado
  pelo próprio autor.
- **Não é risco de segurança.** A autorização já aconteceu na linha 57, para o
  mesmo `obraId`, e `criaPortasDoRdo` recebe esse mesmo `obraId` em cada
  `montaRdoDiario` — que por sua vez passa por um repositório que filtra por
  `obraId` em toda consulta. Nenhum dado de outra obra entra; nenhuma
  autorização é pulada; a trilha continua correta, com uma linha por dia.
- **É risco de correção, e é real.** Uma retificação gravada entre a leitura do
  instantâneo e a montagem dos anexos faz o consolidado discordar dos diários
  que ele anexa, **dentro do mesmo arquivo**. O documento vai ao fiscal como
  base de medição; um resumo que não bate com a evidência que o acompanha é
  pedido de correção e atraso de medição, e a divergência não deixa rastro
  nenhum de que houve retificação no meio.
- **Onde encosta em segurança:** não defeita a trilha, mas produz documento
  internamente inconsistente sem nada que explique por quê. Com um encarregado a
  janela é de milissegundos, como o comentário diz. Com dois, ou com o
  engenheiro retificando enquanto exporta, deixa de ser desprezível.
- **Correção sugerida:** expor as portas do diário sobre o mesmo
  `InstantaneoDoPeriodo`, como o contrato (`docs/arquitetura/periodo.md`, 3)
  pede. Enquanto não for, manter a divergência declarada onde está.

### OBSERVAÇÃO 2 — Fórmula sobrevive a um "salvar como CSV"

O `.xlsx` está correto e provado. Se o fiscal salvar a planilha como `.csv` e
reabrir, `=1+1` numa descrição de atividade volta a ser fórmula, porque CSV não
carrega tipo de célula. Prefixar com apóstrofo resolveria e **quebraria a
fidelidade do documento** — o `-` de produção zero tem que imprimir `-`. A troca
está certa do jeito que está; fica registrado para não ser "descoberto" como
defeito depois.

### OBSERVAÇÃO 3 — Mensagem de erro na query da URL

`voltaCom` (`src/app/(cadastro)/acoes.ts:54-56`) devolve o erro por
`?erro=<mensagem>`, que entra em histórico, log de servidor e `referrer`.
Nenhuma mensagem alcançável interpola nome de pessoa — conferi todas as que
interpolam entrada: `obra/borda/campos.ts:36,43,80` (rótulo de campo),
`obra/periodo-bms.ts:100` (número), `obra/servico-controlado.ts:59` (nome de
serviço) e `taxonomia/casos-de-uso.ts:119` (termo). As duas últimas põem texto de
cadastro da obra na URL. Não é dado pessoal e é anterior a este escopo, mas é o
caminho pronto para o dia em que uma mensagem citar uma pessoa.

---

## Não verificado e por quê

- **Bytes reais do PDF de período.** Verifiquei os metadados no código-fonte do
  envelope, não renderizando e lendo o dicionário `/Info` do PDF, como fiz com o
  Excel. `@react-pdf/renderer` pode acrescentar `/Producer` próprio. Fica para a
  próxima passada; o Excel era o formato novo e foi onde gastei a verificação.
- **Comportamento real do Excel da Microsoft.** Provei que o arquivo não contém
  fórmula e que as células são `t="s"`. A conclusão de que o Excel não avalia
  célula `t="s"` vem da especificação do formato, não de um teste numa máquina
  com Excel instalado. Tenho alta confiança; não é certeza empírica.
- **A carga real do ATENÇÃO 1.** Não executei o pedido de 50.000 dias contra um
  servidor: seria gerar carga, e a instrução é auditar sem alterar. A cadeia de
  chamadas está verificada linha a linha; **o número de dias em que o servidor
  cai não está medido.**
- **Limite de tamanho de corpo em produção.** Depende de proxy reverso e de
  configuração de implantação, que não existem neste repositório.
- **Sessão, convite e retenção.** Fora do diff deste escopo. Continuam como o
  laudo de 16/09 deixou: sessão de 12 h absoluta, convite com expiração, uso
  único e obra única. O ATENÇÃO 3 acima muda o peso da primeira, não a
  implementação.
- **Apagamento e anonimização de pessoa.** Continua sem caminho em `src/` e sem
  decisão de produto. Não é achado novo; é o item 4 das decisões pendentes de
  16/09, e agora com mais leitores da lista nominal.
- **Política de segurança de conteúdo e HTTPS obrigatório.** Ainda não definidos.
  São de implantação, e o projeto não chegou lá.
