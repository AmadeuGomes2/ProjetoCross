# Folha de decisões — PRD v1

**Respondida em 16/09/2026: todas as sugestões aceitas.**

Quem responde pelo produto marcou as sugestões de todos os 19 blocos. As respostas
estão aplicadas em `docs/prd/v1.md` (seção DECISÕES TOMADAS) e em
`docs/dominio/duvidas.md` (dúvidas 1, 2, 3, 4, 5, 10, 11 e 12).

Continua pendente só o que a decisão 4.4 mandou fazer: a lista de motivos de dia
parado foi extraída e está proposta em `docs/prd/v1.md`, aguardando aprovação.

As 19 perguntas abertas de `docs/prd/v1.md`, quebradas em decisões pequenas.
Cada decisão tem um código e opções. Responda de um destes jeitos:

- marque `[x]` na opção e salve o arquivo; ou
- responda no chat só com os códigos, por exemplo: `1.1 a, 1.2 c, 2.1 a, ...`

Toda decisão tem uma **sugestão**. Se concordar com todas as sugestões de um
bloco, basta escrever `bloco N: sugestões`. Se discordar de uma, marque a outra.
Deixar em branco significa "ainda não sei", e o item continua bloqueado.

As **quatro obrigatórias** são os blocos 1 a 4.

Ao final, eu levo as respostas para `docs/dominio/duvidas.md` com a data, troco
os `<PERGUNTA ABERTA N>` do PRD pelos valores, e só então planejo a Fase 2.

---

## Bloco 1 — Efetivo no dia da saída (obrigatória)

**1.1** A pessoa conta no efetivo no dia em que sai?

- [x] **a)** Conta. A data de saída é o último dia trabalhado. ← sugestão
- [ ] **b)** Não conta. A data de saída é o dia em que já não está.

**1.2** Equipamento segue a mesma regra que pessoa?

- [x] **a)** Sim, a mesma regra. ← sugestão
- [ ] **b)** Não, regra própria: \_\_\_\_\_\_\_\_

---

## Bloco 2 — Onde mora o tempo do dia (obrigatória)

**2.1** O encarregado lança o tempo como?

- [x] **a)** Só os três turnos (`B`/`C`/`I`) mais o índice em mm. A lista de 6
      termos (`Bom`, `Nublado`, ...) deixa de existir. ← sugestão, porque o PDF só
      imprime os turnos e pedir duas vezes fere o lançamento em celular
- [ ] **b)** Só a condição de 6 termos, uma por dia. O bloco `PLUVIOMETRIA` do
      PDF é derivado dela por mapeamento fixo.
- [ ] **c)** As duas: turnos no dia e condição de 6 termos em cada atividade,
      como na planilha.

**2.2** Turno em branco (`B`, `B`, vazio) é aceito?

- [x] **a)** Sim, aceito. Domingo real fica assim. ← sugestão
- [ ] **b)** Não, os três são obrigatórios.

**2.3** O que o PDF imprime em `NOITE ANTER`, `MANHÃ`, `TARDE`?

- [x] **a)** A letra, `B`, `C` ou `I`. É o que a planilha imprime hoje.
      ← sugestão
- [ ] **b)** Por extenso: `Bom`, `Chuva`, `Impraticável`.
- [ ] **c)** Por extenso com outras palavras: \_\_\_\_\_\_\_\_

> Correção que descobri ao montar esta folha: a skill `fidelidade-documento`
> diz "por extenso, capitalizada", mas a fórmula da planilha imprime a própria
> letra. Vou corrigir a skill depois da sua resposta.
>
> **16/09/2026:** resposta dada (2.3 a). A correção da skill está registrada como
> tarefa T16 em `docs/prd/v1.md`; este agente não altera `.claude/`.

---

## Bloco 3 — Índice pluviométrico exatamente 10 (obrigatória)

**3.1** Chuva (`C`) com índice exatamente 10 mm dá o quê?

- [ ] **a)** `Trabalhado`. Regra fica "até 10 inclusive é trabalhado".
- [x] **b)** `Perca de produção`. Regra fica "de 10 para cima é perca".
      ← sugestão, 10 mm num dia já é chuva moderada

**3.2** Chuva (`C`) com índice 0 mm continua `Trabalhado`, como hoje?

- [x] **a)** Sim. ← sugestão
- [ ] **b)** Não, vira: \_\_\_\_\_\_\_\_

**3.3** O resumo do dia (`Trabalhado` / `Perca de produção` / `Impraticavél`)
aparece na tela do RDO diário? O PDF não o mostra.

- [x] **a)** Sim, na tela. ← sugestão
- [ ] **b)** Não, fica só no cálculo.

---

## Bloco 4 — "Não houve atividades" (obrigatória)

**4.1** Como o dia parado é representado?

- [x] **a)** Estado do dia com motivo tipado, zero atividades. No PDF, o motivo
      sai na primeira linha do bloco de atividades, do jeito que o fiscal está
      acostumado a ver. ← sugestão
