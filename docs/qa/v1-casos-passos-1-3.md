# Casos CT-001 a CT-085 — passos 1 a 3 do PRD v1

Índice, matriz, lista de não coberto e perguntas abertas: `docs/qa/v1.md`.
Convenções de origem e contexto comum: idem. Todo nome é sintético.

---

## F1.1 — Criar a obra (`obra-cadastro.test.ts`)

**CT-001 · feliz · F1.1 c."obra criada com os campos do cabeçalho do RDO"**
**Dado** "E1" autenticado e nenhuma obra criada. **Quando** "E1" cria a obra com os nove campos do cenário (contrato, contratante, contratada, início 05/02/2026, término 05/02/2027, escopo, nome, área, local). **Então** a obra existe com exatamente esses nove valores. **Por que existe:** são os blocos 3 e 4 do documento; campo faltando é divergência de gabarito na primeira entrega.

**CT-002 · feliz · F1.1 c."obra criada com os campos do cabeçalho do RDO"**
**Dado** o mesmo. **Quando** a obra é criada. **Então** o registro guarda quem criou e quando. **Por que existe:** a planilha não tem autoria nenhuma (inconsist. G5); o produto tem que ter desde o primeiro registro.

**CT-003 · feliz · F1.1 c."obra criada com os campos do cabeçalho do RDO"**
**Dado** o mesmo. **Quando** a obra é criada por "E1". **Então** "E1" tem acesso a ela com perfil engenheiro. **Por que existe:** sem isso o criador não consegue cadastrar nem liberar ninguém, e a obra nasce inacessível.

**CT-004 · feliz · dec. 8.1 e 8.2 · F1.1 c."contrato é um campo só"**
**Dado** a obra "B02" criada. **Quando** "E1" consulta o cadastro. **Então** existe um único campo de contrato com `P0476/01-25 - BLOCO 02` e nenhum campo de código interno. **Por que existe:** a planilha tem três identificações da mesma obra em lugares diferentes (inconsist. C9); um campo só é a decisão que fecha isso.

**CT-005 · fronteira · F1.1 c."data de término igual à de início é aceita"**
**Dado** "E1" autenticado. **Quando** cria a obra com início 05/02/2026 e término 05/02/2026. **Então** a obra é criada. **Por que existe:** R14 diz "não anterior"; o mesmo dia é o limite exato e precisa estar do lado do aceite.

**CT-006 · negativo · caso obrigatório 9 · F1.1 c."data de término anterior à de início"**
**Dado** "E1" autenticado. **Quando** cria a obra com início 05/02/2026 e término 04/02/2026. **Então** a obra não é criada e a mensagem diz que o término não pode ser anterior ao início. **Por que existe:** `DADOS!C6:E6` tem um período de -716 dias que ninguém viu; um dia de diferença é a menor forma do mesmo defeito.

**CT-007 · negativo · caso obrigatório 9 · R14 + inconsist. B1**
**Dado** "E1" autenticado. **Quando** cria a obra com início 01/12/2024 e término 15/12/2022. **Então** a obra não é criada. **Por que existe:** é o valor real da planilha, -716 dias; a validação tem que pegar o caso grosseiro e o de um dia com a mesma regra.

**CT-008 · inválido · F1.1 c."campo do cabeçalho vazio é rejeitado"**
**Dado** "E1" autenticado. **Quando** cria a obra com contrato vazio e os demais campos preenchidos. **Então** a obra não é criada e a mensagem aponta o campo contrato. **Por que existe:** R22; sem contrato o bloco 3 sai incompleto e o fiscal devolve o documento.

**CT-009 · inválido · R22**
**Dado** "E1" autenticado. **Quando** cria a obra com nome do projeto vazio e os demais preenchidos. **Então** a obra não é criada e a mensagem aponta o campo nome. **Por que existe:** R22 vale para todo campo que sai no cabeçalho, não só para o contrato; dois campos distintos provam que a regra é do conjunto.

**CT-010 · inválido · caso obrigatório 10 · F1.1 c."data de início inexistente é rejeitada"**
**Dado** "E1" autenticado. **Quando** cria a obra com início 29/02/2026. **Então** a obra não é criada e a mensagem diz que a data não existe. **Por que existe:** 2026 não é bissexto; a planilha encadeia datas e chega a 31 de setembro (inconsist. B3). Data inexistente nunca pode virar outro dia em silêncio.

