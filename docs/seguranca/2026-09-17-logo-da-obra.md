# Revisão de segurança — logo da obra

Data: 2026-09-17 · Escopo: a mudança **não commitada** de hoje, 21 arquivos
modificados e 6 novos (`git status`). Upload, gravação, serviço da imagem,
desenho no PDF e as permissões que cercam os três.

Arquivos lidos linha a linha: `src/modules/obra/logo.ts`,
`src/app/(cadastro)/obras/[obraId]/logo/route.ts`,
`src/app/(cadastro)/acoes.ts:386-432`, `src/app/_composicao/cadastro.ts:117-134`
e `:651-710`, `src/app/_composicao/logo-para-documento.ts`,
`src/db/schema/obra.ts:31-102`, `src/modules/obra/repositorio.ts:53-100`,
`src/modules/export/documento/documento-rdo.tsx:47-80`,
`src/app/(cadastro)/obras/[obraId]/page.tsx:125-210`,
`src/app/_composicao/exportacao-rdo.ts:38-64`,
`src/app/_composicao/exportacao-de-periodo.ts:53-90`, mais os três testes novos.

Auditorias anteriores: `docs/seguranca/2026-09-16-fatia-vertical-v1.md` e
`docs/seguranca/2026-09-17-periodo-e-perfis.md`.

**Não há achado CRÍTICO.** Três ATENÇÃO e quatro OBSERVAÇÃO.

---

## Verificado

### 1. Upload e serviço do arquivo (prioridade da tarefa)

- **O tipo declarado pelo navegador é ignorado, de verdade.**
  `enviarLogoAction` (`acoes.ts:400-422`) lê `dados.get('logo')` e usa **só**
  `size` e `arrayBuffer()`. Não há nenhuma leitura de `arquivo.type` nem de
  `arquivo.name` em lugar nenhum do caminho — grep por `.name`, `filename` e
  `type` nos três arquivos do upload volta vazio. O `accept=` do `<input>`
  (`page.tsx:187`) é conveniência de tela, não defesa.
- **A prova é por bytes, e os comprimentos de assinatura são respeitados um a
  um.** `identificaImagem` (`logo.ts:77-114`): PNG exige 8 bytes exatos,
  JPEG 3, WebP exige `RIFF` no início **e** `WEBP` no oitavo byte — um WAV, que
  também é RIFF, é recusado, e há teste para isso (`logo.test.ts:62-68`).
- **SVG está fora, por decisão escrita** (`logo.ts:14-19`, `logo.test.ts:50-55`,
  `docs/decisoes-do-rdo.md`). É o único formato de imagem que executa script no
  navegador; recusá-lo é o que fecha o vetor principal de XSS armazenado.
- **O `Content-Type` servido não é controlável por quem envia.** Ele vem da
  coluna `logo_tipo`, que só recebe o retorno de `identificaImagem`; o `CHECK`
  `ck_obra_logo` (`schema/obra.ts:85-89`) limita a coluna aos três valores; e na
  leitura `obtemLogoDaObra` (`logo.ts:214-215`) **confere o valor lido contra a
  lista** em vez de usar `as`, devolvendo `null` se não bater. Três camadas para
  decidir um cabeçalho — proporcional, porque é esse cabeçalho que decide se o
  navegador executa alguma coisa.
- **`X-Content-Type-Options: nosniff` está presente** (`logo/route.ts:88`), junto
  com `Content-Disposition: inline` **sem `filename`** (`:89`). Com nosniff, um
  polyglot — arquivo que começa com assinatura JPEG válida e carrega HTML
  adiante — é entregue como `image/jpeg`, o navegador não sniffa, não acha
  imagem decodificável e mostra ícone quebrado. Não há execução. O que resta de
  polyglot é o item ATENÇÃO 2, que é sobre metadado, não sobre execução.
- **Nome do arquivo enviado não atravessa para cabeçalho nem para log.** Não é
  lido. `Content-Disposition` é literal.
