# Casos CT-170 a CT-236 — passo 5 do PRD v1 (RDO diário na tela)

Índice, matriz, lista de não coberto e perguntas abertas: `docs/qa/v1.md`.

---

## F5.1 — Cabeçalho do RDO (`rdo-cabecalho.test.ts`)

**CT-170 · feliz · R4, dec. 6.1 · F5.1 c."data, dia da semana e número do RDO em 01/09/2026"**
**Dado** "B02" com início 05/02/2026. **Quando** "E1" abre o RDO de 01/09/2026. **Então** a data exibida é "01/09/2026", o dia da semana é "Terça-Feira" e o número do RDO é 208. **Por que existe:** 208 é o número que o fiscal reconhece e que amarra a fatura; é a única linha do cabeçalho que ele confere antes de tudo.

**CT-171 · fronteira · dec. 6.1 · F5.1 c."número do RDO no dia do início é 0"**
**Dado** "B02" com início 05/02/2026. **Quando** "E1" abre o RDO de 05/02/2026. **Então** o número do RDO é 0. **Por que existe:** o primeiro dia é RDO 0, como na planilha; um `+1` "para começar em 1" desloca os 365 dias seguintes.

**CT-172 · fronteira · R4 · F5.1 c."número do RDO conta dia corrido, inclusive domingo"**
**Dado** "B02". **Quando** "E1" abre o RDO de 06/09/2026, um domingo. **Então** o número é exatamente 1 a mais que o de 05/09/2026. **Por que existe:** é dia corrido, não dia útil; pular domingo e feriado é a tentação óbvia e quebraria a correspondência com a planilha.

**CT-173 · feliz · R25 · F5.1 c."BMS derivado do período que contém a data"**
**Dado** o período 6 de 01/08 a 31/08/2026 e o período 7 de 01/09 a 30/09/2026. **Quando** "E1" abre o RDO de 01/09/2026. **Então** o campo `BM'S` mostra 7. **Por que existe:** o BMS é derivado da data, não digitado na aba; na planilha o 7 é literal e não é rastreável a tabela nenhuma.

**CT-174 · fronteira · R25 · F5.1 c."último dia do período ainda é do período"**
**Dado** o período 6 de 01/08 a 31/08/2026. **Quando** "E1" abre o RDO de 31/08/2026. **Então** `BM'S` mostra 6. **Por que existe:** o fim do intervalo é inclusivo; um `<` deixaria o último dia de cada BMS sem número, e é o dia do fechamento da medição.

**CT-175 · fronteira · dec. 21.1 · F5.1 c."data não coberta por nenhum período cadastrado"**
**Dado** "B02" com período cobrindo apenas 05/02 a 28/02/2026. **Quando** "E1" abre o RDO de 15/08/2026. **Então** `BM'S` sai vazio, a tela avisa que não há período cobrindo a data e o RDO é gerado. **Por que existe:** a tabela legada ia de 2022 a 2025 e não cobria 2026; vazio com aviso é honesto, erro ou bloqueio puniria o fiscal por cadastro incompleto do engenheiro.

**CT-176 · feliz · R10 · F5.1 c."informações gerais e características vêm do cadastro"**
**Dado** "B02" cadastrada. **Quando** "E1" abre o RDO de 01/09/2026. **Então** o bloco Informações gerais mostra contrato "P0476/01-25 - BLOCO 02", data início "05/02/2026" e data final "05/02/2027", e o bloco Características mostra nome, área e local cadastrados. **Por que existe:** blocos 3 e 4 são leitura do cadastro, iguais em todos os dias; divergência entre dias significa que alguém copiou em vez de ler.

**CT-177 · inválido · caso obrigatório 10 · F5.1 c."data inexistente não gera RDO"**
**Dado** "B02". **Quando** "E1" pede o RDO de 31/09/2026. **Então** nenhum RDO é gerado e a mensagem diz que a data não existe. **Por que existe:** a aba `31` existe, tem área de impressão e imprime um RDO de 01/10/2026 com número 238 e todos os blocos preenchidos. Esse documento não pode voltar a existir.

