---
name: divergencias-recorrentes-rdo-diario
description: As divergências achadas no PDF do RDO diário em 16/09/2026 e as duas classes de defeito que vêm do renderizador, não do gerador
metadata:
  type: project
---

Primeira conferência do PDF do RDO diário: 16/09/2026, sobre o commit `d5dce94`.
Laudo em `docs/fidelidade/2026-09-16-rdo-diario.md`.

**Why:** os 11 blocos, a ordem, os rótulos herdados, o separador brasileiro, a data
`dd/mm/aaaa`, o traço da produção zero, a letra do turno, o efetivo por função sem
nome e o resumo do dia fora do PDF **passaram todos**. O que falhou veio de duas
classes que ninguém vê lendo o código:

1. **Hifenização automática do `@react-pdf`.** `COMENTÁRIO CONTRATANTE` sai
   `COMENTÁRIO CON-` / `TRATANTE` em 100% dos documentos, porque a coluna direita
   do bloco 10 tem 110pt. A mesma causa parte nome de função (`Tecnico de Se-` /
   `guranca do Tra-` / `balho`) e texto livre de comentário. Remédio de classe:
   `Font.registerHyphenationCallback((p) => [p])`.
2. **Quebra de página automática.** Os limites declarados em
   `src/modules/rdo/limites.ts` (41 colunas de pessoal, 41 de equipamento) vêm da
   contagem de colunas da planilha, mas a A4 desenhada não segura isso: com
   41+41+15 atividades o bloco de assinaturas é empurrado para uma página 2 **sem
   título, sem identificação e sem a marca `CONTINUAÇÃO`**, e `temContinuacao`
   continua `false`. Medido: 38+38 cabe, 41+41 não. Não ocorre nos volumes reais de
   hoje (12 funções, 14 equipamentos, 11 atividades).

**How to apply:** ao conferir qualquer versão futura do PDF, comece por estas duas
— são as que voltam. Verifique se existe `registerHyphenationCallback` no módulo
`export` e renderize sempre o cenário `denso` para contar páginas.

Menores, ainda abertos: a página de continuação repete o bloco vazio
`COMENTÁRIO CONTRATANTE`; as duas linhas de assinatura ficam 25pt desalinhadas
porque só a da esquerda carrega os dados do responsável acima.

Fora de layout, mas bloqueia a entrega: `registraExportacao` é um coto que sempre
recusa (`src/app/_composicao/exportacao-rdo.ts`) e nenhuma rota chama `exportaRdo`.
O desenho de R20 está certo — registra antes de entregar, recusa a entrega se o
registro falha —, mas a v1 não exporta nada.

Ver [[como-gerar-e-ler-o-pdf-real]] e [[gabarito-ambiguo-pontos-abertos]].