- **Sem obra ou sem logo a rota responde 404 com `no-store`**
  (`logo/route.ts:58-61`), igual para "obra não existe" e "obra não é sua" —
  porque a recusa acontece antes, em `comAtorNaObra`, com 403 genérico.
- **`dynamic = 'force-dynamic'`** (`logo/route.ts:39`) e `cache-control:
private, no-cache` (`:98`) impedem que a imagem de uma obra fique em cache
  compartilhado. O `ETag` é SHA-256 dos bytes, e só é obtido por quem já passou
  pela autorização — não é oráculo para quem está de fora.

### 2. Controle de acesso entre perfis

- **A rota passa por `comAtorNaObra('encarregado', …)`**
  (`logo/route.ts:41`), que é o embrulho obrigatório: 401 sem sessão, 403 sem
  `obraId` e 403 sem acesso, tudo antes do manipulador correr
  (`autorizacao.ts:127-159`, provado em `rotas-protegidas.test.ts:180-233`).
- **Dupla camada.** Dentro do manipulador, `obtemLogoProtegida`
  (`cadastro.ts:697-710`) chama `exigeAcessoNaObra` **de novo**, e o `obraId`
  usado é o do `AtorNaObra` já verificado, não o da URL crua.
- **A matriz está certa e testada contra o servidor**, não contra a tela:
  `logo-integracao.test.ts:141-176` prova que o encarregado lê, não grava e não
  remove, e que quem não tem acesso à obra nem lê nem grava. As escritas exigem
  `'engenheiro'` (`cadastro.ts:669` e `:682`).
- **Troca de id na requisição falha no servidor.** `GET
/obras/<obra-alheia>/logo` cai em `exigeAcessoNaObra` → 403; a mesma coisa
  para o campo escondido `obraId` do formulário, porque `defineLogoProtegida`
  autoriza antes de tocar no banco.
- **O alargamento de `autoriza` de `Ator` para `PortadorDeAcesso`
  (`cadastro.ts:125-134`) não enfraqueceu nenhuma chamada existente.**
  Verifiquei o porquê, não só o efeito: `PortadorDeAcesso` é `{ usuarioId }`
  (`acesso/tipos.ts:33-35`) e `exigeAcessoNaObra` já pedia exatamente esse tipo
  desde antes (`autorizacao.ts:48`) — `autoriza` estava pedindo mais do que
  usava. Alargar **parâmetro** é seguro por variância: todas as 24 funções
  `*Protegid*` continuam declarando `ator: Ator` na própria assinatura, então
  nenhuma passou a aceitar menos do que aceitava. `autoriza` não lê `sessaoId`
  em nenhum ponto. Nenhum caminho perdeu verificação.
- **Ninguém se promove por aqui.** A logo não toca `acesso`, `usuario` nem
  `perfil`; não há caminho de elevação na mudança.
- **O guardião de rotas cobre o que entrou.** A rota nova contém
  `comAtorNaObra` e `acoes.ts` contém `Protegid`; as duas marcas satisfazem
  `rotas-protegidas.test.ts:110-140`, que varre `page.tsx`, `route.ts` e todo
  `'use server'`.

### 3. Recursos

- **A memória de `criaLeitorDeLogo` não pode servir a logo de outra obra.** O
  `Map` é **chaveado por `obraId`** (`logo-para-documento.ts:30-42`), e o objeto
  que o contém nasce dentro de `criaPortasDoExport(ambiente)`
  (`exportacao-rdo.ts:42`) e de `criaLeitorDeLogo(ambiente)(obraId)`
  (`exportacao-de-periodo.ts:81`) — os dois por invocação, nenhum em escopo de
  módulo. Conferi que não existe nenhum `criaPortasDoExport()` no topo de
  arquivo em `src/`. Sem memória de módulo, sem vazamento entre requisições e
  sem servir logo antiga depois da troca.