**CT-011 · inválido · caso obrigatório 10 · R9**
**Dado** "E1" autenticado. **Quando** cria a obra com término 31/09/2026. **Então** a obra não é criada e a mensagem diz que a data não existe. **Por que existe:** é exatamente a data que a aba `31` produz e imprime como 01/10/2026.

**CT-012 · negativo · F1.1 c."encarregado não cria obra"**
**Dado** "C1" autenticado. **Quando** "C1" envia ao servidor o pedido de criar obra com todos os campos válidos. **Então** o pedido é recusado no servidor e nenhuma obra é criada. **Por que existe:** R19; esconder o botão não é controle de acesso, a recusa tem que ser do servidor.

**CT-013 · feliz · dec. 18.1 · F1.1 c."responsável técnico é campo da obra"**
**Dado** a obra "B02". **Quando** "E1" informa responsável técnico "R1", "Engenheiro Civil", "CREA - MG 000000/D". **Então** os três valores ficam na obra "B02", não no perfil do usuário "E1". **Por que existe:** quem assina o RDO é o responsável técnico do contrato, que pode não ser quem opera o sistema.

**CT-014 · feliz · dec. 18.1 · F1.1 c."responsável técnico é campo da obra"**
**Dado** o responsável técnico cadastrado em "B02". **Quando** qualquer RDO de "B02" é montado. **Então** o bloco 11 mostra os três valores. **Por que existe:** o bloco de assinaturas é conferido pelo fiscal em todo dia, não só no dia do cadastro.

---

## F1.2 — Períodos de BMS (`bms-periodo.test.ts`)

**CT-015 · feliz · F1.2 c."período cadastrado com número, início e fim"**
**Dado** "B02" e "E1" engenheiro. **Quando** "E1" cadastra o período de BMS 7 de 01/09/2026 a 30/09/2026. **Então** "B02" tem o período 7 cobrindo esse intervalo e a duração é 30 dias. **Por que existe:** `final − inicial + 1` (regras §10); errar por um é o defeito clássico dessa fórmula.

**CT-016 · fronteira · F1.2 c."período de um dia é aceito"**
**Dado** o mesmo. **Quando** "E1" cadastra o período 1 de 05/02/2026 a 05/02/2026. **Então** o período é criado com duração de 1 dia. **Por que existe:** é o menor período válido; com `final − inicial` sem o `+1` daria 0.

**CT-017 · negativo · caso obrigatório 9 · F1.2 c."fim anterior ao início é rejeitado"**
**Dado** o mesmo. **Quando** "E1" cadastra o período 2 de 28/02/2026 a 12/03/2024. **Então** o período não é criado e a mensagem diz que a data final não pode ser anterior à inicial. **Por que existe:** é o defeito B1 na entidade onde ele nasceu.

**CT-018 · negativo · caso obrigatório 9 · R14 + inconsist. B1**
**Dado** o mesmo. **Quando** "E1" cadastra período de 01/12/2024 a 15/12/2022. **Então** o período não é criado. **Por que existe:** reproduz o valor real de -716 dias de `DADOS!E6`.

**CT-019 · negativo · F1.2 c."encarregado não cadastra período de BMS"**
**Dado** "C1" encarregado de "B02". **Quando** "C1" envia ao servidor o período 8. **Então** o pedido é recusado no servidor. **Por que existe:** o BMS amarra a medição; é decisão do engenheiro (7.1) e fronteira de confiança (R19).

**CT-020 · negativo · dec. 21.1 · F5.1 c."obra não é criada sem período de BMS"**
**Dado** "E1" autenticado. **Quando** tenta criar "B02" sem informar nenhum período de BMS. **Então** a obra não é criada e a mensagem diz que ao menos um período é obrigatório. **Por que existe:** a tabela legada ia de 2022 a 2025 e não cobria 2026 (inconsist. B2); obra sem período nenhum imprime `BM'S` vazio desde o primeiro dia.

**CT-021 · feliz · dec. 21.1**
**Dado** "E1" autenticado. **Quando** cria "B02" informando o período 1 de 05/02/2026 a 28/02/2026 no mesmo ato. **Então** a obra e o período existem. **Por que existe:** é o caminho feliz do 21.1; sem ele só existiria o caso negativo.

