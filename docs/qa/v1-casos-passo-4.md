# Casos CT-086 a CT-169 — passo 4 do PRD v1 (encarregado lança o dia)

Índice, matriz, lista de não coberto e perguntas abertas: `docs/qa/v1.md`.

---

## F4.1 — Estado do dia (`dia-estado.test.ts`)

**CT-086 · feliz · F4.1 c."dia marcado como trabalhado"**
**Dado** "B02" e "C1" encarregado. **Quando** "C1" marca 03/09/2026 como trabalhado. **Então** o dia existe com estado "trabalhado" e o registro guarda autor "C1" e hora de registro. **Por que existe:** é o caminho normal; sem autoria o dia repete o defeito G5 da planilha, que qualquer um altera sem rastro.

**CT-087 · feliz · caso obrigatório 4 · dec. 4.1 · F4.1 c."dia marcado como parado com motivo"**
**Dado** "B02". **Quando** "C1" marca 06/09/2026 como parado com motivo "Domingo". **Então** o dia tem estado "parado", motivo "Domingo" e zero atividades. **Por que existe:** hoje o dia parado vira uma atividade falsa com status `Produção`, em 79 linhas reais. Estado é estado, não atividade.

**CT-088 · fronteira · caso obrigatório 4 · dec. 20.1 · F4.1 c."dia parado sem motivo é rejeitado"**
**Dado** "B02". **Quando** "C1" marca 06/09/2026 como parado com o motivo em branco. **Então** o lançamento é rejeitado com a mensagem "informe o motivo da parada" e o dia continua sem registro. **Por que existe:** 61 dos 110 dias parados reais não declaram motivo nenhum; a 20.1 fechou isso tornando o campo obrigatório, e o vazio é a fronteira exata da obrigatoriedade.

**CT-089 · fronteira · dec. 20.1 + R13**
**Dado** "B02". **Quando** "C1" marca 06/09/2026 como parado com motivo `"   "`. **Então** o lançamento é rejeitado com a mesma mensagem. **Por que existe:** espaço nas pontas é normalizado antes de comparar (R13); sem isso um campo de espaços passa por preenchido e o RDO imprime a primeira linha de atividades em branco.

**CT-090 · feliz · dec. 20.1 · F5.4 c."motivo em texto livre sai no bloco de atividades"**
**Dado** "B02". **Quando** "C1" marca 09/09/2026 como parado com motivo "Visita técnica da concessionária". **Então** o lançamento é aceito com esse texto. **Por que existe:** as 8 sugestões preenchem o campo sem fechá-lo; texto fora da lista é o caso que prova que a lista não virou taxonomia por acidente.

**CT-091 · negativo · caso obrigatório 4 · dec. 4.3 · F4.1 c."atividade lançada em dia parado é rejeitada"**
**Dado** 06/09/2026 parado com motivo "Domingo". **Quando** "C1" lança "Limpeza do pátio" com status "Limpeza" nesse dia. **Então** o lançamento é rejeitado, a mensagem diz que o dia está marcado como parado, e o dia continua parado com zero atividades. **Por que existe:** a rejeição não pode mudar o estado do dia por efeito colateral; é a metade da regra que se esquece.

**CT-092 · feliz · F4.1 c."mudar o estado do dia aberto é permitido"**
**Dado** 06/09/2026 parado com motivo "Domingo" e aberto. **Quando** "C1" muda o estado para trabalhado. **Então** o dia fica trabalhado, sem motivo de parada, e passa a aceitar atividade. **Por que existe:** enquanto o dia está aberto corrige-se livremente; o motivo não pode ficar pendurado num dia trabalhado e vazar para a primeira linha do bloco 8.

**CT-093 · fronteira · dec. 4.2 · F4.1 c."dia sem lançamento nenhum é não lançado"**
**Dado** que ninguém lançou nada em 07/09/2026. **Quando** "E1" abre o RDO de 07/09/2026. **Então** o estado exibido é "não lançado" e o RDO é gerado, com os blocos de cadastro preenchidos e os de lançamento vazios. **Por que existe:** "ninguém lançou" é diferente de "não houve trabalho"; confundir os dois é o que faz a planilha imprimir 12 dias de setembro com blocos vazios sem explicar o motivo.

**CT-094 · feliz · dec. 4.2 · Modelo, Dia de obra**
**Dado** que ninguém lançou nada em 07/09/2026. **Quando** o armazenamento é inspecionado. **Então** não existe registro de Dia de obra para 07/09/2026. **Por que existe:** "não lançado" é a ausência do registro, não um valor gravado; gravar 365 dias por antecipação recria as 31 abas vazias da planilha.