**CT-178 · fronteira · caso obrigatório 12 · F5.1 c."mês de referência vem da data"**
**Dado** "B02". **Quando** "E1" abre o RDO de 30/09/2026. **Então** todos os blocos mostram dados de 30/09/2026 e nenhum bloco mostra dado de 01/10/2026. **Por que existe:** o mês de referência é derivado da data consultada, nunca do nome do arquivo nem de um cabeçalho digitado. A pluviometria da planilha está em julho num arquivo de setembro e os quatro campos de tempo saem vazios nos 31 dias.

**CT-179 · fronteira · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "E1" abre o RDO de 28/02/2026 e depois pede o de 29/02/2026. **Então** o primeiro é gerado e o segundo é recusado por data inexistente. **Por que existe:** o mês de 28 dias é a outra metade do caso 10; a virada de fevereiro é onde o encadeamento de datas erra sem aviso.

**CT-180 · feliz · caso obrigatório 15 · R9**
**Dado** "B02". **Quando** "E1" abre o RDO de 03/09/2026. **Então** a data é exibida como "03/09/2026" e em lugar nenhum da tela aparece "09/03/2026". **Por que existe:** metade das abas da planilha usa formato americano; 03/09 e 09/03 trocam de significado conforme a aba.

**CT-181 · negativo · BLOQUEADO · pergunta aberta 2**
**Dado** "B02" com início 05/02/2026. **Quando** "E1" pede o RDO de 04/02/2026. **Então** _&lt;indefinido&gt;_. **Por que existe:** a 13.1 rejeita **lançamento** com data fora do período da obra, mas o PRD não diz o que acontece ao **consultar** um dia anterior ao início. Pela R4 o número seria -1, e um RDO numerado -1 não existe no contrato. Duas saídas plausíveis (recusar a consulta ou gerar RDO sem número) e nenhuma escrita. **Status: bloqueado.**

---

## F5.2 — Efetivo de pessoal e de equipamento (`rdo-efetivo.test.ts`)

Contexto dos casos CT-182 a CT-196: "P1" Motorista, passagem 10/02/2026 a 20/02/2026; "P2" Motorista, passagem de 05/02/2026 em aberto; "P3" Pedreiro, de 16/02/2026 em aberto; "MT-26" com passagem de 05/02/2026 a 18/02/2026 e outra de 01/03/2026 em aberto.

**CT-182 · negativo · R1 · F5.2 c."pessoa não conta antes da entrada"**
**Quando** "E1" abre o RDO de 09/02/2026. **Então** o efetivo de "Motorista" é 1. **Por que existe:** "P1" entra em 10/02 e não pode contar no dia anterior; é o lado de fora da fronteira de entrada.

**CT-183 · fronteira · gabarito bloco 5 · F5.2 c."pessoa não conta antes da entrada"**
**Quando** "E1" abre o RDO de 09/02/2026. **Então** o efetivo de "Pedreiro" é exibido em branco, e não como 0. **Por que existe:** o gabarito mostra célula vazia, não zero; um `0` em 41 colunas polui o bloco e não é o que o fiscal está acostumado a ler.

**CT-184 · fronteira · R1 · F5.2 c."pessoa conta no dia da entrada"**
**Quando** "E1" abre o RDO de 10/02/2026. **Então** o efetivo de "Motorista" é 2. **Por que existe:** `entrada ≤ D` é inclusivo; um `<` apagaria o primeiro dia de cada pessoa na obra.

**CT-185 · feliz · R1 · F5.2 c."pessoa conta no dia anterior à saída"**
**Quando** "E1" abre o RDO de 19/02/2026. **Então** o efetivo de "Motorista" é 2. **Por que existe:** é o caso normal, dentro do intervalo, e a referência contra a qual as fronteiras de saída são lidas.

**CT-186 · fronteira · caso obrigatório 1 · dec. 1.1 · F5.2 c."pessoa conta no dia exato da saída"**
**Quando** "E1" abre o RDO de 20/02/2026. **Então** o efetivo de "Motorista" é 2. **Por que existe:** a planilha responde das duas formas ao mesmo tempo, `≤` nas colunas B:S e `<` em T:AP (regras §1.1). A decisão 1.1 fixou que a data de saída é o último dia trabalhado, logo `saída ≥ D`. Sem este teste, metade das colunas do bloco 5 volta a discordar da outra metade.

