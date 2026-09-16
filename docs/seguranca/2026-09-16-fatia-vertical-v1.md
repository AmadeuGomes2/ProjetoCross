# Revisão de segurança — fatia vertical da v1

Data: 2026-09-16 · Commit: `d5dce94` · Escopo: os 140 arquivos do commit, mais
`.gitignore`, `next.config.ts`, `package.json`, `.env.example` e o histórico
completo do repositório.

Auditoria somente leitura. Nenhum arquivo de `src/` foi alterado.

---

## Verificado

### Dado pessoal — log

- `src/shared/log/index.ts:33-48` — `ContextoDeLog` só tem identificador,
  código de erro e contagem. Não existe campo de texto. **Passa.**
- Os 25 pontos que chamam `registra()` foram lidos um a um. Todos passam id,
  `codigo`, `perfil`, `dia` ou nada. Nenhum passa nome, e-mail, descrição,
  motivo ou observação. **Passa.**
- `console.log`: zero ocorrências em `src/` e em `test/`. As duas de
  `console.warn` (`src/db/migrate.ts:39`, `src/db/seed.ts:111`) imprimem frase
  fixa em script de linha de comando. **Passa.**
- `JSON.stringify` de objeto de domínio: as 18 ocorrências foram lidas. Uma é o
  escritor do próprio log (`src/shared/log/index.ts:65`, serializa `EventoDeLog`
  já tipado); uma é a fila de rascunho no navegador
  (`src/modules/lancamento/rascunho.ts:102`, ver ATENÇÃO 6); as outras 16 são
  asserções negativas de teste (`not.toContain('nome')`, `not.toContain('P1')`).
  Nenhum caminho de servidor serializa lançamento inteiro para log. **Passa.**
- `as` forçando campo para dentro do contexto de log: nenhum. Os 15 `as` de
  `src/` são conversão de tipo de marca em `shared/id`, `shared/date/dia` e
  `shared/decimal`, mais dois de teste. **Passa.**
- Log de erro carregando a mensagem da causa: os três `catch` de borda
  (`src/app/(lancamento)/acoes.ts:62-75`,
  `src/modules/rdo/borda/consulta-rdo.ts:53-77`,
  `src/modules/export/exporta-rdo-diario-em-pdf.ts:97-112`) registram apenas
  `causa.name`, nunca `causa.message`. **Passa.**

### Dado pessoal — mensagem de erro e rastro de pilha

- Mensagens interpoladas em `src/`: quatro, todas lidas.
  `src/modules/lancamento/regras.ts:226` e `src/shared/result/index.ts:122`
  interpolam número e identificador de correlação;
  `src/modules/obra/borda/campos.ts:36` interpola rótulo fixo de campo;
  `src/modules/rdo/avisos.ts:50` interpola o **nome do serviço controlado**, que
  vem do cadastro da obra e não é pessoa. Nenhuma ecoa texto livre do usuário.
  **Passa.**
- Rastro de pilha para o navegador: nenhum caminho o devolve. Os três `catch`
  citados acima trocam a exceção por `mensagemGenericaDeErro(correlacaoId)`.
  **Passa.**
- `src/modules/acesso/autenticacao.ts:106-112` — e-mail desconhecido e senha
  errada devolvem a mesma frase; `registraUsuario` não confirma quem já tem
  conta (`autenticacao.ts:81-90`). **Passa.**
- `src/modules/acesso/autorizacao.ts:27-33` — obra inexistente e obra sem acesso
  devolvem a mesma frase. **Passa.**

### Dado pessoal — URL

- `voltaCom` (`src/app/(cadastro)/acoes.ts:49-51`) põe a mensagem de erro na
  busca da URL. Como nenhuma mensagem ecoa entrada do usuário (item anterior),
  nada de pessoa entra ali. **Passa.**
- Nenhum caminho de rota carrega nome: os segmentos são `[obraId]`, `[data]`,
  `[dia]` e `[token]`. **Passa**, com a ressalva do token em OBSERVAÇÃO 2.

### Dado pessoal — PDF

- Bloco 5, efetivo pessoal: `src/modules/rdo/efetivo.ts:67-90` conta
  `pessoaId` distinto por `funcaoId` e emite coluna com rótulo = termo da função
  e quantidade. A porta `PessoaMobilizada`
  (`src/modules/rdo/portas.ts:81-85`) tem `pessoaId`, `funcaoId` e passagens —
  **não tem campo de nome**, então o nome não chega ao módulo. **Passa.**
