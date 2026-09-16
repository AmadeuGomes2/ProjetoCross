# docs/prd/

Documentos de requisitos, escritos pelo agente `po-escopo`.

Nome do arquivo: `NNN-nome-curto.md`, numerado em sequencia.

Regras, detalhadas na skill `template-prd`:

- **PERGUNTAS ABERTAS no topo**, antes de tudo. Ambiguidade vira pergunta, nunca
  decisao tomada por conta propria.
- Todo PRD parte do **plano do MVP**, o fluxo da v1 em `docs/spec.md`, secao 6, e
  cita a qual dos seis passos pertence. Pedido que nao cabe em nenhum passo e
  escopo novo: pergunte antes de escrever.
- Criterios de aceite em Gherkin em portugues, com valor concreto, a fronteira e
  um caminho infeliz.
- Secoes obrigatorias: impacto em dado pessoal e impacto no documento.

Os casos de teste correspondentes ficam em `docs/qa/`, com o mesmo numero, e sao
derivados destes criterios pelo agente `qa-casos-teste`.