**CT-187 · fronteira · R1 · F5.2 c."pessoa não conta no dia seguinte à saída"**
**Quando** "E1" abre o RDO de 21/02/2026. **Então** o efetivo de "Motorista" é 1. **Por que existe:** é o lado de fora da fronteira de saída; sem ele, um `≥` frouxo faria a pessoa contar para sempre.

**CT-188 · feliz · bloco 5 · F5.2 c."total do efetivo é a soma das funções"**
**Quando** "E1" abre o RDO de 19/02/2026. **Então** o TOTAL do efetivo pessoal é 3. **Por que existe:** o total é conferido pelo fiscal contra as colunas; total que não é a soma é o erro mais visível do documento.

**CT-189 · negativo · R2, LGPD · F5.2 c."efetivo agrega por função, sem nome"**
**Quando** "E1" abre o RDO de 19/02/2026. **Então** o bloco de efetivo pessoal mostra as colunas "Motorista" e "Pedreiro" com quantidades e não contém "P1", "P2", "P3" nem qualquer nome de pessoa. **Por que existe:** o documento que circula não precisa dizer quem trabalhou; são 19 nomes completos com função e admissão no arquivo real.

**CT-190 · fronteira · caso obrigatório 8 · R3 · F5.2 c."equipamento no intervalo entre duas passagens"**
**Quando** "E1" abre o RDO de 20/02/2026. **Então** o efetivo de "MT-26" é exibido em branco. **Por que existe:** entre 18/02 e 01/03 o equipamento não está na obra; um modelo de intervalo único, com entrada mínima e saída máxima, contaria ele presente o tempo todo.

**CT-191 · fronteira · caso obrigatório 8 · R3 · F5.2 c."equipamento na segunda passagem conta uma vez"**
**Quando** "E1" abre o RDO de 05/03/2026. **Então** o efetivo de "MT-26" é 1 e o TOTAL do efetivo de equipamentos é 1. **Por que existe:** contar por linha de cadastro daria 2; a contagem é por equipamento, mesmo com duas passagens.

**CT-192 · fronteira · caso obrigatório 1 · dec. 1.2 · F5.2 c."equipamento conta no dia exato da saída"**
**Quando** "E1" abre o RDO de 18/02/2026. **Então** o efetivo de "MT-26" é 1. **Por que existe:** a 1.2 mandou equipamento seguir a mesma regra da pessoa; a planilha tinha três comportamentos diferentes para a mesma pergunta.

**CT-193 · fronteira · dec. 5.1 · F5.2 c."efetivo zerado em dia parado"**
**Dado** 06/09/2026 parado com motivo "Domingo". **Quando** "E1" abre o RDO de 06/09/2026. **Então** o efetivo de "Motorista" é 0, exibido em branco, e os TOTAIS de pessoal e de equipamento são 0. **Por que existe:** hoje o RDO mostra 19 pessoas no domingo. É mudança de conteúdo do documento que o fiscal vai notar, e por isso precisa estar travada.

**CT-194 · fronteira · dec. 5.1 · F5.2 c."efetivo mobilizado em dia não lançado"**
**Dado** que ninguém lançou nada em 07/09/2026. **Quando** "E1" abre o RDO de 07/09/2026. **Então** o efetivo de "Motorista" é 1. **Por que existe:** o efetivo é o mobilizado e só zera quando o dia é declarado **parado**; "não lançado" não é "parado", e confundir os dois esvaziaria todo dia ainda não preenchido.

**CT-195 · negativo · R2, R19 · F5.2 c."encarregado vê o efetivo por função, não o cadastro"**
**Dado** "C1" encarregado. **Quando** "C1" abre o RDO de 19/02/2026. **Então** "C1" vê "Motorista" com 2 e "Pedreiro" com 1, e a resposta do servidor não contém nome de pessoa. **Por que existe:** o encarregado precisa do agregado para conferir o dia, e de nada além disso.