- **A leitura de cabeçalho não arrasta os bytes.** `colunasDaObra`
  (`repositorio.ts:82-89`) seleciona `logo_tipo` e **nunca** a coluna `bytea`;
  `CabecalhoDaObra` expõe só `temLogo: boolean` (`tipos.ts:126-131`). Meio
  megabyte não passa em toda montagem de RDO.
- **A edição do cabeçalho não apaga a logo**, e isso tem teste nomeado
  (`logo-integracao.test.ts:84-105`). O tipo de leitura foi separado do de
  escrita justamente para isso (`repositorio.ts:56-65`).
- **Sem crescimento sem teto no banco.** A logo substitui a anterior, não
  versiona (`logo.ts:141-145`); no máximo 512 KB por obra.

### 4. Dado pessoal e log

- **`registra` usa só id.** `logo.ts:154-161` e `:186-189` gravam `obraId`,
  `usuarioId` e `quantidade` (tamanho em bytes). Nenhum nome, nenhum e-mail,
  nenhum caminho de arquivo. O tipo `ContextoDeLog` (`shared/log/index.ts:34-48`)
  continua sem campo de texto livre — mecanismo re-conferido, não presumido.
- **Zero `console.` nos arquivos novos e alterados do upload.**
- **Mensagens de erro dizem o que fazer, sem detalhe técnico.**
  `logo.ts:67-68` e `:83`; há teste afirmando que a recusa não contém `at `,
  `Buffer` nem `0x` (`logo.test.ts:98-105`).
- **Nada de nome em URL.** O caminho é `/obras/<obraId>/logo`, só identificador.
- **Metadados do PDF não mudaram.** A logo entra como `<Image>` no corpo
  (`documento-rdo.tsx:58-77`); `author`, `creator` e `keywords` continuam
  constantes. O documento sem logo é **byte a byte o de antes** — provado em
  `pdf-logo.test.ts:50-52` pela ausência de `/Subtype /Image`.
- **Nenhum binário entrou no repositório.** `git status --ignored` não mostra
  imagem nenhuma fora do ignorado; `git log --diff-filter=A` para `*.png`,
  `*.jpg`, `*.jpeg`, `*.webp`, `*.xlsm`, `*.xlsx` e `*.pdf` volta **vazio em
  todo o histórico**. As fixtures dos três testes novos são sintéticas:
  `Buffer.alloc` e um PNG 1×1 cinza (`pdf-logo.test.ts:32-35`).
- **`.env.example` mudou e continua sem valores** — a alteração é só comentário
  sobre pasta de banco local.

### 5. Dependência

- `npm ls xlsx` → vazio. `overrides` com `uuid ^11.1.1` e `esbuild ^0.25.0`
  presentes. `npm audit` → **0 vulnerabilidades**. **Nenhuma dependência nova**
  foi acrescentada pela mudança: `@react-pdf/renderer` e `drizzle-orm` já
  estavam, e o tipo `bytea` foi declarado à mão (`schema/obra.ts:38-40`) em vez
  de trazer pacote.

---

## Achados

### ATENÇÃO 1 — WebP é aceito no cadastro e é impossível no PDF

- **Onde:** `src/modules/obra/logo.ts:58-62` e `:105-111` (aceita),
  `src/db/schema/obra.ts:88` (`CHECK` aceita),
  `src/app/(cadastro)/obras/[obraId]/page.tsx:169-188` (a tela oferece),
  `docs/decisoes-do-rdo.md` (o documento promete), contra
  `node_modules/@react-pdf/image/lib/index.js:199-206`.