**CT-022 · inválido · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "E1" cadastra período de 01/09/2026 a 31/09/2026. **Então** o período não é criado e a mensagem diz que a data não existe. **Por que existe:** a mesma validação de data tem que valer em toda entidade, não só no lançamento.

**CT-023 · fronteira · R25**
**Dado** o período 7 de 01/09/2026 a 30/09/2026. **Quando** o BMS de 01/09/2026 é derivado. **Então** é 7. **Por que existe:** o primeiro dia do intervalo é fronteira própria; `>` em vez de `≥` deixaria o primeiro dia de cada BMS sem número.

**CT-024 · fronteira · F5.1 c."último dia do período ainda é do período"**
**Dado** o período 6 de 01/08/2026 a 31/08/2026. **Quando** o BMS de 31/08/2026 é derivado. **Então** é 6. **Por que existe:** é o mesmo erro de `<` contra `≤` que a planilha comete no efetivo (regras §1.1), agora no intervalo do BMS.

**CT-025 · fronteira · R25**
**Dado** os períodos 6 (01/08 a 31/08/2026) e 7 (01/09 a 30/09/2026). **Quando** o BMS de 01/09/2026 é derivado. **Então** é 7, e nunca 6. **Por que existe:** intervalos vizinhos não podem se sobrepor nem deixar buraco na virada.

**CT-026 · fronteira · dec. 21.1 · F5.1 c."data não coberta por nenhum período cadastrado"**
**Dado** "B02" com período cobrindo apenas 05/02/2026 a 28/02/2026. **Quando** "E1" abre o RDO de 15/08/2026. **Então** o campo `BM'S` sai vazio, a tela avisa que não há período cobrindo a data, e o RDO é gerado normalmente. **Por que existe:** a planilha imprime um 7 arbitrário sem tabela que o sustente (inconsist. B2); vazio com aviso é honesto, número inventado não é, e bloquear a exportação puniria o fiscal por um cadastro incompleto.

---

## F2.1 — Pessoal e passagem (`pessoal-passagem.test.ts`)

**CT-027 · feliz · F2.1 c."pessoa cadastrada com função da lista e entrada, sem saída"**
**Dado** "B02" e a taxonomia Função com "Motorista". **Quando** "E1" cadastra "P1" com função "Motorista" e entrada 10/02/2026. **Então** "P1" existe com uma passagem de 10/02/2026 até em aberto. **Por que existe:** é o cadastro que alimenta o bloco 5 de todo RDO posterior.

**CT-028 · feliz · R13 · F2.1 c."pessoa cadastrada com função da lista"**
**Dado** o mesmo. **Quando** "P1" é cadastrada. **Então** a função é uma referência ao termo "Motorista", não um texto copiado. **Por que existe:** a planilha casa por texto e por isso `Motorista ` com espaço vira uma função diferente (inconsist. E5).

**CT-029 · fronteira · caso obrigatório 13 · F2.1 c."função não é texto livre"**
**Dado** a taxonomia com "Motorista". **Quando** "E1" cadastra "P2" com função `"Motorista "` (espaço no fim). **Então** "P2" fica ligada ao termo existente e a taxonomia continua com uma única função "Motorista". **Por que existe:** `Servente `, `Motorista ` e `Op. Retro ` existem assim no arquivo real; o rótulo impresso sai com espaço e a contagem casa por acaso.

**CT-030 · fronteira · caso obrigatório 13 · R13 + inconsist. C8**
**Dado** a taxonomia com "Motorista". **Quando** "E1" cadastra "P5" com função `"motorista"`. **Então** "P5" fica ligada ao termo existente e nenhum termo novo é criado. **Por que existe:** no Excel a comparação ignora caixa e o defeito não aparece; em código aparece. Caixa e espaço são duas fronteiras distintas e cada uma é um caso.

**CT-031 · negativo · caso obrigatório 2 · F2.1 c."saída anterior à entrada é rejeitada"**
**Dado** "B02". **Quando** "E1" cadastra "P3" com entrada 10/02/2026 e saída 09/02/2026. **Então** "P3" não é cadastrada e a mensagem diz que a saída não pode ser anterior à entrada. **Por que existe:** R14 por analogia com o período de BMS, que tem o caso real de -716 dias; sem isso o efetivo de um intervalo negativo é sempre zero e ninguém descobre por quê.

