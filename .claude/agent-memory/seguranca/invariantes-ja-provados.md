---
name: invariantes-ja-provados
description: O que passou na auditoria de 2026-09-16 e por que — defesas estruturais (tipo do log, portas sem campo de nome, filtro por obra no repositorio) que so quebram se alguem as contornar
metadata:
  type: project
---

Verificado em `d5dce94` e registrado em
`docs/seguranca/2026-09-16-fatia-vertical-v1.md`. São defesas **de tipo ou de
esquema**, não de disciplina: continuam valendo até alguém as contornar de
propósito.

- `ContextoDeLog` não tem campo de texto: nome não entra em log nem por
  descuido. Zero `console.log` no projeto. Os `catch` de borda registram
  `causa.name`, nunca `causa.message`.
- A porta `PessoaMobilizada` do módulo `rdo` não tem campo de nome, e
  `RdoParaDocumento` não tem autor de lançamento. O nome não chega ao módulo que
  imprime — o bloco 5 agrega por função por construção.
- Metadados do PDF são constante fixa (`'RDO digital'`), `keywords` vazio.
- Toda consulta de `lancamento/repositorio-drizzle.ts` filtra por `obraId`,
  inclusive as de busca por id. A segunda camada existe mesmo com a primeira
  falhando.
- `revogaAcesso` resolve a obra a partir do acesso alvo antes de autorizar: não
  há IDOR por adivinhar `acessoId`.
- Nenhuma planilha, PDF, banco ou imagem entrou no histórico, em commit nenhum.
  `tmp/` ignorado e não rastreado.
- `npm ls xlsx` vazio; overrides de `uuid` e `esbuild` presentes; `npm audit`
  limpo.

**Why:** a regra de honestidade exige listar o que passou, e re-verificar tudo
do zero a cada auditoria custa caro. Este registro diz o que já foi provado e
**como** — para que a próxima passada confira se o mecanismo ainda existe, em
vez de reler cada chamada.

**How to apply:** use como ponto de partida, nunca como conclusão. Antes de
repetir qualquer item no laudo, confirme que o mecanismo citado ainda está lá
(grep o tipo, a porta, o filtro). Se o mecanismo sumiu, o item volta a ser
achado. Reabra especificamente: metadado do PDF em bytes reais e trilha de
exportação, quando as portas de `export` deixarem de ser stub. Ver
[[fronteira-de-acesso-latente]].