**CT-095 · feliz · dec. 4.1 · F5.4 c."dia parado mostra o motivo na primeira linha"**
**Dado** 06/09/2026 parado. **Quando** a quantidade de atividades do dia é derivada. **Então** é zero. **Por que existe:** o motivo ocupa a primeira linha do bloco 8 mas não é atividade; contá-lo como uma inflaria a contagem e o limite de 15.

**CT-096 · feliz · motivo fora das oito sugestões é aceito**

- **Critério:** F4.1, decisão 20.1
- **Origem da expectativa:** decisão 20.1 de 16/09/2026 — o motivo é texto livre
  obrigatório; as oito sugestões preenchem o campo sem fechá-lo
- **Por que existe:** era o caso bloqueado pela contradição do PRD sobre o campo
  `complemento`. A contradição foi resolvida: o campo não existe, porque o texto
  livre já o absorve. Validar o motivo contra a lista de sugestões é defeito, e
  é isso que este caso trava.

**Dado** a obra "B02" e o encarregado "C1" com acesso a ela
**Quando** "C1" marca 09/09/2026 como parado com o motivo "Visita técnica da concessionária"
**Então** o dia 09/09/2026 fica com estado "parado" e motivo "Visita técnica da concessionária"
**E** nenhum erro de validação é levantado por o motivo não estar nas sugestões

**CT-097 · feliz · F4.2 c."atividade com descrição e status da taxonomia"**
**Dado** 03/09/2026 aberto e trabalhado. **Quando** "C1" lança "Fresagem da Rua A, estacas 10 a 14" com status "Produção". **Então** existe um lançamento com essa data, descrição, status, autor "C1" e hora de registro. **Por que existe:** é o registro atômico do R16, base de tudo que o RDO calcula.

**CT-098 · negativo · dec. 2.1 · F4.2 c."atividade não guarda condição de tempo"**
**Dado** o mesmo. **Quando** "C1" lança "Fresagem" com status "Produção". **Então** o lançamento não tem nenhum campo de condição de tempo. **Por que existe:** a 2.1 eliminou a taxonomia de 6 termos; um campo sobrevivente faria a tela pedir tempo duas vezes.

**CT-099 · negativo · caso obrigatório 7 · F4.2 c."atividade sem status é rejeitada"**
**Dado** o mesmo. **Quando** "C1" lança "Fresagem da Rua A" sem status. **Então** o lançamento é rejeitado e a mensagem pede o status. **Por que existe:** `ATIVIDADES!J187`, `J188` e `J207` estão sem status no arquivo real; a coluna `STATUS` do bloco 8 sai em branco e o fiscal não sabe classificar a linha.

**CT-100 · inválido · F4.2 c."atividade com descrição vazia é rejeitada"**
**Dado** o mesmo. **Quando** "C1" lança uma atividade com descrição `""` e status "Produção". **Então** o lançamento é rejeitado. **Por que existe:** R21; `ATIVIDADES!509` tem status e não tem descrição, e ocupa uma das 15 linhas do bloco sem dizer nada.

**CT-101 · inválido · F4.2 c."status fora da taxonomia é rejeitado no servidor"**
**Dado** a taxonomia Status sem "Produçao". **Quando** "C1" envia ao servidor uma atividade com status "Produçao" (sem til). **Então** o lançamento é rejeitado e nenhum termo novo é criado na taxonomia. **Por que existe:** lançamento que cria termo por efeito colateral é como a lista de status ganha gêmeos; e a validação é no servidor, não na lista da tela.

**CT-102 · fronteira · caso obrigatório 13 · R13; inconsist. C8**
**Dado** a taxonomia com "Perca de produção". **Quando** "C1" envia uma atividade com status `" perca de Produção "`. **Então** o lançamento é aceito e ligado ao termo existente, sem criar termo novo. **Por que existe:** a comparação é insensível a caixa e a espaços nas pontas; rejeitar aqui trocaria um defeito pelo outro.

**CT-103 · fronteira · R10 · F4.2 c."décima quinta atividade é aceita"**
**Dado** 03/09/2026 com 14 atividades. **Quando** "C1" lança a 15.ª. **Então** o dia tem 15 atividades. **Por que existe:** 15 é o limite de linhas do bloco 8 no layout herdado; é o último valor que cabe numa página.

**CT-104 · fronteira · dec. 11.1 · F4.2 c."décima sexta atividade é aceita e transborda"**
**Dado** 03/09/2026 com 15 atividades. **Quando** "C1" lança a 16.ª. **Então** o dia tem 16 atividades e o RDO passa a sair em duas páginas, com a 16.ª na continuação. **Por que existe:** transbordo nunca é truncamento silencioso; o máximo real observado é 11, então o dia que passar de 15 vai ser o primeiro e ninguém vai estar olhando.