**CT-196 · fronteira · R1 + F2.1 c."saída no mesmo dia da entrada"**
**Dado** "P4" Motorista com passagem de 10/02/2026 a 10/02/2026. **Quando** o efetivo é calculado em 09, 10 e 11/02/2026. **Então** "P4" conta apenas em 10/02/2026. **Por que existe:** passagem de um dia é o intervalo em que `entrada ≤ D` e `saída ≥ D` coincidem; qualquer assimetria entre as duas comparações faz esse dia sumir ou durar para sempre.

---

## F5.3 — Produção controlada (`rdo-producao.test.ts`)

Contexto dos casos CT-197 a CT-207: "REC.(FRESA+CAPA)" com projeto 2210,392; os outros três serviços com projeto 1000,000 e sem lançamento; lançamentos de 1000,000 em 09/03/2026 e de 234,500 em 03/09/2026 para "REC.(FRESA+CAPA)".

**CT-197 · feliz · R5 · F5.3 c."executado, acumulado, projeto e percentual do dia"**
**Quando** "E1" abre o RDO de 03/09/2026. **Então** "REC.(FRESA+CAPA)" mostra `EXEC.` "234,50", `ACUM.` "1.234,50", `PROJETO` "2.210,39" e percentual 55,85%. **Por que existe:** são as quatro colunas do bloco 7 e a base da medição; é o caminho feliz completo.

**CT-198 · fronteira · dec. 17.2 · F5.3 c."dia sem produção mostra traço e o acumulado até o dia"**
**Quando** "E1" abre o RDO de 10/03/2026. **Então** `ACUM.` é "1.000,00" e `EXEC.` é exibido como "-". **Por que existe:** dia sem produção tem executado vazio e acumulado cheio; imprimir "0,00" em `EXEC.` diverge do gabarito, e zerar o `ACUM.` seria erro de cálculo.

**CT-199 · fronteira · R5, dec. 17.2 · F5.3 c."dia anterior ao primeiro lançamento"**
**Quando** "E1" abre o RDO de 08/03/2026. **Então** "REC.(FRESA+CAPA)" mostra `EXEC.` "-", `ACUM.` "-" e percentual 0%. **Por que existe:** é o estado inicial de todo serviço; o percentual continua numérico enquanto as outras duas colunas viram traço, que é a leitura literal da 17.2 registrada no PRD.

**CT-200 · feliz · gabarito bloco 7 · F5.3 c."os quatro serviços aparecem sempre"**
**Quando** "E1" abre o RDO de 03/09/2026. **Então** o bloco mostra 4 linhas, na ordem "REC.(FRESA+CAPA)", "REC.(FRESA+BINDER+CAPA)", "RECICLAGEM(BASE+CAPA)", "IM.(SUBLEITO+BASE+CAPA)". **Por que existe:** são posições fixas do layout; esconder a linha do serviço sem produção muda a altura do bloco e desalinha o documento.

**CT-201 · feliz · R5, R18 · F5.3 c."corrigir março corrige setembro sem ação extra"**
**Dado** que o lançamento de 09/03/2026 foi corrigido de 1000,000 para 900,000. **Quando** "E1" abre o RDO de 03/09/2026. **Então** `ACUM.` de "REC.(FRESA+CAPA)" é "1.134,50". **Por que existe:** é a prova de que o acumulado é recalculado e não guardado. Se alguém gravar o acumulado numa tabela, este é o teste que quebra.

**CT-202 · fronteira · caso obrigatório 6 · F5.3 c."acumulado acima do projeto"**
**Dado** um lançamento adicional de 1065,500 em 04/09/2026. **Quando** "E1" abre o RDO de 04/09/2026. **Então** `ACUM.` é "2.300,00", o percentual é 104,05%, há um aviso de acumulado acima do projeto e o RDO é gerado normalmente. **Por que existe:** a planilha não tem limite superior nem alerta; o percentual real acima de 100% é informação, não erro, e travar o RDO impediria a medição de um aditivo.