- `src/modules/rdo/para-documento.ts:47-99` — `RdoParaDocumento` não tem campo
  de autor de lançamento nem de nome de trabalhador. A chave de renderização é
  `lancamentoId` e `servicoId`, nunca texto. **Passa.**
- Bloco 11, assinaturas (`src/modules/export/documento/documento-rdo.tsx:218-243`)
  imprime nome, titulação e CREA do responsável técnico. **É o documento**: a
  planilha de referência traz os três, e o fiscal os espera. Registrado como
  exposição consciente, não como achado.
- Metadados: `documento-rdo.tsx:270-278` — `author` e `creator` são a constante
  `'RDO digital'` (`documento/rotulos.ts:75-76`), `keywords` vazio, `title` é
  número do RDO mais data, `subject` é o contrato, `producer` é a mesma
  constante. Nenhum nome de pessoa. **Passa.**
- Nome do arquivo: `src/modules/export/nome-do-arquivo.ts:18-19` produz
  `rdo-<AAAA-MM-DD>-n<numero>.pdf`. Sem pessoa. **Passa.**
- Exportação é ato registrado: `exporta-rdo-diario-em-pdf.ts:77-91` grava a
  trilha **antes** de devolver o arquivo e recusa a entrega se a trilha falhar.
  A trilha guarda `usuarioId`, momento, obra, dia e formato — id, nunca nome.
  **Passa por desenho**; ver OBSERVAÇÃO 6 quanto ao estado de ligação.

### Dado pessoal — metadado de Excel

- Não se aplica: não há exportação em Excel na v1 e `exceljs` não é importado em
  lugar nenhum de `src/` nem de `test/`. **Passa** (ver OBSERVAÇÃO 4).

### Dado pessoal — resposta de servidor

- Lista de acessos: `src/modules/acesso/repositorio.ts:188-200` seleciona `id`,
  `usuarioId`, `perfil` e `liberadoEm`. **Sem nome e sem e-mail**, como a frente
  A relatou. A tela (`src/app/(cadastro)/obras/[obraId]/acesso/page.tsx:75-77`)
  mostra perfil e os 8 primeiros caracteres do id. **Confirmado, passa.**
- `listaHistoricoDoLancamento` (`src/modules/lancamento/casos.ts:769-790`)
  devolve `autorId`, não autor. **Passa** quanto ao campo; ver CRÍTICO 2 quanto
  a quem pode chamar.
- `src/app/(lancamento)/_dados.ts:96-122` devolve id, descrição, texto, termo e
  contagens. Nenhum campo a mais do que a tela usa. **Passa.**

### Dado pessoal — repositório

- `git log --all --pretty=format: --name-only --diff-filter=A` sobre todo o
  histórico: os únicos arquivos não-texto-fonte jamais acrescentados são
  `referencia/README.md` e `src/db/migrations/0000_esquema_inicial_v1.sql`.
  **Nenhum `.xlsm`, `.xlsx`, `.csv`, `.pdf`, `.db`, `.sqlite` ou imagem entrou,
  em commit nenhum.** Não há histórico a limpar. **Passa.**
- `git status --ignored --short`: `tmp/` aparece como ignorado e não rastreado,
  junto com `.next/`, `node_modules/`, `next-env.d.ts`, `tsconfig.tsbuildinfo` e
  `.claude/subagentes.log`. `/tmp/` está no `.gitignore`, assim como `*.pdf`,
  `*.xlsx`, `*.xlsm`, `*.csv` e `referencia/*`. **Passa.**

### Dado pessoal — fixture

- `test/fixtures/cenario-de-cadastro.ts:19-32` usa os dados do contrato (que são
  públicos: contrato, contratante, contratada, escopo, local) e **nenhum nome de
  pessoa**. Os atores são criados como `Pessoa <email>` com e-mail no domínio
  reservado `exemplo.invalido` (`cenario-de-cadastro.ts:49-52`).
- As duplas de teste dos módulos usam rótulos do PRD: `E1`, `C1`, `P1`, `MT-26`,
  `Motorista`, `Topografo`. Nenhum nome próprio de pessoa em `test/` nem nas
  pastas `teste/` dos módulos. **Passa.**

### Controle de acesso

- **Não existe `middleware.ts`.** Não há portão global: cada página precisa se
  proteger sozinha. Isso é o que torna CRÍTICO 1 e CRÍTICO 2 possíveis.
- **Não existe nenhum `route.ts`.** A superfície de servidor é 18 `page.tsx` e
  dois arquivos `'use server'`.