**CT-032 · fronteira · F2.1 c."saída no mesmo dia da entrada é aceita"**
**Dado** "B02". **Quando** "E1" cadastra "P4" com entrada e saída em 10/02/2026. **Então** "P4" é cadastrada com passagem de um dia. **Por que existe:** "não anterior" inclui o mesmo dia; é o limite exato entre CT-031 e o aceite.

**CT-033 · feliz · caso obrigatório 8 · F2.1 c."segunda passagem da mesma pessoa"**
**Dado** "P1" com passagem de 10/02/2026 a 28/02/2026. **Quando** "E1" registra nova passagem de "P1" com entrada 15/03/2026. **Então** "P1" continua sendo uma pessoa, com duas passagens, e o cadastro não ganha uma segunda pessoa. **Por que existe:** o modelo de intervalo único da planilha conta quem sai e volta como duas pessoas; o efetivo do RDO sairia dobrado.

**CT-034 · negativo · F2.1 c."encarregado não vê o cadastro de pessoal"**
**Dado** "C1" encarregado de "B02". **Quando** "C1" pede ao servidor a lista de pessoal. **Então** o pedido é recusado no servidor e a resposta não contém nome de pessoa. **Por que existe:** são 19 nomes completos com função e admissão; é dado pessoal sob LGPD e o encarregado não precisa dele para lançar.

**CT-035 · negativo · F2.1 c."encarregado não cadastra pessoa"**
**Dado** "C1" encarregado. **Quando** "C1" envia o cadastro de "P9". **Então** o pedido é recusado no servidor e "P9" não existe. **Por que existe:** R19, verificado no servidor.

**CT-036 · inválido · R2, R13**
**Dado** "B02". **Quando** "E1" cadastra "P6" sem função. **Então** o cadastro é rejeitado. **Por que existe:** o bloco 5 agrega por função; pessoa sem função não tem coluna e some do RDO em silêncio.

**CT-037 · inválido · R23**
**Dado** a taxonomia Função sem "Encanador". **Quando** "E1" envia ao servidor "P7" com função "Encanador". **Então** o cadastro é rejeitado e nenhum termo novo é criado. **Por que existe:** taxonomia é tabela editável, mas só pelo caminho de edição; lançamento não cria termo por efeito colateral, que é como a planilha ganhou funções duplicadas.

**CT-038 · inválido · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "E1" cadastra "P8" com entrada em 31/09/2026. **Então** o cadastro é rejeitado e a mensagem diz que a data não existe. **Por que existe:** a validação de data existente vale para cadastro, não só para lançamento.

**CT-039 · inválido · caso obrigatório 14 · R1 + R16 por analogia**
**Dado** "B02". **Quando** "E1" cadastra uma passagem sem data de entrada. **Então** o cadastro é rejeitado. **Por que existe:** `ATIVIDADES!509` é uma linha órfã sem data que ninguém rejeitou; sem entrada a regra `entrada ≤ D` não tem como ser avaliada e a pessoa nunca aparece no efetivo.

**CT-040 · feliz · R1 · Modelo, entidade Passagem**
**Dado** "P2" com passagem de 05/02/2026 e saída nula. **Quando** o efetivo de 01/09/2026 é calculado. **Então** "P2" conta. **Por que existe:** saída nula significa "ainda na obra"; tratá-la como data vazia comparável daria falso em `saída ≥ D` e esvaziaria o efetivo inteiro.

---

## F2.2 — Equipamento e passagem (`equipamento-passagem.test.ts`)

**CT-041 · feliz · F2.2 c."equipamento cadastrado por identificador"**
**Dado** "B02". **Quando** "E1" cadastra "CF-29" do tipo "PATROL" com entrada 05/02/2026. **Então** "CF-29" existe com passagem de 05/02/2026 até em aberto. **Por que existe:** é o que alimenta o bloco 6, cujas colunas são identificadores.

**CT-042 · negativo · F2.2 c."identificador repetido na mesma obra é rejeitado"**
**Dado** "CF-29" já em "B02". **Quando** "E1" cadastra outro equipamento com identificador "CF-29". **Então** o cadastro é rejeitado e a mensagem diz que o identificador já existe nesta obra. **Por que existe:** identificador duplicado gera duas colunas iguais no bloco 6 e o fiscal não sabe qual é qual.

**CT-043 · fronteira · R2 ("único dentro da obra")**
**Dado** "CF-29" em "B02" e a obra "OUTRA". **Quando** "E2" cadastra "CF-29" em "OUTRA". **Então** o cadastro é aceito. **Por que existe:** a unicidade é por obra, não global; uma frota real circula entre contratos.