**CT-105 · fronteira · caso obrigatório 15 · F4.2 c."lançamento pertence ao dia escolhido"**
**Dado** que o relógio do aparelho de "C1" marca 04/09/2026 00:10 em UTC. **Quando** "C1" lança "Compactação" com status "Produção" escolhendo o dia 03/09/2026. **Então** o lançamento tem data 03/09/2026. **Por que existe:** lançamento às 23h no celular pertence ao dia que o encarregado escolheu; gravar em UTC empurra o dia inteiro para a frente e desloca todo o acumulado.

**CT-106 · feliz · R16 · F4.2 c."lançamento pertence ao dia escolhido"**
**Dado** o mesmo. **Quando** o lançamento é gravado. **Então** a hora de registro é guardada separadamente da data do lançamento. **Por que existe:** a data é dia puro da obra e a hora é metadado de auditoria; juntar as duas num campo só é o que faz o fuso vazar para a data.

**CT-107 · inválido · caso obrigatório 14 · F4.2 c."lançamento sem data é rejeitado"**
**Dado** "B02". **Quando** "C1" envia ao servidor uma atividade "Compactação" com status "Produção" e sem data. **Então** o lançamento é rejeitado. **Por que existe:** `ATIVIDADES!509` é uma linha órfã com tempo, dia da semana e status, sem data; registro sem data não é ignorado em silêncio, é recusado.

**CT-108 · inválido · caso obrigatório 10 · F4.2 c."data inexistente é rejeitada"**
**Dado** "B02". **Quando** "C1" lança escolhendo o dia 31/09/2026. **Então** o lançamento é rejeitado e a mensagem diz que a data não existe. **Por que existe:** é a data que a aba `31` gera e imprime como 01/10/2026, com número de RDO 238 e todos os blocos preenchidos.

**CT-109 · inválido · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "C1" lança escolhendo 29/02/2026. **Então** o lançamento é rejeitado e a mensagem diz que a data não existe. **Por que existe:** mês de 28 dias é a outra metade do caso 10; quem trata só o mês de 30 deixa fevereiro passar.

**CT-110 · fronteira · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "C1" lança escolhendo 28/02/2026. **Então** o lançamento é aceito com data 28/02/2026. **Por que existe:** é o último dia existente de um mês de 28; rejeitá-lo seria o erro simétrico.

**CT-111 · fronteira · caso obrigatório 10 · R9**
**Dado** "B02". **Quando** "C1" lança escolhendo 30/09/2026. **Então** o lançamento é aceito com data 30/09/2026. **Por que existe:** é o último dia existente de um mês de 30, exatamente onde o encadeamento da planilha derrapa para outubro.

**CT-112 · negativo · dec. 13.1 · F4.2 c."data anterior ao início da obra é rejeitada"**
**Dado** "B02" com início 05/02/2026. **Quando** "C1" lança escolhendo 04/02/2026. **Então** o lançamento é rejeitado e a mensagem diz que a data está fora do período da obra. **Por que existe:** dia anterior ao início teria número de RDO negativo e não corresponde a nada no contrato.

**CT-113 · fronteira · dec. 13.1 · F4.2 c."data igual ao início da obra é aceita"**
**Dado** "B02" com início 05/02/2026. **Quando** "C1" lança "Mobilização" com status "Mobilização" em 05/02/2026. **Então** o lançamento é aceito. **Por que existe:** é o primeiro dia do contrato, o RDO 0; um `>` no lugar de `≥` apagaria o dia da mobilização.

**CT-114 · negativo · dec. 13.1**
**Dado** uma obra com início 05/02/2024 e término 05/02/2025, e hoje 16/09/2026. **Quando** "C1" lança escolhendo 06/02/2025. **Então** o lançamento é rejeitado por estar fora do período da obra. **Por que existe:** é o único jeito de exercitar o limite superior da 13.1 sem esbarrar na 13.2; na obra "B02" o término é futuro e os dois limites se confundem.

**CT-115 · fronteira · dec. 13.1**
**Dado** a mesma obra encerrada em 05/02/2025. **Quando** "C1" lança escolhendo 05/02/2025. **Então** o lançamento é aceito. **Por que existe:** o último dia do contrato ainda é do contrato; é onde o RDO final da obra é lançado.

**CT-116 · negativo · dec. 13.2 · F4.2 c."data futura é rejeitada"**
**Dado** que hoje, no fuso da obra, é 16/09/2026. **Quando** "C1" lança escolhendo 17/09/2026. **Então** o lançamento é rejeitado e a mensagem diz que não se lança dia que ainda não aconteceu. **Por que existe:** RDO é relatório do que aconteceu; dia futuro lançado vira documento contratual de um dia que não existiu.

**CT-117 · fronteira · caso obrigatório 15 · F4.2 c."hoje é o hoje do fuso da obra"**
**Dado** hoje 16/09/2026 no fuso da obra e o relógio do aparelho de "C1" em 17/09/2026 02:00. **Quando** "C1" lança escolhendo 16/09/2026. **Então** o lançamento é aceito com data 16/09/2026. **Por que existe:** com a rejeição de data futura, um celular adiantado faz o encarregado ver o lançamento de hoje recusado. "Hoje" é do fuso da obra, num lugar só.

