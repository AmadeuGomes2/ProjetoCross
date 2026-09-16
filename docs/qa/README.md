# docs/qa/

Casos de teste, escritos pelo agente `qa-casos-teste`.

Nome do arquivo: `NNN-<nome-do-prd>.md`, com o mesmo numero do PRD que originou.

A regra que define este diretorio, detalhada na skill `template-caso-teste`:

- **A expectativa vem da regra de negocio, nunca lida da implementacao.** O agente
  trabalha sem abrir `src/`, de proposito. Se derivasse do codigo, validaria o
  codigo contra ele mesmo e congelaria os defeitos como especificacao.
- Origem de cada expectativa e declarada e verificavel: cenario do PRD, secao de
  `docs/dominio/regras-extraidas.md`, ou duvida respondida com data.
- Expectativa sem uma dessas tres origens nao vira caso: vira caso **bloqueado**,
  visivel na matriz, apontando a pergunta aberta.
- Cobertura minima por criterio: caminho feliz, toda fronteira, caminho negativo,
  entrada invalida.
- Os 15 casos obrigatorios deste dominio saem dos defeitos reais da planilha, em
  `docs/dominio/inconsistencias.md`.