**CT-044 · feliz · caso obrigatório 8 · F2.2 c."equipamento que sai e volta"**
**Dado** "MT-26" com passagem de 05/02/2026 a 18/02/2026. **Quando** "E1" registra nova passagem com entrada 01/03/2026. **Então** "MT-26" é um equipamento com duas passagens e o cadastro continua com um único "MT-26". **Por que existe:** `EQUIPAMENTO!M2` é uma nota solta que registra equipamento fora da tabela justamente porque o modelo de intervalo único não comporta ida e volta.

**CT-045 · negativo · F2.2 c."saída anterior à entrada é rejeitada"**
**Dado** "B02". **Quando** "E1" cadastra "RE-17" com entrada 05/02/2026 e saída 04/02/2026. **Então** o cadastro é rejeitado. **Por que existe:** R14 vale igual para pessoa e equipamento; a decisão 1.2 acabou com a divergência de critérios da planilha.

**CT-046 · fronteira · R14**
**Dado** "B02". **Quando** "E1" cadastra "RE-18" com entrada e saída em 05/02/2026. **Então** o cadastro é aceito, com passagem de um dia. **Por que existe:** limite exato do aceite, em espelho com CT-032.

**CT-047 · negativo · R19, tabela "Quem usa"**
**Dado** "C1" encarregado. **Quando** "C1" envia ao servidor o cadastro de "TP-41". **Então** o pedido é recusado no servidor. **Por que existe:** cadastrar equipamento é do engenheiro (passo 2), verificado no servidor.

**CT-048 · fronteira · inconsist. E6**
**Dado** "B02". **Quando** "E1" cadastra o equipamento com identificador `CARRO LOC.`. **Então** o cadastro é aceito. **Por que existe:** é o valor real de `EQUIPAMENTO!B7`, um carro alugado sem placa; o produto não repete os defeitos da planilha, mas precisa aceitar os dados reais que existem por causa deles.

**CT-049 · feliz · Modelo, entidade Equipamento**
**Dado** "CF-29" do tipo "PATROL" presente em 03/09/2026. **Quando** o RDO de 03/09/2026 é montado. **Então** o bloco 6 mostra "CF-29" e em lugar nenhum aparece "PATROL". **Por que existe:** o tipo é cadastro interno e não faz parte do gabarito; imprimi-lo é divergência de layout.

---

## F2.3 — Serviço controlado (`servico-controlado.test.ts`)

**CT-050 · feliz · R6 · F2.3 c."quantidade de projeto com três casas decimais"**
**Dado** "B02" com os quatro serviços. **Quando** "E1" define a quantidade de projeto de "REC.(FRESA+CAPA)" como 2210,392. **Então** a quantidade guardada é exatamente 2210,392. **Por que existe:** é o valor real do arquivo; arredondar na entrada muda o percentual de todos os dias da obra.

**CT-051 · feliz · R15 · F2.3 c."quantidade de projeto com três casas decimais"**
**Dado** o mesmo. **Quando** a quantidade é definida. **Então** o histórico mostra que "E1" definiu esse valor e quando. **Por que existe:** na planilha as quatro quantidades vêm de um arquivo em `\\192.168.1.55` sem aviso de estar desatualizado (inconsist. G1); o denominador do percentual precisa de rastro.

**CT-052 · feliz · R15 · F2.3 c."alteração da quantidade de projeto fica no histórico"**
**Dado** a quantidade 2210,392. **Quando** "E1" altera para 2500,000. **Então** o histórico mostra a versão anterior 2210,392, a nova 2500,000, o autor "E1" e a hora. **Por que existe:** mudar o projeto muda o percentual retroativo de todo RDO já entregue; sem histórico ninguém explica a diferença ao fiscal.

**CT-053 · feliz · R15 · F2.3 c."alteração da quantidade de projeto fica no histórico"**
**Dado** a alteração para 2500,000. **Quando** qualquer RDO é aberto. **Então** o percentual usa 2500,000. **Por que existe:** o valor vigente é um só; cache do denominador antigo é o defeito que a planilha tem com o valor em cache da rede.

**CT-054 · negativo · F2.3 c."quantidade de projeto negativa é rejeitada"**
**Dado** "B02". **Quando** "E1" define a quantidade como -1. **Então** a alteração é rejeitada. **Por que existe:** percentual com denominador negativo produz número sem significado e o RDO imprime.