**CT-118 · feliz · caso obrigatório 11 · F4.2 c."dois autores no mesmo dia"**
**Dado** que "E1" lançou em 03/09/2026 "Visita do fiscal" com status "Informativo". **Quando** "C1" lança "Fresagem" com status "Produção" no mesmo dia. **Então** o dia tem 2 atividades, uma com autor "E1" e outra com autor "C1", e nenhuma sobrescreve a outra. **Por que existe:** a planilha não tem autoria nem fechamento: dois lançamentos do mesmo dia se sobrepõem e o último a salvar ganha.

**CT-119 · negativo · F4.2 c."encarregado não lança em obra que não é dele"**
**Dado** a obra "OUTRA", à qual "C1" não tem acesso. **Quando** "C1" envia uma atividade para "OUTRA". **Então** o pedido é recusado no servidor. **Por que existe:** R19, verificado por requisição, não por tela.

**CT-120 · feliz · R11 · F5.4 c."atividades na ordem de registro"**
**Dado** três atividades lançadas em sequência no mesmo dia. **Quando** o dia é consultado. **Então** elas mantêm a ordem de registro. **Por que existe:** o bloco 8 da planilha pega a n-ésima ocorrência; reordenar por descrição ou por status muda o que o fiscal leu ontem.

---

## F4.3 — Lançar produção (`lancamento-producao.test.ts`)

**CT-121 · feliz · R5, R6 · F4.3 c."produção do dia lançada com decimal exato"**
**Dado** o serviço "REC.(FRESA+CAPA)" com projeto 2210,392. **Quando** "C1" lança 234,500 em 03/09/2026. **Então** existe um lançamento com essa data, serviço, quantidade exatamente 234,500, autor e hora de registro. **Por que existe:** as quantidades reais têm três casas; ponto flutuante binário na entrada já erra antes de somar.

**CT-122 · negativo · F4.3 c."produção negativa é rejeitada"**
**Dado** o mesmo. **Quando** "C1" lança -5. **Então** o lançamento é rejeitado. **Por que existe:** produção negativa reduz o acumulado e é indistinguível de uma correção; correção tem caminho próprio.

**CT-123 · fronteira · dec. 13.3 · F4.3 c."produção zero é rejeitada"**
**Dado** o mesmo. **Quando** "C1" lança 0. **Então** o lançamento é rejeitado e a mensagem diz que produção zero é ausência de lançamento. **Por que existe:** zero é o limite; um lançamento de zero ocuparia a linha do bloco 7 e faria `EXEC.` sair `-` com um registro por trás, confundindo dia sem produção com dia com produção nula.

**CT-124 · fronteira · dec. 13.3 · F4.3 c."produção de 0,001 é aceita"**
**Dado** o mesmo. **Quando** "C1" lança 0,001. **Então** o lançamento é aceito com quantidade exatamente 0,001. **Por que existe:** prova que "maior que zero" não virou "maior ou igual a 1" nem sofreu arredondamento na entrada.

**CT-125 · inválido · F4.3 c."serviço fora do cadastro é rejeitado"**
**Dado** o cadastro com "REC.(FRESA+CAPA)". **Quando** "C1" envia 100 para "REC. (FRESA+CAPA)" (com espaço interno), que não existe. **Então** o lançamento é rejeitado e nenhum serviço novo é criado. **Por que existe:** espaço interno não é espaço nas pontas: a normalização do R13 não pode transformar um serviço inexistente em outro, que é como o acumulado de um serviço migraria para outro em silêncio.

**CT-126 · feliz · caso obrigatório 5 · dec. 12.1 · F4.3 c."produção em dia sem atividade é aceita com aviso"**
**Dado** que 27/03/2026 não tem nenhuma atividade lançada. **Quando** "C1" lança 2992 para "REC.(FRESA+CAPA)" nesse dia. **Então** o lançamento é aceito e o RDO de 27/03/2026 mostra na tela o aviso de produção sem atividade. **Por que existe:** 27/03/2026 é exatamente assim no arquivo real, com 2.992 em `PRODUÇÃO!A14:C14` e nenhuma linha em `ATIVIDADES`. Bloquear perderia o dado; calar repete o silêncio da planilha.

**CT-127 · fronteira · caso obrigatório 5 · dec. 12.1 · F4.3 c."produção em dia parado é aceita com aviso"**
**Dado** 06/09/2026 parado com motivo "Domingo". **Quando** "C1" lança 100 para "REC.(FRESA+CAPA)" nesse dia. **Então** o lançamento é aceito, o dia continua parado, e o RDO mostra na tela o aviso de produção em dia parado. **Por que existe:** é a combinação contraditória que mais denuncia erro de lançamento; e o aceite não pode mudar o estado do dia, ao contrário da atividade (4.3), que é rejeitada. As duas regras convivem e é fácil uniformizar por engano.