**CT-203 · fronteira · caso obrigatório 6 · R5 ("acumulado acima do projeto")**
**Dado** lançamentos que somam exatamente 2210,392 até 04/09/2026. **Quando** "E1" abre o RDO de 04/09/2026. **Então** o percentual é 100,00% e **não** há aviso. **Por que existe:** igual não é acima; um `>=` na condição do aviso faria todo serviço concluído nascer marcado como estourado.

**CT-204 · fronteira · R6 · F5.3 c."soma decimal exata"**
**Dado** que os únicos lançamentos de "RECICLAGEM(BASE+CAPA)" são 0,1 em 01/09/2026 e 0,2 em 02/09/2026. **Quando** "E1" abre o RDO de 02/09/2026. **Então** `ACUM.` é "0,30". **Por que existe:** em ponto flutuante binário isso dá 0,30000000000000004; com três casas significativas nas quantidades reais, o erro se acumula ao longo de um ano de lançamentos e diverge da planilha.

**CT-205 · feliz · R5 · F5.3 c."renomear o serviço não zera o acumulado"**
**Dado** que "E1" renomeou "REC.(FRESA+CAPA)" para "REC. (FRESA+CAPA)". **Quando** "E1" abre o RDO de 03/09/2026. **Então** a linha "REC. (FRESA+CAPA)" mostra `ACUM.` "1.234,50". **Por que existe:** o casamento é por referência ao cadastro, nunca por igualdade de texto; na planilha renomear o serviço zeraria a coluna inteira.

**CT-206 · feliz · caso obrigatório 15 · F5.3 c."número em formato brasileiro"**
**Dado** o acumulado de "IM.(SUBLEITO+BASE+CAPA)" em 03/09/2026 igual a 14163,33. **Quando** "E1" abre o RDO. **Então** `ACUM.` é exibido como "14.163,33" e nunca como "14,163.33". **Por que existe:** separador trocado transforma catorze mil em catorze na leitura do fiscal, e a formatação padrão do ambiente costuma ser a americana.

**CT-207 · fronteira · R5 ("soma dos lançamentos até o dia, inclusive")**
**Dado** os lançamentos de 09/03/2026 e 03/09/2026. **Quando** "E1" abre o RDO de 02/09/2026. **Então** `ACUM.` é "1.000,00", sem o lançamento de 03/09/2026. **Por que existe:** o acumulado é `≤ D`; incluir o futuro é o erro simétrico de excluir o próprio dia, e nenhum dos dois aparece se só houver teste do último dia.

---

## F5.4 — Atividades do dia (`rdo-atividades.test.ts`)

**CT-208 · feliz · R11 · F5.4 c."atividades na ordem de registro, com status"**
**Dado** que "C1" lançou em 03/09/2026, nesta ordem, "Fresagem" com "Produção" e "Visita do fiscal" com "Informativo". **Quando** "E1" abre o RDO. **Então** o bloco ATIVIDADES lista "Fresagem"/"Produção" na linha 1 e "Visita do fiscal"/"Informativo" na linha 2. **Por que existe:** a ordem é a de registro, não alfabética nem por status.

**CT-209 · fronteira · caso obrigatório 4 · dec. 4.1 · F5.4 c."dia parado mostra o motivo na primeira linha"**
**Dado** 06/09/2026 parado com motivo "Domingo". **Quando** "E1" abre o RDO. **Então** a primeira linha do bloco ATIVIDADES mostra "Domingo", o dia tem zero atividades e nenhuma linha do bloco tem status "Produção". **Por que existe:** são 79 linhas reais de dia parado classificadas como `Produção`; o motivo sai onde o fiscal já lê, mas sem virar atividade nem carregar status.

**CT-210 · feliz · dec. 20.1 · F5.4 c."motivo em texto livre sai no bloco de atividades"**
**Dado** 09/09/2026 parado com motivo "Visita técnica da concessionária". **Quando** "E1" abre o RDO. **Então** o bloco ATIVIDADES mostra esse texto na primeira linha e nenhuma outra linha. **Por que existe:** o motivo é texto livre; o bloco tem que imprimir o que foi escrito, não o rótulo de uma das 8 sugestões.