**CT-055 · fronteira · dec. 13.4 · F2.3 c."quantidade de projeto zero é rejeitada"**
**Dado** "B02". **Quando** "E1" define a quantidade de "RECICLAGEM(BASE+CAPA)" como 0. **Então** a alteração é rejeitada e a mensagem diz que a quantidade precisa ser maior que zero. **Por que existe:** zero é o limite inferior e é exatamente o valor que causaria divisão por zero no percentual.

**CT-056 · fronteira · dec. 13.4 · F2.3 c."quantidade de projeto de 0,001 é aceita"**
**Dado** "B02". **Quando** "E1" define a quantidade como 0,001. **Então** a quantidade guardada é exatamente 0,001. **Por que existe:** é o menor valor do outro lado da fronteira; provar que "maior que zero" não virou "maior ou igual a 1".

**CT-057 · negativo · F2.3 c."encarregado não define quantidade de projeto"**
**Dado** "C1" encarregado. **Quando** "C1" envia ao servidor a quantidade 100 para "REC.(FRESA+CAPA)". **Então** o pedido é recusado no servidor e a quantidade não muda. **Por que existe:** o denominador do percentual é dado de contrato; R19.

**CT-058 · feliz · dec. 19.1 · F2.3 contexto; regras §9**
**Dado** uma obra recém-criada. **Quando** "E1" consulta os serviços controlados. **Então** existem exatamente `REC.(FRESA+CAPA)`, `REC.(FRESA+BINDER+CAPA)`, `RECICLAGEM(BASE+CAPA)` e `IM.(SUBLEITO+BASE+CAPA)`, com essa grafia. **Por que existe:** são rótulos que o fiscal reconhece; qualquer normalização de pontuação quebra a leitura do bloco 7.

**CT-059 · fronteira · R5 + dec. 13.4**
**Dado** que nenhum serviço pode ter quantidade de projeto zero. **Quando** o percentual de um serviço é calculado. **Então** o cálculo nunca divide por zero e nunca produz `Infinity`, `NaN` ou erro. **Por que existe:** 13.4 impede o zero na entrada, mas R5 manda manter a proteção; dado antigo, migração ou defeito de outro caminho não podem quebrar a página inteira do RDO.

---

## F2.4 — Taxonomias (`taxonomia.test.ts`)

**CT-060 · feliz · dec. 19.1 · F2.4 c."status de atividade vem pré-carregado"**
**Dado** o sistema carregado. **Quando** "E1" consulta a taxonomia Status de atividade. **Então** ela contém exatamente os 14 termos de regras §9, com `Serviço Fo. Es.` e `Removido/Alteração` na grafia herdada. **Por que existe:** a coluna `STATUS` do bloco 8 é lida pelo fiscal; um termo "corrigido" é divergência de vocabulário.

**CT-061 · feliz · dec. 2.1 · F2.4 c."a taxonomia Letra de turno tem três termos"**
**Dado** o sistema carregado. **Quando** "E1" consulta as taxonomias. **Então** existe Letra de turno com exatamente `B`, `C` e `I`. **Por que existe:** é a única taxonomia de tempo que sobrou depois da 2.1.

**CT-062 · negativo · dec. 2.1 · F2.4 c."a taxonomia Letra de turno tem três termos"**
**Dado** o mesmo. **Quando** "E1" consulta as taxonomias. **Então** não existe nenhuma taxonomia Condição de tempo. **Por que existe:** a 2.1 a eliminou; deixá-la carregada faria a tela pedir duas vezes a mesma informação e feriria o lançamento rápido no celular.

**CT-063 · negativo · regras §5.2 · dec. 19.1**
**Dado** a taxonomia Letra de turno. **Quando** "E1" consulta os termos. **Então** `N` não está entre eles. **Por que existe:** a macro VBA pinta um `N` que a árvore de decisão não conhece; carregá-lo criaria um turno cujo resumo do dia é sempre vazio.

**CT-064 · feliz · dec. 17.1 · F2.4 c."função vem pré-carregada com as 12 observadas"**
**Dado** o sistema carregado. **Quando** "E1" consulta a taxonomia Função. **Então** ela contém exatamente as 12 do PRD e nenhum termo tem espaço no fim. **Por que existe:** `Servente `, `Motorista ` e `Op. Retro ` entram assim se a carga for literal, e o rótulo do bloco 5 sai com espaço.