- As 8 páginas de `(cadastro)` foram conferidas uma a uma: todas chamam
  `atorDaRequisicao()`, redirecionam para `/entrar` quando não há sessão, e
  passam o ator para uma função `*Protegida`. **Passam.**
- `src/app/_composicao/cadastro.ts` — 21 funções chamam `autoriza()` (que é
  `exigeAcessoNaObra`) **antes** de validar a entrada. As quatro que não chamam
  foram verificadas: `criaObraProtegida:122` usa
  `exigePermissaoParaCriarObra`; `geraConviteProtegido:462` e
  `revogaAcessoProtegido:472` delegam a verificação ao módulo `acesso`, que a
  faz (`convite.ts:62` e `convite.ts:217`); `listaObrasDoUsuarioProtegida:481`
  filtra pelo próprio `usuarioId`. **Passam.**
- **Troca de id na requisição — revogação:** `revogaAcesso`
  (`src/modules/acesso/convite.ts:205-243`) resolve a obra a partir do
  _acesso alvo_ e só então exige engenheiro naquela obra. Adivinhar `acessoId`
  de outra obra não revoga nada. **Passa.**
- **Troca de id na requisição — consulta:** todas as 23 consultas de
  `src/modules/lancamento/repositorio-drizzle.ts` filtram por
  `eq(<tabela>.obraId, obraId)`, inclusive as de busca por id
  (`:108`, `:167`, `:195`, `:252`, `:366`, `:422`). A segunda camada existe.
  **Passa no repositório**; falha na borda, ver CRÍTICO 2.
- **Encarregado não lê nem escreve cadastro:** `listaPessoalProtegida:256`,
  `listaEquipamentosProtegida:318`, `listaHistoricoDeQuantidadeProtegido:397`,
  `cadastraPessoaProtegida:219`, `cadastraEquipamentoProtegido:285`,
  `defineQuantidadeDeProjetoProtegida:367`, `cadastraPeriodoBmsProtegido:173`,
  `defineResponsavelTecnicoProtegido:156` e `acrescentaTermoProtegido:419` todas
  exigem `'engenheiro'`. **Passa.**
- **Encarregado não fecha dia e não retifica (22.1):** verificado no servidor,
  em `src/modules/lancamento/casos.ts:588` e `casos.ts:629`, com teste explícito
  de perfil **depois** da autorização. É verificação própria do módulo, não
  depende de como a porta de acesso for ligada. **Passa.**
- **Dia fechado:** `src/modules/lancamento/regras.ts:157-162` e o caminho de
  retificação em `casos.ts:621-668`, que exige dia fechado, exige versão vigente
  e grava `retificaId` apontando para o original. **Passa.**
- **Ninguém altera o próprio papel:** não existe função de mudança de perfil. O
  perfil só nasce em `concedeAcessoDeEngenheiro`
  (`src/modules/acesso/concessao.ts:20-36`, na transação de criação da obra) e
  em `aceitaConvite` (`convite.ts:165-173`, sempre `'encarregado'`, com
  `check` no banco em `src/db/schema/acesso.ts:85`). **Passa.**
- **Convite:** hash SHA-256 gravado, token em claro nunca
  (`src/modules/acesso/token.ts:26-28`); uso único garantido por linhas afetadas
  dentro da transação (`convite.ts:158-177`), não pelo `SELECT` anterior; 7 dias
  (`convite.ts:31`); expiração conferida no servidor (`convite.ts:136-144`);
  vale para a obra gravada na linha do convite; revogável. **Passa.**
- **Sessão:** cookie `httpOnly: true`, `secure: true`, `sameSite: 'lax'`,
  `path: '/'`, com `expires`
  (`src/modules/acesso/token.ts:47-55`). Id opaco de 32 bytes aleatórios, hash
  no banco, expiração e revogação conferidas **a cada requisição**
  (`autenticacao.ts:171-187`). Sair invalida no servidor antes de apagar o
  cookie (`src/app/(cadastro)/sessao.ts:38-44`). O perfil **não** vem do cookie.
  **Passa**; ver OBSERVAÇÃO 1 sobre a duração.
- **Senha:** `scrypt` de `node:crypto`, sal de 16 bytes por usuário,
  `timingSafeEqual`, parâmetros gravados junto com o hash, hash malformado vira
  `false` em vez de exceção, e o caminho do e-mail inexistente paga o mesmo
  custo (`senha.ts:121-133`). Nada em `senha.ts` chama `registra()`, e nenhuma
  consulta de repositório devolve `hashDeSenha` para fora do módulo. **Passa**;
  ver ATENÇÃO 3 sobre o custo.

