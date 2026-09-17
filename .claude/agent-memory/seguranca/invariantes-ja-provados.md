---
name: invariantes-ja-provados
description: Defesas estruturais ja provadas (tipo do log, portas sem campo de nome, metadados constantes, filtro por obra, celula de texto no Excel) e como re-conferir cada uma em vez de reler tudo
metadata:
  type: project
---

Verificado em `d5dce94` (16/09) e re-verificado em `886227d` (17/09). Laudos em
`docs/seguranca/2026-09-16-fatia-vertical-v1.md`,
`docs/seguranca/2026-09-17-periodo-e-perfis.md` e
`docs/seguranca/2026-09-17-logo-da-obra.md`. São defesas **de tipo ou de
esquema**, não de disciplina: continuam valendo até alguém as contornar.

- `ContextoDeLog` (`src/shared/log/index.ts`) não tem campo de texto: nome não
  entra em log nem por descuido. Zero `console.log` em `src/`. Os `catch` de
  borda registram `causa.name`, nunca `causa.message`, e contagem (`quantidade`)
  no lugar da lista de dias.
- `PessoaMobilizada` (`src/modules/rdo/portas.ts`) não tem campo de nome, e nem
  `RdoParaDocumento` nem `RdoDePeriodoParaDocumento` têm autor de lançamento. O
  bloco 5 agrega por função por construção. O único nome nos documentos é o do
  responsável técnico, no bloco 11 de assinatura — layout herdado, legítimo, e é
  o motivo de o RDO ter virado só do engenheiro em 17/09.
- Metadados do PDF são constante (`AUTOR_DO_PDF` em
  `src/modules/export/documento/rotulos.ts`), `keywords` vazio. **Conferido no
  fonte, não nos bytes** — falta ler o `/Info` de um PDF renderizado.
- Metadados do Excel idem, e esses **foram conferidos nos bytes**:
  `docProps/core.xml` e `app.xml` sem nome, sem Company, sem Manager.
- **Injeção de fórmula no Excel: provada no XML cru**, não pelo comentário.
  `planilha-de-periodo.ts` escreve toda célula não-numérica por `escreveTexto`
  (`cell.value = string` + `numFmt = '@'`), e o `sheet1.xml` sai com `t="s"` em
  todas, sem nenhum `<f>`, inclusive para `-`, `=1+1`, `@…` e cargas DDE.
  Reconferir só se alguém escrever `{ formula: … }` ou desviar de `escreveTexto`.
  Residual conhecido: sobrevive a um "salvar como CSV" na máquina do fiscal;
  prefixar com apóstrofo quebraria a fidelidade do `-` e foi recusado.
- Toda consulta de `lancamento/repositorio-drizzle.ts` filtra por `obraId`,
  inclusive `dosDias`/`nosDias` e as buscas por id. `buscaAcessoAtivo` casa
  `usuarioId` **e** `obraId`.
- `impacto.ts` autoriza antes de contar e devolve `NADA` quando recusa —
  indistinguível de "não houve impacto", então contagem não vaza obra alheia.
- Exportação grava trilha **antes** de entregar o arquivo, numa transação, uma
  linha por dia com `loteId`; trilha que falha impede a entrega.
- **Upload da logo (17/09)**: o tipo servido vem da coluna `logo_tipo`, que só
  recebe o retorno de `identificaImagem` (assinatura de bytes), é limitado pelo
  `CHECK ck_obra_logo` e é **reconferido contra a lista na leitura**, sem `as`;
  a rota manda `nosniff` e `Content-Disposition: inline` sem `filename`; nome e
  `type` do arquivo enviado nunca são lidos; SVG é recusado. A memória de
  `criaLeitorDeLogo` é chaveada por `obraId` e nasce por invocação, nunca em
  escopo de módulo. **O que falta nesse caminho está em
  [[limites-do-renderizador-de-pdf]].**
- Nenhuma planilha, PDF, banco ou imagem entrou no histórico, em commit nenhum.
  Cuidado: o `.gitignore` bloqueia planilha, CSV e PDF, mas **não bloqueia
  `*.png`, `*.jpg` nem `*.webp`** — e desde 17/09 o produto pede imagem.
- `npm ls xlsx` vazio; overrides `uuid ^11.1.1` e `esbuild ^0.25.0` presentes;
  `npm audit` limpo; 830 testes passando.

**Why:** a regra de honestidade exige listar o que passou, e re-verificar tudo do
zero a cada auditoria custa caro.

**How to apply:** ponto de partida, nunca conclusão. Antes de repetir qualquer
item no laudo, confirme que o mecanismo citado ainda existe (grep o tipo, a
porta, o filtro). Se o mecanismo sumiu, o item volta a ser achado. Próxima
passada deve abrir: **metadado do PDF em bytes reais** (único item da lista
verificado só no fonte). Ver [[dupla-validacao-e-borda-morta]] e
[[decisoes-de-seguranca-pendentes]].