**CT-065 · feliz · dec. 19.1 · F2.4 c."tipo de equipamento vem pré-carregado"**
**Dado** o sistema carregado. **Quando** "E1" consulta Tipo de equipamento. **Então** ela contém exatamente `APOIO`, `PATROL`, `RETRO`, `BASCULA`, `CARRO`, `ROLO`, `TRATOR` e `CARREGADEIRA`, sem espaço no fim. **Por que existe:** `CARREGADEIRA ` tem espaço final no arquivo real (inconsist. E5).

**CT-066 · feliz · dec. 20.1 · F2.4 c."motivo de dia parado é texto livre com sugestões"**
**Dado** o sistema carregado. **Quando** "E1" consulta as sugestões de motivo. **Então** são exatamente as 8 do PRD e o campo aceita qualquer texto fora dessa lista. **Por que existe:** são 110 registros reais com 13 textos distintos; lista fechada obrigaria o encarregado a mentir, lista nenhuma repetiria os 61 sem motivo.

**CT-067 · feliz · R13 · F2.4 c."engenheiro acrescenta um termo novo"**
**Dado** os 14 status herdados. **Quando** "E1" acrescenta "Retrabalho". **Então** "Retrabalho" fica disponível para lançamento e os 14 herdados continuam inalterados. **Por que existe:** a validação da planilha já reserva duas linhas vazias (`DADOS!G17:G18`): a lista cresce, e taxonomia em constante no código não cresce.

**CT-068 · feliz · dec. 19.2 · F2.4 c."termo novo vale para o sistema inteiro"**
**Dado** a obra "OUTRA" com "E2" engenheiro. **Quando** "E1" acrescenta a função "Encanador". **Então** "Encanador" está disponível no cadastro de pessoal de "OUTRA". **Por que existe:** escopo de sistema é a decisão 19.2; escopo por obra criaria 42 listas divergentes, que é o problema da planilha em outra forma.

**CT-069 · negativo · caso obrigatório 13 · F2.4 c."termo duplicado por caixa e espaço é rejeitado"**
**Dado** a taxonomia com "Perca de produção". **Quando** "E1" acrescenta `" perca de Produção "`. **Então** o termo não é acrescentado e a mensagem diz que já existe "Perca de produção". **Por que existe:** `PLUVIOMETRIA!T7` tem `Perca de Produção` e a fórmula produz `Perca de produção`; no Excel casa, em código não, e o painel conta zero.

**CT-070 · negativo · F2.4 c."encarregado não edita taxonomia"**
**Dado** "C1" encarregado. **Quando** "C1" envia ao servidor um termo novo de Status. **Então** o pedido é recusado no servidor. **Por que existe:** R19; a taxonomia é vocabulário contratual.

**CT-071 · negativo · inconsist. A3**
**Dado** um lançamento de atividade em qualquer posição da lista do dia, inclusive a 512.ª do sistema. **Quando** o status é validado. **Então** a validação consulta a tabela de domínio e rejeita termo fora dela. **Por que existe:** na planilha a validação vale da linha 5 à 511 e fora disso aponta para `#REF!`; quem continuar o log digita status livre. Validação não pode depender de faixa.

---

## F3.1 — Acesso do encarregado (`acesso-convite.test.ts`)

**CT-072 · feliz · F3.1 c."convite gerado e aceito dá acesso a uma obra só"**
**Dado** "E1" gerou um convite em link para "B02" e existe a obra "OUTRA". **Quando** "C1" aceita o convite. **Então** "C1" tem acesso a "B02" com perfil encarregado e não tem acesso a "OUTRA". **Por que existe:** o acesso é por obra; um convite que dá acesso geral quebra a fronteira de confiança logo na entrada.

**CT-073 · feliz · F3.1 c."convite gerado e aceito dá acesso a uma obra só"**
**Dado** o mesmo. **Quando** "C1" aceita. **Então** o acesso registra que foi liberado por "E1" e quando. **Por que existe:** quem liberou responde pelo acesso; sem isso a revogação não tem a quem se referir.

**CT-074 · feliz · F3.1 c."encarregado só enxerga a obra liberada"**
**Dado** "C1" com acesso a "B02". **Quando** "C1" pede ao servidor a lista de obras que pode ver. **Então** a lista contém "B02" e nada mais. **Por que existe:** vazamento por listagem é o mais fácil de deixar passar, porque nenhuma tela mostra a outra obra.