### Injeção, segredo e CVE

- **SQL:** nenhuma concatenação de valor de usuário. Os usos de `sql` são
  `CHECK`/índice parcial no esquema (`src/db/schema/*.ts`), com `sql.raw` só
  sobre constante de formato (`convencoes.ts:62,70,81,85`). O único SQL cru
  fora do esquema é de teste (`rotas-protegidas.test.ts:158-169`) e é
  parametrizado com `?`. Nenhum `ORDER BY` montado com entrada. **Passa.**
- **Texto livre — tamanho:** Zod limita todo campo na borda
  (`src/modules/lancamento/borda/esquemas.ts:57-58, 220, 265, 293, 327, 361-376`).
  Turno tem `max(4)`, quantidade `max(20)`, descrição e observação têm limite
  próprio. **Passa.**
- **Texto livre — escape no PDF:** `@react-pdf/renderer` desenha nós `Text`, não
  interpreta HTML; não há `dangerouslySetInnerHTML` nem `innerHTML` em lugar
  algum de `src/`. **Passa.**
- **Injeção de fórmula:** não se aplica na v1. Não há geração de `.xlsx` nem de
  `.csv`, e `exceljs` não é importado. **Registrado como não aplicável, e não
  como aprovado** — quando a exportação em Excel entrar, este item volta.
- **Consulta de período:** a v1 só tem RDO diário. A consulta mais larga é
  `producao.ate(obraId, data)` (`repositorio-drizzle.ts:188`), limitada por
  `lte(data, ate)` e pelo período contratual validado antes
  (`casos.ts:170-172`). Não existe endpoint que aceite intervalo escolhido pelo
  usuário. **Passa para o escopo atual.**
- `npm ls xlsx` → vazio. **Passa.**
- `package.json:23-26` — `overrides` de `uuid` em `^11.1.1` e de `esbuild` em
  `^0.25.0`, os dois presentes. **Passa.**
- `npm audit` e `npm audit --omit=dev` → `found 0 vulnerabilities`. **Passa.**
- **Segredo no histórico:** `git log -p --all` filtrado por
  `senha|password|secret|token|api[_-]?key` seguido de atribuição com valor →
  nenhuma ocorrência real. `.env.example` tem só chaves com valor vazio;
  `.env` e `.env.*` estão ignorados. O único `process.env` de `src/` é o caminho
  do banco (`src/db/index.ts:34`). Nenhuma variável `NEXT_PUBLIC_*`. **Passa.**
- `next.config.ts:7` — `poweredByHeader: false`. **Passa**; ver OBSERVAÇÃO 3.

---

## Achados

### CRÍTICO 1 — A página do RDO não autentica nem autoriza

- **Onde:** `src/app/(rdo)/rdo/[obraId]/[dia]/page.tsx:26-27`, com
  `src/app/_composicao/rdo-diario.ts:14-32`.
- **O que acontece:** a página lê `obraId` e `dia` da URL e chama
  `consultaRdoDaObra({ obraId, dia })` direto. Não chama `atorDaRequisicao()`,
  não chama `exigeAcessoNaObra`, e não existe `middleware.ts` que o faça por
  ela. O RDO renderizado contém o bloco 10 (observações, texto livre onde a
  planilha real prova que aparecem nomes de fiscais da prefeitura) e o bloco 11
  (nome, titulação e CREA do responsável técnico).

  Hoje isso não vaza porque as 11 portas de `rdo-diario.ts:50-62` são recusas
  fixas. **A falha é latente e o gatilho é o conserto:** a tabela de ligação em
  `rdo-diario.ts:16-28` lista as 11 portas de dado, diz "uma linha cada", e
  **não menciona a verificação de acesso**. Quem ligar as portas seguindo a
  própria documentação publica o RDO de qualquer obra, sem sessão nenhuma, num
  endereço adivinhável.

- **Como reproduzir:** ligar qualquer porta de `portasDoRdo` a uma
  implementação real e pedir `GET /rdo/<obraId>/2026-09-03` sem cookie de
  sessão. Não há ponto no caminho que recuse.
- **Correção sugerida:** a página obtém o ator e chama
  `exigeAcessoNaObra(ator, obraId, 'encarregado', amb)` antes de
  `consultaRdoDaObra`, no mesmo formato das 8 páginas de `(cadastro)`; e a
  tabela de ligação de `rdo-diario.ts` ganha uma primeira linha para a
  verificação de acesso, para que ela não seja a única coisa que falta ao final.