**CT-211 · fronteira · R10 · F5.4 c."15 atividades cabem"**
**Dado** 03/09/2026 com 15 atividades. **Quando** "E1" abre o RDO. **Então** as 15 aparecem, nenhuma cortada. **Por que existe:** 15 é o limite do layout e o máximo real observado é 11; o dia que chegar a 15 será o primeiro e ninguém vai estar conferindo.

**CT-212 · fronteira · caso obrigatório 5 · dec. 12.1 · F5.4 c."produção sem atividade é visível com aviso"**
**Dado** 27/03/2026 com produção 2992 e nenhuma atividade. **Quando** "E1" abre o RDO. **Então** o RDO mostra `EXEC.` "2.992,00", o bloco ATIVIDADES aparece sem nenhuma linha e a tela mostra o aviso de produção sem atividade. **Por que existe:** é o único dia assim entre 05/02 e 12/09 no arquivo real; o bloco vazio não pode esconder que houve medição.

**CT-213 · fronteira · caso obrigatório 4 · dec. 4.2**
**Dado** 04/09/2026 marcado como **trabalhado**, com zero atividades lançadas. **Quando** "E1" abre o RDO. **Então** o bloco ATIVIDADES aparece sem nenhuma linha e sem nenhum motivo de parada. **Por que existe:** é o terceiro estado do bloco vazio, diferente de "parado" (que tem motivo na linha 1) e de "não lançado". Hoje os três viram a mesma atividade falsa "Não houve atividades" com status `Produção`.

---

## F5.5 — Pluviometria e resumo do dia (`rdo-pluviometria.test.ts`)

**CT-214 · feliz · dec. 2.3 · F5.5 c."bloco de pluviometria mostra a letra do turno"**
**Dado** a pluviometria de 03/09/2026 com "B", "C", "B" e índice 8. **Quando** "E1" abre o RDO. **Então** `NOITE ANTER` mostra "B", `MANHÃ` "C", `TARDE` "B" e `INDICE` "8 mm". **Por que existe:** a letra é o que a fórmula da planilha imprime; palavra por extenso é divergência de gabarito.

**CT-215 · fronteira · dec. 2.2 · F5.5 c."turno em branco aparece em branco no bloco"**
**Dado** a pluviometria de 06/09/2026 com "B", "B", tarde em branco e índice 0. **Quando** "E1" abre o RDO. **Então** `TARDE` aparece em branco e o RDO é gerado. **Por que existe:** turno em branco é aceito no lançamento (2.2) e não pode virar traço, zero ou erro na exibição.

**CT-216 · feliz · R7 · F5.5 c."três B dá Trabalhado"**
**Dado** a pluviometria de 01/09/2026 com "B","B","B" e índice 0. **Quando** o resumo do dia é calculado. **Então** é "Trabalhado". **Por que existe:** é o passo 1 da árvore e o dia mais comum da obra.

**CT-217 · fronteira · dec. 3.1 · F5.5 c."chuva com índice 9 dá Trabalhado"**
**Dado** a pluviometria de 02/09/2026 com "C","B","B" e índice 9. **Quando** o resumo é calculado. **Então** é "Trabalhado". **Por que existe:** 9 é o último valor abaixo da fronteira; é o passo 2 da árvore.

**CT-218 · fronteira · caso obrigatório 3 · dec. 3.1 · F5.5 c."chuva com índice exatamente 10"**
**Dado** a pluviometria de 04/09/2026 com "C","B","B" e índice 10. **Quando** o resumo é calculado. **Então** é "Perca de produção", com p minúsculo, e nunca é vazio. **Por que existe:** a árvore da planilha testa `< 10` e `> 10` e deixa o 10 exato cair no vazio. A decisão 3.1 fechou o buraco com `≥ 10`. Se este teste tivesse sido escrito lendo a fórmula, o vazio estaria congelado como comportamento correto para sempre.

**CT-219 · fronteira · dec. 3.1 · F5.5 c."chuva com índice 11 dá Perca de produção"**
**Dado** a pluviometria de 03/09/2026 com "C","B","B" e índice 11. **Quando** o resumo é calculado. **Então** é "Perca de produção". **Por que existe:** é o primeiro valor acima da fronteira; com 9, 10 e 11 testados, nenhum deslocamento de limite passa.