**CT-128 · fronteira · caso obrigatório 6 · F4.3 c."acumulado ultrapassa o projeto"**
**Dado** o acumulado de "REC.(FRESA+CAPA)" até 02/09/2026 igual a 2000,000 e projeto 2210,392. **Quando** "C1" lança 300 em 03/09/2026. **Então** o lançamento é aceito e "C1" vê o aviso de que o acumulado 2300,000 ultrapassa o projeto 2210,392. **Por que existe:** a planilha não tem limite superior nem alerta; aviso e não bloqueio, porque aditivo de contrato é normal e o dado medido não pode ser perdido.

**CT-129 · fronteira · caso obrigatório 6 · R5 ("acumulado acima do projeto")**
**Dado** o acumulado até 02/09/2026 igual a 2000,000 e projeto 2210,392. **Quando** "C1" lança 210,392 em 03/09/2026. **Então** o lançamento é aceito, o acumulado é exatamente 2210,392 e **não** há aviso de acumulado acima do projeto. **Por que existe:** "acima" é estritamente maior; o valor igual é a fronteira, e é onde um `>=` no lugar de `>` faria o RDO de 100% nascer com aviso indevido.

**CT-130 · inválido · caso obrigatório 14 · R16**
**Dado** "B02". **Quando** "C1" envia ao servidor uma produção de 100 sem data. **Então** o lançamento é rejeitado. **Por que existe:** o acumulado é soma por data; lançamento sem data ou some do acumulado ou entra em todos os dias.

**CT-131 · negativo · dec. 13.2, R23**
**Dado** hoje 16/09/2026 no fuso da obra. **Quando** "C1" lança produção para 17/09/2026. **Então** o lançamento é rejeitado. **Por que existe:** a validação de data futura vale para todo lançamento, não só para atividade; senão o acumulado de hoje já inclui amanhã.

**CT-132 · feliz · caso obrigatório 11 · R5**
**Dado** que "C1" lançou 100,000 e "E1" lançou 50,000 para "REC.(FRESA+CAPA)" em 03/09/2026. **Quando** o executado do dia é calculado. **Então** é 150,000, e os dois lançamentos continuam existindo com autores distintos. **Por que existe:** `EXEC.` é a soma dos lançamentos do dia, não o último valor digitado; a planilha tem uma célula por dia e o segundo lançamento apagaria o primeiro.

---

## F4.4 — Turnos e índice pluviométrico (`lancamento-pluviometria.test.ts`)

**CT-133 · negativo · dec. 2.1 · F4.4 c."a tela não pede condição de tempo"**
**Dado** "B02". **Quando** "C1" abre a tela de lançamento de 03/09/2026. **Então** a tela pede noite anterior, manhã, tarde e índice em mm, e não pede nenhuma condição de tempo de 6 termos. **Por que existe:** pedir as duas coisas feriria o lançamento rápido em celular e o PDF só imprime os turnos.

**CT-134 · feliz · F4.4 c."pluviometria com três turnos e índice"**
**Dado** "B02". **Quando** "C1" lança para 03/09/2026 noite anterior "B", manhã "C", tarde "B" e índice 8 mm. **Então** existe um lançamento com esses quatro valores, autor "C1" e hora de registro. **Por que existe:** é a entrada do bloco 9 e do resumo do dia.

**CT-135 · inválido · F4.4 c."letra de turno fora de B, C, I é rejeitada"**
**Dado** "B02". **Quando** "C1" envia manhã "N" para 03/09/2026. **Então** o lançamento é rejeitado. **Por que existe:** a macro VBA da planilha pinta um `N` que a árvore de decisão não conhece; aceito, produziria resumo do dia vazio sem motivo aparente.

**CT-136 · fronteira · caso obrigatório 13 · R13**
**Dado** a taxonomia Letra de turno com "C". **Quando** "C1" envia manhã `"c"`. **Então** o lançamento é aceito e ligado ao termo "C". **Por que existe:** a comparação de termo é insensível a caixa; a árvore do resumo testa "existe C" e uma minúscula não casada cairia no ramo vazio.

**CT-137 · negativo · F4.4 c."índice negativo é rejeitado"**
**Dado** "B02". **Quando** "C1" lança índice -3 mm. **Então** o lançamento é rejeitado. **Por que existe:** chuva negativa não existe, e o valor entraria no acumulado do mês reduzindo-o.

**CT-138 · fronteira · dec. 3.2 · F4.4 c."índice zero é aceito"**
**Dado** "B02". **Quando** "C1" lança noite anterior "C", manhã "B", tarde "B" e índice 0 mm. **Então** o lançamento é aceito com índice 0. **Por que existe:** zero é o limite inferior e é válido; chuva registrada sem acumular milímetro é o caso comum de garoa.