### CRÍTICO 2 — As telas de lançamento verificam sessão, não acesso à obra

- **Onde:** `src/app/(lancamento)/_dados.ts:77-94`, com
  `src/modules/lancamento/casos.ts:670-824` e
  `src/app/_composicao/lancamento.ts:82-84`.
- **O que acontece:** `carregaDadosDaTela` converte o segmento da URL em
  identificador (`_dados.ts:77`, `idConfiavel<'obra'>` não valida nada, só
  marca o tipo), confere **apenas** que existe um ator (`_dados.ts:82-83`) e em
  seguida lê atividades, observações, produção e serviços daquela obra
  (`_dados.ts:85-94`). **Em nenhum momento pergunta se este ator tem acesso a
  esta obra.**

  Os casos de uso de leitura também não perguntam, e é de propósito:
  `obtemDiaDeObra`, `estadoNaTela`, `listaAtividadesVigentes`,
  `obtemPluviometriaVigente`, `listaObservacoesVigentes`, `somaProducaoDoDia`,
  `somaProducaoAte`, `listaHistoricoDoLancamento` e
  `obtemPreenchimentoInicial` recebem `(obraId, data)` sem ator
  (`casos.ts:670-824`). A autorização de leitura pertence a quem chama, e o
  único chamador não a faz. O caminho de **escrita** está correto —
  `preparaEscrita` autoriza em `casos.ts:157-171` — o furo é só na leitura.

  Hoje não vaza porque `atorDaRequisicao()` em
  `src/app/_composicao/lancamento.ts:82-84` sempre recusa, e o comentário da
  linha 19 diz que trocar isso "é uma linha". É: e essa linha abre o furo.

- **Como reproduzir:** ligar `atorDaRequisicao` à sessão real; entrar como
  encarregado da obra A; pedir `/lancamento/<id-da-obra-B>/2026-09-03`. A tela
  mostra as atividades e as observações da obra B. Só é preciso o id, que
  aparece na URL de quem tiver acesso a ela.
- **Correção sugerida:** `carregaDadosDaTela` chama a mesma porta
  `exigeAcessoNaObra` que as escritas já usam, com `'encarregado'` como perfil
  mínimo, e devolve `vazia(...)` quando recusada. Alternativa mais robusta:
  dar aos casos de uso de leitura a mesma assinatura das escritas, recebendo
  `Ator` e devolvendo `AtorNaObra`, para que o tipo cobre a verificação como já
  cobre nas escritas.

### ATENÇÃO 1 — O teste que deveria pegar os dois críticos passa a vazio

- **Onde:** `src/modules/acesso/rotas-protegidas.test.ts:35-57`.
- **O que acontece:** `manipuladoresDeRota` varre `src/app` procurando
  `route.ts` ou `route.tsx`. **Não existe nenhum no repositório.** A asserção
  vira `expect([]).toEqual([])` e passa sem verificar coisa alguma. A superfície
  real — 18 `page.tsx` e 2 arquivos `'use server'` — não é coberta. É por isso
  que CRÍTICO 1 e CRÍTICO 2 atravessaram a entrega com tudo verde.
- **Como reproduzir:** `find src/app -name "route.ts" -o -name "route.tsx"` não
  devolve nada; o teste continua verde.
- **Correção sugerida:** varrer também `page.tsx` cujo caminho contenha
  `[obraId]`, exigindo que o arquivo cite `exigeAcessoNaObra` ou uma função
  `*Protegida`, e varrer os arquivos `'use server'` exigindo o mesmo. O teste
  deve falhar hoje, contra os dois críticos, antes de passar de novo.

### ATENÇÃO 2 — A porta de acesso do lançamento não tem a forma da função que vai preenchê-la

- **Onde:** `src/modules/lancamento/portas.ts:27-40` contra
  `src/modules/acesso/autorizacao.ts:46-51`.