**CT-220 · fronteira · caso obrigatório 3 · dec. 3.2 · F5.5 c."chuva com índice 0 continua Trabalhado"**
**Dado** a pluviometria de 05/09/2026 com "C","B","B" e índice 0. **Quando** o resumo é calculado. **Então** é "Trabalhado". **Por que existe:** chuva com zero milímetro continua dia trabalhado, e é intencional (3.2). É o valor que a intuição quer mandar para "Perca de produção".

**CT-221 · feliz · R7 · F5.5 c."impraticável sem chuva dá Impraticavél"**
**Dado** a pluviometria de 07/09/2026 com "B","B","I" e índice 0. **Quando** o resumo é calculado. **Então** é "Impraticavél", com essa grafia. **Por que existe:** é o passo 4 da árvore, e a grafia com acento na vogal errada é vocabulário herdado do cliente.

**CT-222 · fronteira · R7 · F5.5 c."chuva e impraticável com índice 11 segue a ordem"**
**Dado** a pluviometria de 08/09/2026 com "C","I","B" e índice 11. **Quando** o resumo é calculado. **Então** é "Perca de produção", porque o passo 3 vem antes do passo 4. **Por que existe:** a árvore para na primeira condição verdadeira; avaliar em qualquer outra ordem dá "Impraticavél" e muda a contagem do mês.

**CT-223 · fronteira · R7 (passo 2 antes do passo 4)**
**Dado** a pluviometria de 11/09/2026 com "C","I","B" e índice 9. **Quando** o resumo é calculado. **Então** é "Trabalhado". **Por que existe:** com `I` presente e chuva fraca, a ordem da árvore manda em "Trabalhado" antes de chegar em "Impraticavél". É contraintuitivo, é o que a regra diz, e é onde uma reordenação "lógica" quebraria em silêncio.

**CT-224 · fronteira · R7 (passo 5)**
**Dado** a pluviometria de 12/09/2026 com os três turnos em branco e índice 20. **Quando** o resumo é calculado. **Então** o resumo é vazio. **Por que existe:** é o único caminho legítimo para o vazio depois da 3.1; sem ele, um vazio causado por defeito seria indistinguível do vazio previsto.

**CT-225 · fronteira · F5.5 c."dia sem pluviometria lançada"**
**Dado** que 09/09/2026 não tem lançamento de pluviometria. **Quando** "E1" abre o RDO. **Então** o bloco PLUVIOMETRIA aparece com os quatro rótulos e os valores em branco, e o RDO é gerado. **Por que existe:** ausência de lançamento não é erro nem zero; e o bloco não some do layout.

**CT-226 · feliz · dec. 3.3 · F5.5 c."resumo do dia aparece na tela do RDO diário"**
**Dado** a pluviometria de 10/09/2026 com "C","B","B" e índice 12. **Quando** "E1" abre o RDO. **Então** a tela mostra o resumo do dia "Perca de produção". **Por que existe:** o resumo vive na tela, fora dos 11 blocos; é a contraparte de CT-239, que garante que ele não vaza para o PDF.

---

## F5.6 — Comentários (`rdo-comentarios.test.ts`)

**CT-227 · feliz · R12 · F5.6 c."observação da CROS aparece em COMENTÁRIOS CROS"**
**Dado** que "C1" lançou em 03/09/2026 a observação "Frente da Rua A liberada às 9h" de lado CROS. **Quando** "E1" abre o RDO. **Então** `COMENTÁRIOS CROS` mostra esse texto e `COMENTÁRIO CONTRATANTE` não o mostra. **Por que existe:** `01!F52` rotula `COMENTÁRIOS CROS` e lê a aba `OBSERVAÇÕES CONTRATANTE`; o bloco nunca mostrou nada em nenhum dia. Cada bloco lê a própria fonte.