**CT-139 · fronteira · dec. 2.2 · F4.4 c."turno em branco é aceito"**
**Dado** "B02". **Quando** "C1" lança noite anterior "B", manhã "B", tarde em branco e índice 0. **Então** o lançamento é aceito com a tarde em branco. **Por que existe:** o encarregado lança de manhã e nem sempre sabe a tarde; exigir os três turnos faria ele inventar um.

**CT-140 · fronteira · dec. 2.2**
**Dado** "B02". **Quando** "C1" lança os três turnos em branco e índice 12. **Então** o lançamento é aceito. **Por que existe:** é o extremo do 2.2; e o resumo do dia resultante cai no ramo "caso contrário" da árvore, que precisa existir (ver CT-224).

**CT-141 · inválido · caso obrigatório 14 · R16**
**Dado** "B02". **Quando** "C1" envia uma pluviometria sem data. **Então** o lançamento é rejeitado. **Por que existe:** `PLUVIOMETRIA` da planilha está em julho num arquivo de setembro e o RDO sai vazio nos 31 dias; pluviometria sem data é a forma extrema do mesmo problema.

---

## F4.5 — Lançar observação (`lancamento-observacao.test.ts`)

**CT-142 · feliz · R12 · F4.5 c."observação da contratada"**
**Dado** "B02". **Quando** "C1" lança em 03/09/2026 a observação "Frente da Rua A liberada pela fiscalização às 9h". **Então** existe um lançamento com essa data, lado CROS, esse texto, autor "C1" e hora de registro. **Por que existe:** é a fonte do bloco `COMENTÁRIOS CROS`, que na planilha lê a aba errada e nunca mostrou nada.

**CT-143 · inválido · F4.5 c."observação vazia é rejeitada"**
**Dado** "B02". **Quando** "C1" lança uma observação com texto `""`. **Então** o lançamento é rejeitado. **Por que existe:** observação vazia ocupa uma das 4 linhas do bloco 10 sem conteúdo.

**CT-144 · fronteira · R23 + dec. 17.1**
**Dado** "B02". **Quando** "C1" lança uma observação com texto `"    "`. **Então** o lançamento é rejeitado. **Por que existe:** a normalização das pontas acontece antes da validação de vazio; sem isso o campo de espaços passa e imprime linha em branco.

**CT-145 · negativo · dec. 10.1 · F4.5 c."lado CONTRATANTE não recebe lançamento na v1"**
**Dado** "B02". **Quando** "E1" lança uma observação de lado CONTRATANTE. **Então** o lançamento é rejeitado e a mensagem diz que o bloco `COMENTÁRIO CONTRATANTE` sai vazio na v1. **Por que existe:** o fluxo de comentário do contratante está fora do escopo; o bloco existe no layout e é decorativo, como `01!F57` já é na planilha.

---

## F4.6 — Corrigir, fechar e retificar (`fechamento-retificacao.test.ts`)

**CT-146 · feliz · F4.6 c."correção em dia aberto substitui o lançamento"**
**Dado** 03/09/2026 aberto, com a atividade "Fresagem da Rua A" de "C1". **Quando** "C1" corrige a descrição para "Fresagem da Rua A, estacas 10 a 14". **Então** o RDO mostra o texto novo e o registro guarda autor "C1" e a hora da correção. **Por que existe:** enquanto o dia está aberto corrige-se livremente; exigir retificação aqui tornaria o lançamento pesado demais no canteiro.

**CT-147 · feliz · F4.6 c."exclusão em dia aberto"**
**Dado** o mesmo, com uma única atividade. **Quando** "C1" exclui a atividade. **Então** o RDO não a mostra e o dia tem 0 atividades. **Por que existe:** dia aberto com zero atividades é estado legítimo e diferente de dia parado.

**CT-148 · feliz · dec. 9.1, 6.2 · F4.6 c."o engenheiro fecha o dia e o número congela"**
**Dado** 03/09/2026 aberto, obra iniciada em 05/02/2026. **Quando** "E1" fecha o dia. **Então** o dia fica fechado, com quem fechou e quando, e o número do RDO fica congelado em 210. **Por que existe:** 210 é `03/09/2026 − 05/02/2026`; é o identificador do documento entregue ao fiscal e a única coisa do RDO que se grava.

**CT-149 · negativo · F4.6 c."encarregado não fecha o dia"**
**Dado** 03/09/2026 aberto. **Quando** "C1" pede para fechar o dia. **Então** o pedido é recusado no servidor e o dia continua aberto. **Por que existe:** fechar o dia é o ato que torna o lançamento imutável; é do engenheiro.