- [ ] **b)** Estado do dia com motivo tipado. No PDF, bloco de atividades vazio.
- [ ] **c)** Continua sendo uma atividade de texto livre, mas com um status novo
      `Não houve atividades` em vez de `Produção`.

**4.2** Dia em que ninguém lançou nada é um terceiro estado, diferente de parado?

- [x] **a)** Sim: `não lançado`, `parado`, `trabalhado`. ← sugestão
- [ ] **b)** Não: sem lançamento é o mesmo que parado.

**4.3** Encarregado tenta lançar atividade num dia marcado como parado:

- [x] **a)** Rejeita com mensagem: "dia marcado como parado". ← sugestão
- [ ] **b)** Aceita e muda o dia para trabalhado.

**4.4** Lista de motivos de parada:

- [x] **a)** Eu extraio dos 79 textos reais da planilha e te mostro para
      aprovar. ← sugestão
- [ ] **b)** Você define agora: \_\_\_\_\_\_\_\_

> **16/09/2026:** extração feita. São 110 registros de dia parado, com 13 textos
> distintos, e **61 deles não declaram motivo nenhum**. A lista proposta —
> `Domingo`, `Feriado`, `Chuva`, `Excesso de umidade no trecho`,
> `Interferência de terceiro`, `Impraticável`, `Sem frente de serviço`, `Outro` —
> está em `docs/prd/v1.md`, seção Taxonomias, e **ainda precisa da sua
> aprovação**. É a pergunta aberta 1 do PRD.

---

## Bloco 5 — Efetivo mobilizado ou presente

**5.1** O efetivo do RDO é:

- [ ] **a)** Mobilizado, sempre. Domingo parado mostra 19.
- [x] **b)** Mobilizado, mas zerado quando o dia está parado. ← sugestão
- [ ] **c)** Presente, com o encarregado marcando ausência a cada dia.

---

## Bloco 6 — Número do RDO

**6.1** Primeiro dia do contrato é:

- [x] **a)** RDO 0, como hoje. O fiscal já recebeu sete meses assim. ← sugestão
- [ ] **b)** RDO 1.

**6.2** O número congela quando o dia é fechado?

- [x] **a)** Sim. Mudar a data de início não renumera o que já foi entregue.
      ← sugestão
- [ ] **b)** Não, recalcula sempre.

---

## Bloco 7 — BMS no cabeçalho

**7.1** De onde sai o número do BMS?

- [x] **a)** O engenheiro cadastra os períodos de BMS da obra (início, fim,
      número) e o RDO deriva pela data. ← sugestão
- [ ] **b)** O engenheiro digita o BMS corrente e troca quando muda de período.
- [ ] **c)** Sai vazio na v1.

---

## Bloco 8 — Número de contrato

**8.1** O cabeçalho do PDF mostra:

- [x] **a)** Um campo só, com o que o fiscal reconhece. ← sugestão
- [ ] **b)** Dois campos: contrato e código interno, só o primeiro impresso.

**8.2** O valor que vai no campo é:

- [x] **a)** `P0476/01-25 - BLOCO 02` ← sugestão, é o que está nas 31 abas
- [ ] **b)** `190/2026`
- [ ] **c)** Outro: \_\_\_\_\_\_\_\_

---

## Bloco 9 — Fechamento do dia

**9.1** Fechamento e retificação entram na v1?

- [x] **a)** Sim: o engenheiro fecha o dia; depois disso só retificação, que
      aponta para o original. ← sugestão, é o que o CLAUDE.md já promete
- [ ] **b)** Exportar o PDF fecha o dia automaticamente.
- [ ] **c)** Sem fechamento na v1. Tudo editável, histórico de versões supre.
- [ ] **d)** Fechamento automático depois de N dias: \_\_\_\_

---

## Bloco 10 — Comentário do contratante

**10.1** O bloco `COMENTÁRIO CONTRATANTE` na v1:

- [x] **a)** Sai sempre vazio. ← sugestão
- [ ] **b)** O engenheiro pode transcrever o que o fiscal disse.

---

## Bloco 11 — Transbordo do layout

**11.1** Mais de 15 atividades, ou comentário com mais de 4 linhas:

- [x] **a)** Segunda página com continuação. ← sugestão
- [ ] **b)** Impede o 16.º lançamento com mensagem.
- [ ] **c)** Reduz a fonte até caber.
- [ ] **d)** Exporta com aviso visível no documento.

---

## Bloco 12 — Produção sem atividade

**12.1** Produção lançada num dia sem atividade nenhuma, ou num dia parado:

- [x] **a)** Aceita e mostra aviso na tela do RDO. ← sugestão
- [ ] **b)** Rejeita.
- [ ] **c)** Aceita em silêncio.

---

## Bloco 13 — Validações que a planilha não faz

Para cada uma: **R** rejeita com mensagem · **A** aceita com aviso · **S** aceita
em silêncio.

**13.1** Lançamento com data antes do início ou depois do fim da obra:

- [x] **R** ← sugestão
- [ ] **A**
- [ ] **S**

**13.2** Lançamento com data futura:

- [x] **R** ← sugestão
- [ ] **A**
- [ ] **S**

**13.3** Produção com quantidade zero:

- [x] **R** ← sugestão, "não houve produção" é ausência de lançamento
- [ ] **A**
- [ ] **S**

**13.4** Serviço controlado com quantidade de projeto zero:

- [x] **R** ← sugestão
- [ ] **A**
- [ ] **S**

---

## Bloco 14 — Acesso do encarregado

Pacote sugerido, tudo junto:

- [x] **14.0** Aceito o pacote: link de uso único · validade de 7 dias · pode
      haver mais de um encarregado por obra · o engenheiro pode revogar ·
      autoria dos lançamentos visível só ao engenheiro. ← sugestão

O pacote responde os cinco itens abaixo, que ficam sem marca própria:
14.1 **a**, 14.2 **a**, 14.3 **a**, 14.4 **a**, 14.5 **a**.

**14.1** Forma: [ ] **a)** link de uso único · [ ] **b)** código digitável

**14.2** Validade: [ ] **a)** 7 dias · [ ] **b)** 24 horas · [ ] **c)** sem prazo

**14.3** Encarregados por obra: [ ] **a)** vários · [ ] **b)** só um

**14.4** Revogação pelo engenheiro na v1: [ ] **a)** sim · [ ] **b)** não

**14.5** Autoria dos lançamentos visível: [ ] **a)** só ao engenheiro ·
[ ] **b)** aos dois perfis

---

## Bloco 15 — Pré-preenchimento do dia anterior

**15.1** Ao abrir o dia novo, vem preenchido do dia anterior:

- [x] **a)** Só condição de tempo e estado do dia. ← sugestão, evita atividade
      repetida por confirmação sem ler
- [ ] **b)** Também as atividades, desmarcadas, para escolher quais mantém.
- [ ] **c)** Nada na v1.

> Com a decisão 2.1, "condição de tempo" aqui são as três letras de turno.

---

## Bloco 16 — Rede instável

**16.1** Até onde vai o "não se perde quando a rede cai":

- [x] **a)** Rascunho local que sobrevive a fechar o navegador e é enviado
      quando há rede. Sem resolução de conflito. ← sugestão
- [ ] **b)** Fila completa com sincronização, retentativa e conflito.
- [ ] **c)** Só não perder o formulário aberto.

---

## Bloco 17 — Detalhes de fidelidade

**17.1** Espaços sobrando no fim dos textos fixos (`MONTES CLAROS - MG `):

- [x] **a)** Normalizar, sem os espaços. ← sugestão, são resto de digitação
- [ ] **b)** Reproduzir como está.

**17.2** Produção zero no bloco 7 do PDF sai como:

- [x] **a)** `-`, um traço. É o que o formato da célula mostra na planilha.
      ← sugestão
- [ ] **b)** `0,00`
- [ ] **c)** Em branco.

**17.3** Nome do arquivo PDF, sem nome de pessoa:

- [x] **a)** `rdo-2026-09-01-n208.pdf`, data e número. ← sugestão
- [ ] **b)** `rdo-2026-09-01.pdf`, só a data.
- [ ] **c)** Outro padrão: \_\_\_\_\_\_\_\_

---

## Bloco 18 — Responsável técnico

**18.1** Nome, titulação e CREA que vão na assinatura do PDF moram:

- [x] **a)** Na obra, digitados pelo engenheiro ao criar. ← sugestão para a v1,
      que tem uma obra só
- [ ] **b)** No perfil do usuário engenheiro.
- [ ] **c)** Nos dois, com a obra apontando para o usuário.

---

## Bloco 19 — Taxonomias pré-carregadas

**19.1** O que vem pré-carregado:

- [x] **a)** Tudo que a planilha tem, normalizado: 14 status, 6 condições de
      tempo, 12 funções, 8 tipos de equipamento, 4 serviços controlados.
      ← sugestão
- [ ] **b)** Só status e condições de tempo. Função e tipo o engenheiro cria.

> Consequência da decisão 2.1, não decisão nova: as 6 condições de tempo saem
> desta carga, porque a taxonomia deixa de existir. Sobram 14 status, 12 funções,
> 8 tipos de equipamento, 4 serviços controlados e as 3 letras de turno.

**19.2** Taxonomia vale:

- [x] **a)** Para o sistema inteiro. A v1 tem uma obra só. ← sugestão
- [ ] **b)** Por obra, desde já.

---

## Resumo para responder rápido

Se todas as sugestões servem, responda só: **"todas as sugestões"**.

Se quase todas servem, responda: **"sugestões, exceto 3.1 a, 9.1 c"**, por
exemplo.

Decisões que mais mudam a implementação, se você quiser priorizar: 2.1, 4.1,
9.1, 7.1 e 16.1.

**Resposta recebida em 16/09/2026: "todas as sugestões".**