- **O que acontece:** `@react-pdf/renderer` suporta **jpg, jpeg, png, svg** e
  nada mais. Um `data:image/webp;base64,…` faz `resolveBase64Image` lançar
  `Base64 image invalid format: webp` **durante o render**. Confirmei
  empiricamente, chamando o resolvedor do pacote instalado: WebP lança, PNG
  passa. Consequência: depois que o engenheiro sobe uma logo WebP — formato que
  a tela oferece no `accept`, que o texto de ajuda anuncia e que o documento do
  produto promete —, **toda exportação de PDF daquela obra passa a falhar**,
  diária e de período, e o usuário vê só a mensagem genérica com código de
  correlação. Não é vazamento e não é acesso indevido; é a indisponibilidade do
  documento contratual, disparada pelo caminho documentado. A trilha de
  exportação nem chega a ser gravada, porque o `throw` acontece antes
  (`exporta-rdo-diario-em-pdf.ts:75-80`).
- **Como reproduzir:** subir um `.webp` na tela da obra (aceito, e a imagem
  aparece na tela, porque o navegador lê WebP), depois exportar o RDO de
  qualquer dia. Falha. Tirar a logo devolve a exportação.
- **Nota:** nenhum teste cobre isso. `pdf-logo.test.ts` usa só PNG;
  `logo-integracao.test.ts` usa PNG e JPEG. A lista de formatos está em três
  lugares que se repetem (borda, `CHECK`, `accept`) e em nenhum deles está
  escrito o que o renderizador sabe ler.
- **Correção sugerida:** decidir entre tirar WebP dos quatro lugares e do texto
  do produto, ou converter para PNG na gravação. Qualquer que seja, o caso de
  teste é "logo em cada formato aceito gera PDF", ligando a borda ao
  renderizador — é essa amarra que não existe hoje.

### ATENÇÃO 2 — metadado da imagem enviada atravessa intacto, inclusive para dentro do PDF

- **Onde:** `src/modules/obra/logo.ts:133-163` (grava os bytes como vieram),
  `src/app/(cadastro)/obras/[obraId]/logo/route.ts:83-99` (serve os bytes como
  vieram), `node_modules/pdfkit/js/pdfkit.js:4741-4759` (`Filter: 'DCTDecode'`,
  `this.obj.end(this.data)`).
- **O que acontece:** não há nenhuma etapa de limpeza. O arquivo é gravado
  verbatim, servido verbatim e, quando é **JPEG**, embutido verbatim no PDF: o
  PDFKit escreve o fluxo JPEG original como stream `DCTDecode`, **com os
  marcadores APP1 dentro**. EXIF e XMP de JPEG costumam carregar nome do autor
  (`dc:creator`, `Artist`, `Copyright`), software, data e, quando a imagem saiu
  de celular, coordenadas GPS. É exatamente a classe de vazamento que o
  `CLAUDE.md` nomeia — "nem em metadado de PDF ou de Excel gerado" — e que a
  planilha legada já cometeu com quatro nomes. O RDO exportado vai para o fiscal
  da prefeitura; o que estiver no EXIF vai junto, invisível na tela. Pelo lado
  da rota, qualquer encarregado da obra baixa o arquivo original inteiro.
- **Certeza e limite:** para PNG o PDFKit re-empacota só o `IDAT`
  (`pdfkit.js:4762-4770`), então `tEXt`/`iTXt`/XMP **não** entram no PDF — mas
  continuam sendo servidos pela rota. Para JPEG a passagem é direta. Verifiquei
  no código dos dois pacotes instalados; **não gerei um PDF com um JPEG
  portador de EXIF para ler os bytes de saída.** Confiança alta, não certeza
  empírica. É por isso que é ATENÇÃO e não CRÍTICO: o canal está aberto e
  provado no fonte, o vazamento concreto depende do arquivo que subirem, e hoje
  não há logo real em lugar nenhum deste repositório.
- **Como reproduzir:** subir como logo um JPEG com EXIF preenchido (qualquer
  foto de celular serve), exportar o RDO e procurar as cadeias do EXIF no PDF;
  ou simplesmente baixar `/obras/<id>/logo` e abrir num leitor de metadado.