**CT-150 · negativo · dec. 9.1 · F4.6 c."exportar o PDF não fecha o dia"**
**Dado** 03/09/2026 aberto. **Quando** "E1" exporta o RDO. **Então** o dia continua aberto. **Por que existe:** exportar é ato de leitura; acoplar fechamento à exportação congelaria o dia por um PDF de conferência.

**CT-151 · negativo · R17 · F4.6 c."correção direta em dia fechado é rejeitada"**
**Dado** 03/09/2026 fechado. **Quando** "C1" tenta corrigir a descrição da atividade. **Então** a correção é rejeitada e a mensagem diz que o dia está fechado e que a mudança precisa ser uma retificação. **Por que existe:** RDO entregue ao fiscal não muda em silêncio; na planilha qualquer um altera um dia já entregue sem deixar rastro.

**CT-152 · feliz · R17 · F4.6 c."retificação aponta para o original"**
**Dado** 03/09/2026 fechado. **Quando** "E1" retifica a atividade para "Fresagem da Rua A, estacas 10 a 14". **Então** o RDO mostra o texto novo e o histórico mostra o lançamento original e a retificação, cada um com autor e hora de registro. **Por que existe:** as duas versões ficam; o RDO mostra a vigente.

**CT-153 · fronteira · dec. 6.2 · F4.6 c."retificação aponta para o original"**
**Dado** o mesmo. **Quando** a retificação é criada. **Então** o número do RDO de 03/09/2026 continua 210. **Por que existe:** retificar conteúdo não pode renumerar o documento; o número é o que o fiscal usa para achar a medição.

**CT-154 · fronteira · dec. 22.1 · F4.6 c."encarregado não retifica dia fechado"**
**Dado** 03/09/2026 fechado, com a atividade lançada pelo próprio "C1". **Quando** "C1" envia uma retificação dessa atividade. **Então** o servidor recusa por falta de permissão e a atividade continua com o conteúdo original. **Por que existe:** é a fronteira exata da 22.1: ser o autor não dá direito de retificar; só o perfil de engenheiro dá. É o caso em que a intuição de "é meu, posso mexer" leva ao código errado.

**CT-155 · feliz · dec. 22.1 · F4.6 c."engenheiro retifica lançamento feito pelo encarregado"**
**Dado** 03/09/2026 fechado, com a atividade lançada por "C1". **Quando** "E1" retifica para "Fresagem da Rua A - bordo direito". **Então** existe uma retificação apontando para o original, com autor "E1", o RDO mostra o texto novo e as duas versões continuam no histórico. **Por que existe:** o engenheiro retifica lançamento de qualquer autor; é ele quem responde pelo documento.

**CT-156 · feliz · dec. 22.1 · F4.6 c."engenheiro retifica o próprio lançamento"**
**Dado** 03/09/2026 fechado, com a produção de 1.884,00 em "IM.(SUBLEITO+BASE+CAPA)" lançada por "E1". **Quando** "E1" retifica para 1.900,00. **Então** existe uma retificação apontando para o original, com autor "E1". **Por que existe:** "qualquer autor" inclui ele mesmo; uma regra que excluísse o próprio autor deixaria o engenheiro sem como corrigir o que ele lançou em campo.

**CT-157 · feliz · R5 + dec. 22.1 · F4.6 c."engenheiro retifica o próprio lançamento"**
**Dado** a retificação de 1.884,00 para 1.900,00 em 03/09/2026. **Quando** o acumulado do serviço em 03/09/2026 é calculado. **Então** usa 1.900,00. **Por que existe:** o RDO é consulta sobre a versão vigente; se a retificação não entrar no acumulado, o histórico fica bonito e o número fica errado.

**CT-158 · fronteira · dec. 6.2 · F4.6 c."número congelado não muda quando a data de início muda"**
**Dado** 03/09/2026 fechado com número 210. **Quando** "E1" corrige a data de início da obra para 06/02/2026. **Então** o número do RDO de 03/09/2026 continua 210. **Por que existe:** é a razão de existir do congelamento; sem ele, corrigir um campo do cadastro renumeraria todos os RDOs já entregues.

**CT-159 · fronteira · dec. 6.2 · F4.6 c."número congelado não muda quando a data de início muda"**
**Dado** o mesmo, e 04/09/2026 ainda aberto. **Quando** o RDO de 04/09/2026 é consultado. **Então** o número é calculado a partir de 06/02/2026, e não de 05/02/2026. **Por que existe:** é a outra metade da 6.2: dia aberto recalcula. Dois vizinhos numerados por regras diferentes é o comportamento desejado e parece defeito.

**CT-160 · negativo · F4.6 c."encarregado não corrige lançamento de outra obra"**
**Dado** a obra "OUTRA" com uma atividade em 03/09/2026 lançada por "E2". **Quando** "C1" envia uma correção para essa atividade. **Então** o pedido é recusado no servidor. **Por que existe:** o identificador do lançamento não pode ser chave de acesso; a obra do lançamento é conferida contra a obra do usuário.