- **O que acontece:** a porta pede
  `(ator, obraId, acao: AcaoProtegida) => Promise<Result<AtorNaObra, ...>>`; o
  módulo `acesso` oferece
  `(ator, obraId, perfilMinimo: Perfil, amb) => Result<AtorNaObra, ...>`,
  síncrona e com um argumento a mais. Ligar as duas exige um adaptador que
  traduza ação em perfil mínimo, e esse adaptador **não existe em lugar
  nenhum**. A afirmação de `src/app/_composicao/lancamento.ts:19` ("trocar cada
  uma é uma linha") está errada, e é exatamente na etapa de ligação que os dois
  críticos acima se materializam.

  Atenuante importante: a regra 22.1 não depende desse adaptador. O módulo
  confere o perfil por conta própria em `casos.ts:588` e `casos.ts:629`. Um
  adaptador ingênuo, que ignore a ação, ainda assim não deixa o encarregado
  fechar dia nem retificar.

- **Como reproduzir:** tentar atribuir `acesso.exigeAcessoNaObra` a
  `PortasDoLancamento['exigeAcessoNaObra']`; o TypeScript recusa.
- **Correção sugerida:** escrever o adaptador na raiz de composição, com o mapa
  ação → perfil mínimo explícito e comentado
  (`lancar` e `corrigir_lancamento` → `encarregado`; `fechar_dia` e
  `retificar_lancamento` → `engenheiro`), e cobrir o mapa com teste. A dupla de
  teste atual (`src/modules/lancamento/teste/duplas.ts:250-268`) **ignora o
  argumento `acao`**, então o contrato da porta nunca foi exercitado.

### ATENÇÃO 3 — Custo do `scrypt` abaixo da recomendação corrente

- **Onde:** `src/modules/acesso/senha.ts:24-26`.
- **O que acontece:** `N = 16384` (2^14), `r = 8`, `p = 1`, ou seja ~16 MiB por
  verificação. A recomendação atual do OWASP para `scrypt` é `N = 2^17, r = 8,
p = 1`; quando a memória não permite, as combinações equivalentes aceitas
  descem `N` **subindo `p`** (2^16/8/2, 2^15/8/3, 2^14/8/5). `2^14` com `p = 1`
  fica abaixo de todas elas. Não é exploração direta: é margem menor contra
  quebra de hash caso o banco vaze.
- **Como reproduzir:** leitura das constantes; comparar com a tabela do OWASP
  Password Storage Cheat Sheet.
- **Correção sugerida:** subir para `N = 2^17, r = 8, p = 1` se a máquina
  aguentar 128 MiB por verificação, ou `N = 2^14, r = 8, p = 5`. É barato: o
  formato já grava os parâmetros junto com o hash (`senha.ts:54-61`), então as
  senhas existentes continuam válidas e migram na próxima troca. Registrar a
  escolha como decisão, porque hoje o número não tem origem escrita.

### ATENÇÃO 4 — Endereço de servidor interno e árvore de pastas da empresa versionados

- **Onde:** `src/modules/obra/servico-controlado.ts:10`;
  `docs/dominio/mapa-planilha.md:318` e `:323`;
  `docs/dominio/inconsistencias.md:344`; `docs/qa/v1-casos-passos-1-3.md:177`.
- **O que acontece:** o `\\192.168.1.55` da rede da empresa está no repositório
  em quatro lugares, e em `mapa-planilha.md` com o caminho UNC completo,
  incluindo a árvore de pastas do setor de engenharia e o nome de **outro**
  cliente e de outra obra. A skill `checklist-seguranca` cita justamente esse
  endereço dizendo "isso não se repete aqui". Repetiu. Só a linha de
  `servico-controlado.ts` é deste commit; as de `docs/` são anteriores.
- **Como reproduzir:** `git grep -n "192\.168"`.
- **Correção sugerida:** trocar por descrição sem endereço ("um arquivo num
  servidor de arquivos da rede interna"). O comentário de
  `servico-controlado.ts` explica uma decisão de domínio e continua explicando
  sem o IP. Como está no histórico, decidir explicitamente se vale reescrevê-lo
  ou se o risco é aceito e por quem.

### ATENÇÃO 5 — Qualquer um cria conta de engenheiro e qualquer conta cria obra

- **Onde:** `src/app/(cadastro)/entrar/page.tsx:37-46` e
  `src/app/(cadastro)/acoes.ts:65-86`, com
  `src/modules/acesso/autorizacao.ts:78-93`.
- **O que acontece:** a página pública de entrada traz um formulário "Criar
  conta de engenheiro" sem convite, sem lista de permitidos e sem aprovação.
  `exigePermissaoParaCriarObra` deixa criar obra quem não tem acesso nenhum — o
  que é necessário para a primeira obra existir, e a própria função admite não
  estar no PRD. Somados, os dois significam que qualquer pessoa que alcance a
  aplicação vira engenheiro de uma obra própria, sem limite de contas nem de
  obras.

  Não é acesso a dado alheio: o filtro por obra segura a separação, e isso foi
  verificado. É auto-atribuição de perfil e criação ilimitada de recurso, numa
  v1 que é de uma obra só.

- **Como reproduzir:** abrir `/entrar`, preencher "Criar conta de engenheiro",
  ir a `/obras/nova` e criar uma obra. Repetir à vontade.
- **Correção sugerida:** decidir, com quem responde pelo produto, como nasce a
  primeira conta: semente na preparação do banco, lista de e-mails permitidos,
  ou convite de engenheiro. Enquanto não houver decisão, fechar o cadastro
  aberto é a opção menor. Também falta limite de tentativas na entrada.

### ATENÇÃO 6 — O rascunho local guarda texto livre, e o comentário diz que não guarda dado pessoal

- **Onde:** `src/modules/lancamento/rascunho.ts:15-18`, `:31-35`, `:102`,
  `:207-209`.
- **O que acontece:** o cabeçalho afirma "Nada de dado pessoal. O rascunho
  guarda o que foi digitado e os identificadores; não guarda nome". As duas
  metades se contradizem: `RascunhoDeAtividade.descricao` é exatamente o texto
  livre digitado pelo encarregado, e texto livre é onde o nome aparece — é o
  que a planilha real prova, com nomes de fiscais nas observações. O conteúdo
  fica em `localStorage`, em claro, sem prazo, removido só quando o envio é
  aceito. O aparelho do encarregado é, como o próprio arquivo diz, o ponto mais
  exposto do sistema.
- **Como reproduzir:** digitar uma atividade com nome de pessoa, ficar sem rede,
  e ler `localStorage['rdo.rascunhos.atividade']` no navegador.
- **Correção sugerida:** corrigir o comentário, que hoje faz o próximo revisor
  pular a checagem; e dar prazo ao rascunho — descartar item com mais de N dias
  na abertura da fila, e limpar no `sairAction`. Registrar a retenção como
  decisão.

### ATENÇÃO 7 — Teste solto em `src/` que grava PDF em disco

- **Onde:** `src/modules/export/zz-inspecao-temporaria.test.ts` (não versionado:
  `git status --short` mostra `??`).
- **O que acontece:** o arquivo renderiza PDFs de exemplo, grava `.pdf` e um
  dump de texto e metadados em disco a cada `npm run test`, e traz um caminho
  absoluto fixo com o nome de usuário do Windows do desenvolvedor. Não vazou
  nada: não está no histórico, o destino é fora do repositório e os dados são
  sintéticos. O risco é o próximo `git add .` versionar um teste que gera PDF de
  dentro de `src/`, contrariando "nada de sistema de arquivos em teste
  unitário" e o bloqueio de `*.pdf`.
- **Como reproduzir:** `git status --short`.
- **Correção sugerida:** apagar o arquivo, já que a inspeção que ele servia
  terminou. Se a inspeção precisar voltar, que seja um script fora de `src/`,
  com destino vindo de variável de ambiente.

### OBSERVAÇÃO 1 — Sessão de 12 horas sem decisão registrada, e sem expiração por inatividade

`src/modules/acesso/autenticacao.ts:30-39` reconhece que o número não tem
decisão. Doze horas é defensável para o cenário de canteiro — cobre a jornada
sem obrigar a entrar de novo com luva e sol na tela — e o cookie tem `expires`
casado com o banco. O que falta: a decisão escrita, e a escolha entre expiração
absoluta (o que existe) e por inatividade. Hoje a sessão vale 12 h mesmo se o
aparelho ficar parado, e não há renovação. Levar para quem responde pelo
produto junto com ATENÇÃO 5.

### OBSERVAÇÃO 2 — O token do convite passa pela URL, ao contrário do que o código afirma

`src/app/(cadastro)/acoes.ts:217-238` devolve `/convite/<token>` e a página é
`src/app/(cadastro)/convite/[token]/page.tsx`. A ação acertou em não redirecionar
com o token na busca, mas o link **é** um endereço: quando o encarregado o abre,
o token entra no histórico do navegador dele e no log de acesso do servidor. O
cabeçalho de `src/modules/acesso/convite.ts:8` diz que o token não entra "em URL
registrada nem histórico", e isso não é verdade. É inerente a link de convite e o
risco está contido por uso único e 7 dias; o que precisa mudar é a afirmação, que
hoje faz o item parecer verificado. Se o servidor de produção registrar caminho
completo, vale trocar o caminho por um formulário que receba o token em corpo de
requisição.

### OBSERVAÇÃO 3 — Sem cabeçalhos de segurança

`next.config.ts` só desliga `X-Powered-By`. Faltam, antes de produção: política
de segurança de conteúdo, `Strict-Transport-Security`, `Referrer-Policy`
(relevante aqui: o endereço carrega `obraId`), `X-Content-Type-Options` e
`X-Frame-Options`. Também não há regra de cache declarada para as telas que
mostram nome — as páginas de cadastro usam `dynamic = 'force-dynamic'`, o que
evita o cache do Next, mas não diz nada a um cache compartilhado à frente.

### OBSERVAÇÃO 4 — `exceljs` instalado e não usado

`package.json:33` traz `exceljs@4.4.0`, e não há uma única importação em `src/`
nem em `test/`. É ele que obriga o `overrides` de `uuid`. Como exportação em
Excel está fora do escopo da v1, remover a dependência tira a superfície e
possivelmente o override junto. Conferir com `npm audit` depois, como manda o
CLAUDE.md, e não remover sem perguntar: `package.json` é arquivo compartilhado.

### OBSERVAÇÃO 5 — Não existe caminho de apagamento ou anonimização de pessoa

Busca por `anonimiz`, apagamento de pessoa e exclusão em `src/` e `docs/`: nada.
O cadastro de pessoal só cresce. Uma pessoa que peça exclusão não tem caminho, e
o histórico de RDO já entregue não pode simplesmente perder a linha. A saída
usual é anonimizar o registro mantendo `pessoaId` e função, já que o RDO agrega
por função e nunca mostra nome — o documento entregue não muda. Não é dívida de
código, é decisão de produto que ainda não foi tomada.

### OBSERVAÇÃO 6 — A trilha de exportação ainda é recusa fixa

`src/app/_composicao/exportacao-rdo.ts:47-55` deixa `registraExportacao`
recusando, e `exporta-rdo-diario-em-pdf.ts:84-91` não entrega arquivo sem
trilha. Falha fechada, que é o comportamento certo. Além disso `exportaRdo` não
tem chamador: não há rota nem botão de exportação. Consequência para este laudo:
o requisito "exportação é ato registrado" está **correto no desenho e não
verificável em execução**. Quando a porta for ligada, conferir que a linha
gravada tem id e não nome, e que a falha de gravação continua impedindo a
entrega.

---

## Não verificado e por quê

- **Não executei `npm run test` nem `npm run build`, e não naveguei a
  aplicação.** A auditoria é somente leitura, e com as portas de dado em recusa
  fixa o comportamento em execução não seria o comportamento de produção — os
  dois críticos são justamente invisíveis nesse estado. `npm audit` e
  `npm ls xlsx` foram executados porque só leem.
- **Não abri a planilha real nem a lista dos 19 nomes.** `referencia/` está fora
  do repositório e é exatamente o que não se deve ler para fazer esta
  conferência. A verificação de fixture foi por forma — rótulos do PRD (`E1`,
  `C1`, `P1`), domínio reservado `exemplo.invalido`, ausência de nome próprio —
  e não por comparação com a lista real. Se algum dos 19 nomes for uma palavra
  comum, esta checagem não o pegaria; o que reduz o risco é que nenhuma fixture
  tem campo de nome de trabalhador preenchido com nome de pessoa.
- **Não inspecionei bytes de um PDF gerado.** A geração depende das portas em
  stub. A conferência de metadado foi feita no código que os define
  (`documento-rdo.tsx:270-278` e `rotulos.ts:75-76`), o que prova o que será
  escrito, mas não substitui ler o `/Author` de um arquivo real. Refazer quando
  a exportação estiver ligada.
- **Não avaliei HTTPS obrigatório, política de segurança de conteúdo em
  produção, cache compartilhado nem origem cruzada.** Não há configuração de
  implantação no repositório: nenhum `middleware.ts`, nenhum arquivo de
  plataforma. Sem isso, qualquer afirmação minha sobre transporte seria chute.
- **Não revisei o esquema das 22 tabelas coluna a coluna.** Li os `CHECK` e os
  índices parciais relevantes a acesso, perfil e convite
  (`src/db/schema/acesso.ts`, `usuario.ts`, `dia-de-obra.ts`, `lancamento.ts`).
  Retenção, índice sobre dado pessoal e chave estrangeira de `pessoa` ficaram de
  fora.
- **Não avaliei limite de tentativas de entrada com medição real.** Vi que não
  existe nenhum e registrei em ATENÇÃO 5; não medi quanto custa cada
  verificação de senha, que é o que diz se a ausência é explorável para negação
  de serviço (cada tentativa custa ~16 MiB e uma derivação `scrypt`, inclusive
  para e-mail inexistente).