**CT-075 · negativo · F3.1 c."encarregado tenta acessar outra obra pelo identificador"**
**Dado** "C1" com acesso a "B02". **Quando** "C1" pede o RDO de 03/09/2026 de "OUTRA". **Então** o pedido é recusado no servidor e a resposta não revela nenhum dado de "OUTRA", nem se ela existe. **Por que existe:** toda leitura é filtrada pela obra do usuário; a resposta não pode diferenciar "não existe" de "não é sua".

**CT-076 · negativo · F3.1 c."encarregado não gera convite"**
**Dado** "C1" com acesso a "B02". **Quando** "C1" pede para gerar convite para "B02". **Então** o pedido é recusado no servidor. **Por que existe:** senão o acesso se propaga sozinho e o engenheiro perde o controle de quem lança.

**CT-077 · negativo · dec. 14.0 · F3.1 c."convite é de uso único"**
**Dado** o convite de "E1" para "B02" já aceito por "C1". **Quando** "C2" tenta aceitar o mesmo convite. **Então** o pedido é recusado e "C2" não ganha acesso. **Por que existe:** link circula por WhatsApp; uso único é o que impede o reencaminhamento virar acesso.

**CT-078 · fronteira · dec. 14.0 · F3.1 c."convite aceito dentro dos 7 dias"**
**Dado** um convite gerado em 01/09/2026 às 10h00. **Quando** "C1" aceita em 08/09/2026 às 09h59. **Então** "C1" tem acesso a "B02". **Por que existe:** é o último minuto dentro da validade; o lado do aceite precisa de teste próprio.

**CT-079 · fronteira · dec. 14.0 · F3.1 c."convite fora da validade de 7 dias"**
**Dado** o mesmo convite. **Quando** "C1" tenta aceitar em 08/09/2026 às 10h01. **Então** o pedido é recusado e a mensagem diz que o convite expirou. **Por que existe:** é o primeiro minuto fora; sem os dois lados, um erro de sinal passa despercebido.

**CT-080 · feliz · dec. 14.0 · F3.1 c."segundo encarregado na mesma obra é permitido"**
**Dado** "C1" já encarregado de "B02" e um convite novo. **Quando** "C2" aceita. **Então** "B02" tem dois encarregados. **Por que existe:** a obra real tem turnos e substituições; um encarregado por obra travaria o lançamento no dia da folga.

**CT-081 · feliz · dec. 14.0 · F3.1 c."engenheiro revoga o acesso de um encarregado"**
**Dado** "C1" encarregado de "B02". **Quando** "E1" revoga o acesso de "C1". **Então** o pedido seguinte de "C1" para abrir o RDO de "B02" é recusado no servidor. **Por que existe:** a revogação tem que valer na requisição seguinte, não no próximo login.

**CT-082 · feliz · dec. 14.0 · F3.1 c."engenheiro revoga o acesso de um encarregado"**
**Dado** "C1" revogado, com lançamentos já feitos. **Quando** o RDO desses dias é montado. **Então** os lançamentos continuam existindo, com a autoria preservada. **Por que existe:** revogar acesso não é apagar histórico; o RDO já entregue ao fiscal não pode mudar porque alguém saiu da obra.

**CT-083 · negativo · F3.1 c."encarregado não revoga acesso"**
**Dado** "C1" e "C2" encarregados de "B02". **Quando** "C1" pede para revogar o acesso de "C2". **Então** o pedido é recusado no servidor. **Por que existe:** R19; um encarregado não administra o outro.

**CT-084 · negativo · F3.1 c."engenheiro de outra obra não convida para B02"**
**Dado** "E2" engenheiro de "OUTRA". **Quando** "E2" pede para gerar convite para "B02". **Então** o pedido é recusado no servidor. **Por que existe:** perfil de engenheiro não é permissão global; é permissão na obra que ele responde.

**CT-085 · negativo · PRD, Requisitos de segurança, linha "Token do convite"**
**Dado** um convite gerado e uma tentativa de aceite que falha. **Quando** a falha é registrada. **Então** o token não aparece no log, na mensagem de erro, na URL registrada nem no histórico. **Por que existe:** token em log é credencial em texto claro; o link é o único fator de acesso do encarregado.