---

## F4.7 — Pré-preenchimento (`pre-preenchimento.test.ts`)

**CT-161 · feliz · dec. 15.1 · F4.7 c."abrir o dia seguinte traz estado e turnos"**
**Dado** 02/09/2026 lançado como trabalhado, turnos "B","B","B", índice 4 mm e 3 atividades. **Quando** "C1" abre a tela de 03/09/2026 pela primeira vez. **Então** vêm pré-preenchidos o estado "trabalhado" e os turnos "B","B","B", e nenhuma atividade de 02/09/2026 aparece. **Por que existe:** o que se repete todo dia vem para confirmar; atividade não se repete e copiá-la criaria produção que não houve.

**CT-162 · fronteira · dec. 15.1 · F4.7 c."o índice em mm não é pré-preenchido"**
**Dado** o mesmo. **Quando** "C1" abre a tela de 03/09/2026. **Então** o índice em mm vem vazio, e não 4. **Por que existe:** o índice é medição, não hábito; herdado, entraria 4 mm num dia seco e o resumo do dia sairia errado.

**CT-163 · feliz · dec. 15.1 · F4.7 c."abrir o dia seguinte traz estado e turnos"**
**Dado** o mesmo. **Quando** "C1" apenas abre a tela e sai. **Então** nada é gravado para 03/09/2026 e o dia continua "não lançado". **Por que existe:** pré-preenchimento é sugestão de tela, não lançamento; gravar ao abrir recriaria as 31 abas preenchidas por antecipação.

**CT-164 · feliz · F4.7 c."confirmar sem alterar não duplica lançamento"**
**Dado** a tela de 03/09/2026 pré-preenchida. **Quando** "C1" confirma sem alterar nada. **Então** o dia 03/09/2026 tem exatamente o que foi confirmado, uma vez, com autor "C1", e 02/09/2026 continua com 3 atividades. **Por que existe:** copiar do dia anterior não pode mover nem duplicar o dia anterior.

---

## F4.8 — Rascunho local (`rascunho-offline.test.ts`)

**CT-165 · feliz · dec. 16.1 · F4.8 c."rascunho sobrevive a fechar o navegador"**
**Dado** que "C1" digitou "Compactação" com status "Produção" para 03/09/2026 e a rede caiu antes do envio. **Quando** "C1" fecha o navegador e abre de novo a tela de 03/09/2026. **Então** a atividade continua na tela, marcada como não enviada. **Por que existe:** o encarregado lança no canteiro com sinal instável; perder o que foi digitado é o que faz ele voltar para o áudio no WhatsApp.

**CT-166 · feliz · dec. 16.1 · F4.8 c."rascunho é enviado quando a rede volta"**
**Dado** uma atividade não enviada de 03/09/2026. **Quando** a rede volta. **Então** a atividade é enviada com data 03/09/2026 e autor "C1", e a hora de registro é a do servidor no momento em que recebeu. **Por que existe:** a data é a escolhida pelo encarregado e a hora de registro é do servidor; usar a hora do aparelho traria de volta o problema de fuso.

**CT-167 · fronteira · caso obrigatório 11 · dec. 16.1 · F4.8 c."dois rascunhos do mesmo dia"**
**Dado** que "C1" e "C2" têm, cada um, um rascunho da atividade "Compactação" para 03/09/2026. **Quando** os dois são enviados. **Então** o dia fica com duas atividades "Compactação", uma de cada autor, e nenhuma é descartada pelo sistema. **Por que existe:** a v1 aceitou não ter resolução de conflito; o teste trava a decisão para que ninguém "conserte" deduplicando e apague o lançamento de alguém.

**CT-168 · negativo · dec. 13.2 · F4.8 c."rascunho de dia futuro é recusado no envio"**
**Dado** hoje 16/09/2026 no fuso da obra e um rascunho para 17/09/2026. **Quando** o rascunho é enviado. **Então** o servidor rejeita o lançamento e "C1" vê a mensagem, com o rascunho preservado na tela. **Por que existe:** validação no servidor vale também para o que vem da fila offline; e rejeitar não pode apagar o que o encarregado digitou.

**CT-169 · negativo · PRD, Requisitos de segurança, item 6**
**Dado** um rascunho local de atividade e de estado do dia. **Quando** o armazenamento local é inspecionado. **Então** ele não contém nome de trabalhador, e some quando o lançamento é aceito. **Por que existe:** o aparelho do encarregado é o ponto mais exposto, e desde 17/09/2026 ele lê e escreve o cadastro nominal de pessoal (CT-034, CT-035) — razão a mais para o rascunho, que fica fora do servidor, não guardar nome nenhum.