- **Correção sugerida:** normalizar na gravação — re-codificar para PNG, ou
  descartar os segmentos APP do JPEG antes de gravar. Vale registrar a decisão:
  "a logo é re-codificada e perde metadado" é uma escolha de produto, não um
  detalhe de implementação.

### ATENÇÃO 3 — o envio valida antes de autorizar, e o teto real do corpo é o do framework

- **Onde:** `src/app/(cadastro)/acoes.ts:400-422`; comentário contrário em
  `src/app/_composicao/cadastro.ts:14-15`; `next.config.ts` (o que falta).
- **O que acontece:** duas coisas que andam juntas.
  1. **Ordem invertida.** `enviarLogoAction` autentica (`exigeAtor`) e então
     valida tamanho e presença do arquivo, devolvendo mensagem de formulário —
     a autorização só corre depois, dentro de `defineLogoProtegida`. O próprio
     `cadastro.ts:14-15` escreve a regra: "**autorizar antes de validar**. Quem
     não tem acesso não deve nem descobrir que o formulário dele estava mal
     preenchido." Todas as outras ações do arquivo respeitam isso, porque
     passam o texto cru e deixam a validação para dentro da função protegida;
     esta é a exceção, porque a checagem de tamanho ficou na ação. **Não
     encontrei oráculo**: as duas mensagens falam só do arquivo de quem enviou,
     e não diferenciam obra existente de obra alheia. É quebra de convenção
     defensiva, não vazamento.
  2. **O comentário de `acoes.ts:396-398` diz que o tamanho é conferido "antes
     de ler o corpo". Não é.** Numa Server Action o Next já analisou o
     `multipart` inteiro para a memória antes da primeira linha da função
     correr; `arquivo.size` é medido sobre algo que já está carregado. O teto
     que de fato existe antes disso é `serverActions.bodySizeLimit`, **1 MB por
     padrão** (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md:83`)
     e **não declarado em `next.config.ts`**. Ou seja: o dobro do limite
     pretendido entra na memória do processo por requisição, para qualquer
     usuário autenticado, contra qualquer `obraId`, antes de qualquer
     verificação de perfil.
- **Como reproduzir:** enviar 900 KB pelo formulário. O corpo é buferizado
  inteiro e só então recusado com a frase dos 512 KB. Enviar 2 MB: o Next recusa
  antes, com erro do framework.
- **Correção sugerida:** declarar `serverActions.bodySizeLimit` em
  `next.config.ts` alinhado ao limite do domínio (512 KB mais folga de
  envelope), para que o teto verdadeiro seja o que está escrito; e corrigir o
  comentário, que hoje descreve uma defesa que o framework não oferece. Se a
  ordem autorizar-antes-de-validar vale como regra, mover a checagem de tamanho
  para depois de `autoriza` (ou para dentro de `defineLogoProtegida`, onde
  `identificaImagem` já faz a mesma conferência em `logo.ts:78`).

### OBSERVAÇÃO 1 — `.gitignore` não bloqueia imagem, e agora entrou imagem no fluxo

`.gitignore:12-29` bloqueia planilha, CSV e PDF. **Não há regra para `*.png`,
`*.jpg`, `*.jpeg` nem `*.webp`.** Até hoje não fazia falta; a partir desta
mudança, a logo real da CROS e as capturas de tela de validação passam a existir
nas máquinas de quem desenvolve, e `CLAUDE.md` já proíbe "captura de tela com
nome". Conferido: o histórico está limpo, nenhuma imagem jamais entrou. É
prevenção, não correção — e o padrão do arquivo já está pronto para isso
(bloquear com curinga, liberar fixture uma a uma, como nas linhas 21-24).

### OBSERVAÇÃO 2 — mais uma leitura sem ator na assinatura

`criaLeitorDeLogo` (`logo-para-documento.ts:29-44`) chama `obtemLogoDaObra`
direto no banco, **sem autorização**, e não `obtemLogoProtegida`. Hoje está
correto: os dois chamadores autorizam antes
(`exportacao-rdo.ts` pela rota com `comAtorNaObra`, `exportacao-de-periodo.ts:60`
por `portasDoRdoDePeriodoProtegidas`, antes de montar qualquer diário).
Registro porque é **o mesmo padrão** que produziu os dois CRÍTICOS de 16/09: uso
de leitura que recebe `(obraId)` sem ator e delega a autorização a quem chama. A
assinatura convida ao furo; o terceiro chamador é que costuma esquecer.

### OBSERVAÇÃO 3 — custo por requisição da rota, e ausência de CSP

A rota responde `no-cache`, então o navegador revalida sempre; e para responder
304 ela precisa **ler o `bytea` e calcular SHA-256 de até 512 KB**
(`logo/route.ts:75`), porque a etiqueta é derivada do conteúdo. O 304 economiza
rede, não banco nem CPU. Para uma logo por obra é irrelevante; fica anotado como
o lugar onde um `ETag` guardado junto com o tipo (ou um `logo_hash` na linha)
resolveria de uma vez. Junto: **não há Content-Security-Policy** — não há
`middleware.ts` nem `headers()` em `next.config.ts`. Não é novidade desta
mudança (já estava nos dois laudos anteriores como item de implantação), mas
pesa um pouco mais agora que a aplicação serve arquivo enviado por usuário na
**própria origem**. `nosniff` mais a recusa de SVG é o que segura o vetor hoje.

### OBSERVAÇÃO 4 — fora do escopo da logo, na mesma leva não commitada

`src/db/pglite-local.ts:61-78` mudou a pasta padrão do banco local para
`os.tmpdir()`. A razão é boa e está escrita (sincronizador reescrevendo arquivo
de banco). O efeito colateral de segurança é que o banco de desenvolvimento —
que em algum momento vai ter dado parecido com o real — sai da árvore do projeto
e vai para um diretório temporário do sistema, fora do alcance do `.gitignore` e,
em Linux, num caminho legível por outros usuários locais. Em Windows o `%TEMP%`
é por usuário. Não auditei o resto dessa leva.

---

## Não verificado e por quê

- **Bytes de um PDF gerado com JPEG portador de EXIF.** É o que transformaria o
  ATENÇÃO 2 de "provado no código dos pacotes" em "provado nos bytes". Precisaria
  de um JPEG real e decodificável por `jay-peg` para construir; não fabriquei um.
  Fica como a próxima passada, junto com o item que já estava pendente: ler o
  `/Info` de um PDF renderizado de verdade.
- **Comportamento da rota num navegador real.** `nosniff`, `inline` e
  `private, no-cache` foram lidos no código, não observados numa sessão. A
  conclusão de que nenhum navegador atual sniffa com `nosniff` vem da
  especificação, não de teste nesta máquina.
- **Não rodei a suíte.** A instrução é auditar sem alterar; `npm run test`
  levanta banco. Li os três testes novos e afirmo o que eles cobrem, não que
  passam. O ATENÇÃO 1 diz respeito justamente ao que eles **não** cobrem.
- **Comportamento em produção do `bodySizeLimit`.** Depende de proxy e da
  plataforma de implantação, que não estão neste repositório. O padrão de 1 MB é
  o do Next instalado, lido na documentação do pacote.
- **Quantidade real de memória sob envio hostil concorrente.** Não gerei carga:
  seria alterar o estado do que estou auditando.
- **Sessão, convite, retenção e apagamento de pessoa.** Fora do diff. Continuam
  como o laudo de 17/09 deixou, e as quatro decisões pendentes de produto
  continuam sem dono registrado. Não são achados novos; permanecem visíveis.
- **Fidelidade do documento com a logo.** A logo é acréscimo ao gabarito da
  planilha. A aprovação está registrada em `documento-rdo.tsx:47-55` e em
  `docs/decisoes-do-rdo.md`, mas quem verifica layout é o agente
  `fidelidade-documento`, não este laudo.