**CT-228 · fronteira · dec. 10.1 · F5.6 c."bloco do contratante sai sempre vazio na v1"**
**Quando** "E1" abre o RDO de 03/09/2026. **Então** `COMENTÁRIO CONTRATANTE` aparece com o rótulo e sem nenhum texto. **Por que existe:** o bloco existe no layout e ninguém escreve nele na v1; removê-lo seria mudança de layout, preenchê-lo seria funcionalidade fora do escopo.

**CT-229 · fronteira · F5.6 c."dia sem observação"**
**Quando** "E1" abre o RDO de 04/09/2026, sem nenhuma observação. **Então** os dois blocos aparecem com os rótulos e sem texto. **Por que existe:** bloco vazio continua ocupando o espaço do gabarito; sumir muda a altura da página.

**CT-230 · feliz · caso obrigatório 11 · F5.6 c."duas observações no mesmo dia"**
**Dado** que "C1" lançou "Frente da Rua A liberada às 9h" e "E1" lançou "Recebido material às 14h", ambas em 03/09/2026, lado CROS. **Quando** "E1" abre o RDO. **Então** `COMENTÁRIOS CROS` mostra as duas, na ordem de registro. **Por que existe:** dois autores no mesmo dia e no mesmo bloco; a planilha tem uma linha por dia e o segundo comentário sobrescreveria o primeiro.

**CT-231 · fronteira · dec. 11.1 · F5.6 c."observação com mais de 4 linhas na tela"**
**Dado** uma observação de lado CROS em 05/09/2026 cujo texto ocupa 5 linhas no layout. **Quando** "E1" abre o RDO. **Então** as 5 linhas aparecem na tela, nenhuma cortada. **Por que existe:** o bloco 10 tem 4 linhas em 30 das 31 abas; na tela não há limite de página, e truncar aqui perderia texto que o PDF ainda vai imprimir em continuação.

---

## F5.7 — Rastreabilidade e acesso (`rdo-acesso.test.ts`)

**CT-232 · feliz · spec §8 · F5.7 c."todo número leva ao lançamento"**
**Dado** o `ACUM.` "1.234,50" de "REC.(FRESA+CAPA)" em 03/09/2026. **Quando** "E1" consulta os lançamentos que compõem esse valor. **Então** vê 1000,000 em 09/03/2026 e 234,500 em 03/09/2026, cada um com autor e hora de registro. **Por que existe:** na planilha a consolidação é manual e não há rastro de como o número foi obtido; todo número do RDO tem que levar de volta ao lançamento.

**CT-233 · feliz · F5.7 c."encarregado abre o RDO da própria obra"**
**Dado** "C1" encarregado de "B02". **Quando** "C1" abre o RDO de 03/09/2026. **Então** vê os 11 blocos montados. **Por que existe:** o encarregado precisa conferir o que lançou; ele lê o RDO, só não exporta nem fecha.

**CT-234 · negativo · dec. 14.0 · F5.7 c."autoria não aparece para o encarregado"**
**Dado** uma atividade de 03/09/2026 lançada por "E1". **Quando** "C1" consulta os lançamentos do dia. **Então** "C1" vê a atividade e o status, e a resposta do servidor não traz o autor nem o nome de "E1". **Por que existe:** a autoria é visível só ao engenheiro; e o filtro é no servidor, não na tela, senão o nome viaja no JSON.

**CT-235 · negativo · CLAUDE.md Segurança · F5.7 c."erro ao montar o RDO não vaza detalhe técnico"**
**Dado** uma falha interna ao calcular o RDO de 03/09/2026. **Quando** "E1" abre o RDO. **Então** a mensagem diz o que fazer e traz um identificador de correlação, e não contém stack trace nem nome de pessoa. **Por que existe:** o cálculo do efetivo mexe com o cadastro de pessoal; é o lugar mais provável de um nome vazar numa mensagem de erro.

**CT-236 · feliz · dec. 14.0**
**Dado** atividades de 03/09/2026 lançadas por "C1" e por "E1". **Quando** "E1" consulta os lançamentos do dia. **Então** "E1" vê o autor de cada um. **Por que existe:** é o lado positivo da 14.0; sem ele, o teste CT-234 poderia passar com a autoria escondida de todo mundo, inclusive de quem precisa dela para retificar.
