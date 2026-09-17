# O RDO digital: o que muda no relatório

Este documento é para você conferir e aprovar. Ele diz o que muda no relatório que
vai para o fiscal, o que muda na sua rotina, e o que ainda está parado esperando
uma resposta sua. Nada aqui é definitivo: onde você discordar, volta atrás.

Quem lê o RDO é o fiscal da Prefeitura, e ele já conhece o formato. Por isso a
regra que guiou tudo foi: **o documento continua o mesmo; o que muda é como o
número chega nele.**

---

## 1. O que não mudou

- **Os blocos e a ordem deles.** Título, data e dia da semana, BM'S e número do
  RDO, informações gerais do contrato, características do projeto, efetivo de
  pessoal, efetivo de equipamento, produção controlada, atividades do dia,
  pluviometria, comentários e assinaturas. Nessa ordem, na mesma folha.
- **Os rótulos, com a grafia exata.** Inclusive os que estão errados:
  `Perca de produção`, `Impraticavél` e `INDICE ACUMUALDO` continuam escritos
  assim. Não são descuido nosso: é o vocabulário que o fiscal reconhece, e trocar
  para "Perda" e "Impraticável" seria mudar o documento sem avisar ninguém.
- **O número do RDO.** Continua sendo a data do dia menos a data de início do
  contrato, em dias corridos, e o primeiro dia continua sendo o RDO **0**. Em
  01/09/2026 dá 208, como hoje.
- **O efetivo é agregado.** Pessoal por função ("Servente: 5"), equipamento por
  identificador (`CF-29`). Nome de trabalhador não aparece no relatório, como já
  não aparecia.
- **A produção controlada** continua com as quatro colunas: `EXEC.`, `ACUM.`,
  `PROJETO` e a barra de percentual, para os quatro serviços.
- **A pluviometria** continua com as três letras por turno — `B`, `C` e `I` — em
  `NOITE ANTER`, `MANHÃ` e `TARDE`, mais o índice em mm. A letra é impressa como
  letra, igual à planilha.
- **As listas** são as mesmas: os 14 status de atividade, as 12 funções, os 8
  tipos de equipamento e os 4 serviços controlados, com a escrita de sempre.
- **As assinaturas** continuam com nome, titulação e CREA do responsável técnico.

---

## 2. Onde a planilha errava, e o que o sistema faz agora

Cada item abaixo é um erro real, encontrado na planilha de setembro. Comparar um
RDO antigo com um novo do mesmo dia vai mostrar diferença nesses pontos — e o
novo é o correto.

**Comentário da CROS nunca saía no RDO.** O bloco rotulado `COMENTÁRIOS CROS`
puxava da aba de observações do **contratante**, que está vazia, e não da aba da
contratada. Os 15 comentários que a CROS escreveu em sete meses nunca foram
impressos em nenhum RDO. O sistema lê a fonte certa, e esses comentários passam a
aparecer.

**O tempo saía em branco todos os dias.** A aba de pluviometria da planilha de
setembro está preenchida com **julho**, então a busca pela data não achava nada e
os quatro campos de tempo saíram vazios nos 31 dias. O sistema lê o tempo do dia
consultado. Os campos passam a vir preenchidos.

**Existia um RDO de 31 de setembro.** A aba 31 resolvia para 01/10/2026, com
número 238 e todos os blocos preenchidos com dados de outubro. O sistema não
consegue gerar dia que não existe — nem 31/09, nem 29/02 em ano comum.

**Efetivo no dia da saída.** A planilha contava ou não contava a pessoa no dia em
que ela saía, dependendo da coluna em que a função dela tinha caído: 18 colunas
faziam de um jeito, 23 do outro. O sistema tem uma regra só — a data de saída é o
**último dia trabalhado**, e a pessoa conta nesse dia. Como hoje nenhuma das
pessoas cadastradas tem data de saída, a diferença só aparece no primeiro
desligamento; a partir dele, o efetivo pode divergir em uma pessoa, e o novo é o
que bate com a folha.

**Efetivo em domingo e em dia parado.** A planilha mostra 19 pessoas e 14
equipamentos em todos os 31 dias de setembro, inclusive nos domingos e nos dias em
que a atividade registrada foi "Não houve atividades". No sistema, quando o dia
está marcado como parado, os dois blocos saem **zerados**. É a mudança de número
mais visível deste documento: um RDO de domingo vai mostrar efetivo zero.

**Dia parado marcado como "Produção".** Na planilha, dia sem trabalho virava uma
linha de atividade com o texto explicando o motivo, e em 79 casos o status dessa
linha era `Produção`. Agora o dia tem estado próprio: parado ou trabalhado. Em dia
parado, o motivo sai na **primeira linha do bloco de atividades**, que é onde o
fiscal já lê.

**Chuva de exatamente 10 mm sumia.** A fórmula do resumo do dia testava "menor que
10" e "maior que 10", e o valor 10 não caía em nenhum dos dois: o dia ficava sem
resumo e sumia da contagem do mês. No sistema, chuva com índice **10 ou mais** é
`Perca de produção`, e abaixo de 10 é `Trabalhado`. A conta do mês volta a fechar
com o número de dias.

**Três números de contrato no mesmo arquivo.** A aba modelo trazia `190/2026`, as
31 abas de dia traziam `P0476/01-25 - BLOCO 02` e o nome do arquivo trazia
`190 PMMC - BLOCO 02`. O sistema tem **um campo só**, preenchido uma vez no
cadastro da obra. O valor que vai ao documento é `P0476/01-25 - BLOCO 02`, que é o
que estava nas abas de dia.

**O BM'S era digitado à mão.** As 31 abas traziam BM'S 7, digitado, e a tabela de
períodos da planilha vai de 2022 a 2025 — nenhuma linha dela cobre setembro de 2026. Agora você cadastra os períodos da obra com número, início e fim, e o BM'S
do RDO é o do período que contém a data do dia. Se a data não estiver coberta por
período nenhum, o campo sai vazio e a tela avisa — o relatório é gerado do mesmo
jeito.

**Quantidade de projeto vinha de um arquivo na rede.** As quatro quantidades eram
um link para uma planilha no servidor da empresa. Fora da rede, a planilha usava o
último valor guardado **sem avisar que podia estar velho**. Agora a quantidade é
campo de cadastro, com registro de quem mudou e quando, e o percentual da barra
passa a ser explicável.

**Acumulado acima do previsto passava batido.** A barra de percentual não tinha
limite: se o acumulado passasse da quantidade de projeto, ela estourava dos 100% e
nada era dito. O sistema aceita o lançamento e **avisa na tela**. Não bloqueia —
quem decide é você.

**Comentário longo e dia cheio eram cortados em silêncio.** O layout tem espaço
para 15 atividades e 4 linhas de comentário por dia; o que passava disso
simplesmente não aparecia, e o texto longo era quebrado à mão em várias linhas com
a mesma data. O sistema não corta: gera uma **segunda página de continuação**. O
desenho dessa segunda página não existe na planilha e precisa da sua aprovação —
está na pergunta 5.

---

## 3. O que decidimos, e o que muda na sua rotina

- **O encarregado lança direto, do celular, e você não transcreve.** É a razão de
  ser do sistema: some o áudio do WhatsApp virando digitação sua, e some a
  conferência de 31 abas.
- **Cada lançamento fica com autor e hora.** Você vê quem lançou o quê; o
  encarregado não vê a autoria dos outros. Serve para você saber a quem perguntar,
  não para vigiar ninguém.
- **Você fecha o dia.** O encarregado não fecha. Enquanto o dia está aberto, quem
  lançou corrige o que é dele.
- **Depois de fechado, só você corrige ou exclui — e nunca em silêncio.** A
  correção fica encadeada ao original, a exclusão exige motivo, e as duas versões
  ficam no histórico. RDO já entregue ao fiscal não muda sem deixar rastro.
- **O número do RDO congela quando você fecha o dia.** Na planilha, corrigir a
  data de início do contrato renumerava todos os RDOs já entregues. Isso deixa de
  acontecer.
- **Você cadastra os períodos de BM'S da obra**, pelo menos um, já na criação da
  obra. É o que faz o campo `BM'S` sair certo sem ninguém digitar.
- **Dia parado pede motivo, e o motivo é obrigatório.** É texto livre, com oito
  sugestões que preenchem o campo num toque: `Domingo`, `Feriado`, `Chuva`,
  `Excesso de umidade no trecho`, `Interferência de terceiro`, `Impraticável`,
  `Sem frente de serviço` e `Outro`. Dos 110 dias parados da planilha, 61 não
  diziam o motivo; agora não passa sem.
- **Dia parado e atividade não convivem.** Lançar atividade num dia parado é
  recusado com mensagem, e marcar como parado um dia que já tem atividade também
  é recusado — a mensagem pede para remover as atividades antes. Nada é apagado
  por conta própria.
- **A condição de tempo por atividade acabou.** Aquela coluna com `Bom`,
  `Nublado`, `Chuvoso`, `Chuva Parcial`, `Impraticável` e `---` deixa de existir.
  O tempo passa a ser lançado uma vez por dia, como as três letras de turno mais o
  índice em mm — que é o que o documento imprime. Turno em branco é aceito.
- **O resumo do dia** (`Trabalhado`, `Perca de produção`, `Impraticavél`) aparece
  na tela, para você conferir, e **não vai ao PDF** — como já não ia.
- **Produção zero sai como traço**, `-`, nas colunas `EXEC.` e `ACUM.`, em vez de
  um zero que compete com os números que importam.
- **O bloco `COMENTÁRIO CONTRATANTE` continua no documento, com o rótulo, sempre
  vazio.** O fiscal não escreve no sistema nesta primeira versão.
- **Só você exporta o PDF**, e cada exportação fica registrada: quem, quando, qual
  obra, qual dia. O encarregado nem vê o botão.
- **O sistema recusa lançamento com data futura, data fora do período do contrato
  e produção com quantidade zero.** É o tipo de erro que, na planilha, entrava e
  só aparecia na medição.
- **Efetivo continua sendo o mobilizado**, derivado das datas de entrada e saída
  do cadastro — não há marcação de presença diária. Exigir presença seria mais um
  lançamento por dia no celular do encarregado, e é justamente o atrito que faz
  ele desistir de usar. A única exceção é o dia parado, que zera.
- **Quem muda de função encerra a passagem e abre outra.** Assim o RDO já emitido
  não muda de função retroativamente. Pessoa ou equipamento que sai e volta tem
  duas passagens e continua contando como um só.
- **Você acessa com e-mail e senha; o encarregado, por um link.** O link vale 7
  dias, serve uma vez só e você pode revogar. Uma obra pode ter mais de um
  encarregado.
- **As listas de função, status e tipo de equipamento são editáveis por você.**
  A planilha já tinha duas linhas vazias de reserva na lista de status: a lista
  cresce, e crescer não pode depender de programador.

---

## 4. O relatório de um período — e o que inventamos nele

Isto é novo. Até agora o sistema fazia o relatório de **um dia**. Agora ele faz
também o de um **conjunto de dias**: uma semana, um mês, um intervalo, ou dias
soltos que você marca a dedo.

São três formas de tirar, e você escolhe na hora:

- **só o consolidado** — uma folha com o período inteiro somado;
- **só os diários** — um RDO por dia, um atrás do outro, cada um idêntico ao que
  já se conhece;
- **o consolidado com os diários anexados** — o resumo na frente, a prova atrás.

Sai em PDF e também em Excel.

### O que precisou de invenção, e por isso precisa do seu aval

Consolidar não é somar tudo. Cada bloco pediu uma decisão, e **estas cinco coisas
não existem na planilha** — foram criadas para este relatório. São o ponto em que
eu mais posso ter errado, porque o fiscal nunca as viu:

**1. O efetivo vira média por dia.** No diário está escrito `Servente 4`, que é
gente contada. No consolidado passa a ser `Servente 4,2`, que é média dos dias
trabalhados. Para não se confundir com contagem, o título do bloco ganhou um
complemento: **`EFETIVO PESSOAL · MÉDIA POR DIA`**. O rótulo herdado continua
inteiro, na frente.

O divisor são os dias **com lançamento**. Dia que ninguém lançou fica de fora da
conta; dia parado entra, com efetivo zero, e por isso puxa a média para baixo.

**2. A pluviometria ganhou quatro linhas novas.** No diário são as três letras de
turno mais o índice. Num período, letra de turno não faz sentido, então entram
contadores: **`DIAS BONS`**, **`DIAS CHUVOSOS`**, **`DIAS IMPRATIC.`** e
**`DIAS PARADOS`**. O `INDICE` continua, com a soma dos mm. A letra de cada dia é
a **pior** dos três turnos daquele dia.

**3. O campo `DIA` passou a dizer quantos dias são.** No diário ele traz o dia da
semana. Num conjunto isso não existe, então ele passa a trazer `6 dias`. O rótulo
não mudou; o que ele significa, sim.

**4. O `RDO Nº` traz a lista, nunca uma faixa.** Se você escolher os dias 2, 8 e
11, sai `209, 215, 218` — os três números, separados por vírgula. **Não** sai
"209 a 218", e isso é de propósito: uma faixa afirmaria que foram dez dias de
trabalho quando foram três. Num documento que sustenta medição, isso seria grave.

Em compensação, escolher um mês inteiro faz o campo ficar longo, com 26 números.
Se ficar ruim de ler no papel, me diga.

**5. As atividades saem todas, agrupadas por data.** Nada é resumido nem juntado.
Um mês rende umas 80 linhas e o documento passa de uma folha — como o diário já
faz quando o dia é cheio.

### O que não mudou no consolidado

`EXEC.` é o que foi executado **no período escolhido**. `ACUM.` continua sendo o
acumulado da obra inteira até o último dia do período, e o percentual continua
sendo acumulado dividido pela quantidade de projeto. Os rótulos e a ordem dos
blocos são os mesmos do diário.

---

## 4b. Duas coisas novas na tela, e por que elas são assim

### O controle pluviométrico do mês

A aba `PLUVIOMETRIA` da planilha virou tela: uma linha por dia com os três
turnos, o resumo, o índice em mm e o acumulado corrido, mais o quadro que conta
quantos dias foram Trabalhado, Perca de produção e Impraticavél. Os rótulos são
os da planilha, inclusive `INDICE ACUMUALDO` com o erro de digitação — é o que
está no documento que o fiscal conhece, e trocar por conta própria criaria uma
diferença onde não havia nenhuma.

Duas decisões que a planilha não conseguia responder, porque os 31 dias dela
estão todos com índice zero:

- **dia sem lançamento sai com o índice VAZIO, e não com zero.** Ninguém mediu é
  diferente de não choveu. Os dois casos existem, e no papel eles precisam ser
  distinguíveis a olho — foi assim que descobrimos o defeito da planilha em que
  os quatro campos de pluviometria saíam vazios nos 31 dias e ninguém via;
- **o acumulado continua somando nesse mesmo dia**, carregando o valor anterior.
  Ele é um total corrido: se zerasse no dia sem medição, a última linha deixaria
  de ser o total do mês, que é exatamente para o que ela serve.

A tela é sua, engenheiro. O encarregado registra os milímetros na tela do dia
dele — é ele quem lê o pluviômetro —, mas o quadro do mês inteiro fica do seu
lado, junto com o RDO.

### A logo da contratada

Você pode subir a logo na tela da obra, e ela passa a sair no cabeçalho do RDO,
à esquerda do título. O título continua centralizado na folha: a logo entra ao
lado dele, não no lugar dele.

O que vale saber antes de trocar:

- **a logo nova vale para todos os RDOs, inclusive os já emitidos.** Reimprimir
  um relatório de março depois de trocar a marca dá o relatório com a marca
  nova. É o mesmo comportamento das informações gerais, e a tela avisa quantos
  dias lançados estão em jogo antes de você confirmar;
- **trocar ou tirar a logo não mexe em nenhum lançamento.** Nenhum número, nenhum
  efetivo, nenhuma atividade;
- **aceitamos PNG e JPEG, até 512 KB.** Dois formatos ficaram de fora, cada um
  por um motivo: **SVG** é um arquivo de texto que pode carregar programa
  dentro, e um sistema que aceita isso de fora abre uma porta que não sabemos
  fechar; **WebP** o gerador de PDF não sabe desenhar, e descobrimos que ele
  falha em silêncio — a logo apareceria na tela e sumiria do relatório entregue
  ao fiscal, sem aviso nenhum. Preferimos recusar o arquivo a entregar um RDO
  sem a marca. Se a sua logo só existe em SVG ou WebP, exporte em PNG;
- **tiramos o metadado da imagem antes de guardar.** Foto e imagem carregam
  campos escondidos — autor, programa que gerou e, em foto de celular, a
  coordenada de GPS —, e o PDF embutiria tudo isso junto. O que fica gravado é
  só o que desenha.

O encarregado **vê** a logo e não pode trocá-la: é a marca da empresa dele, mas
quem responde pelo documento entregue é você.

---

## 5. O que ainda depende de você

São perguntas de verdade. Nada foi preenchido por suposição.

1. **Mapa linear (a aba de estacas).** Ninguém aqui entendeu esse quadro, e por
   isso ele ficou de fora desta primeira versão. Precisamos saber: o que são `PE`,
   `CV` e `PD`? Por que `PE` e `PD` têm 4 linhas iguais cada um e `CV` tem 1 — são
   faixas, bordos, camadas? O que é `APP` no rótulo de trecho, ao lado de
   `ENTRADA` e `ROTATÓRIA`? A legenda tem os códigos 1 a 4 mais `Pendências` sem
   código, mas a planilha pinta um **código 5**: o que é o 5? E o mapa é uma foto
   do estado de hoje, ou você precisa ver como ele estava numa data passada?

2. **RDO semanal e mensal.** Hoje você monta os dois à mão e não existe modelo
   deles em lugar nenhum — só o diário tem layout. O que precisa aparecer no
   semanal e no mensal: soma da produção, efetivo médio, contagem de dias
   trabalhados e parados, as atividades todas? Que período fecha o semanal, e o
   mensal é mês fechado ou o período do BM'S? Se você tiver um exemplo já
   entregue ao fiscal, ele resolve a pergunta inteira.

3. **Quais são os períodos de BM'S desta obra?** Precisamos de número, data
   inicial e data final de cada um, desde 05/02/2026. Em particular: o BM'S 7, que
   está impresso nos RDOs de setembro, corresponde a qual intervalo? A tabela da
   planilha segue um ciclo de 16 de um mês a 15 do seguinte, mas para 2022 a 2025,
   e os títulos de seção falam em `05/02/2026 a 28/02/2026`, que é outro ciclo.

4. **Dois períodos de BM'S podem se sobrepor?** Nós assumimos que **não**, para um
   dia não ser faturado em duas medições. Precisa da sua confirmação.

5. **A segunda página de continuação.** Quando o dia passar de 15 atividades ou de
   4 linhas de comentário, o sistema vai gerar uma segunda folha. Ela não existe
   na planilha, então precisa ser desenhada e aprovada por você antes da primeira
   entrega ao fiscal: repete o cabeçalho? Numera "folha 2 de 2"?

6. **Atividade sem descrição ou sem status: recusar ou aceitar?** A planilha tem
   três atividades sem status, todas em dias sem trabalho. E os campos do
   cabeçalho — contrato, datas, contratante, contratada, escopo, nome, área,
   local — devem ser todos obrigatórios para criar a obra, ou algum pode ficar em
   branco?

7. **O histórico de fevereiro a setembro de 2026 não entra no sistema.** Isso quer
   dizer que a coluna `ACUM.` começa do zero no primeiro dia lançado, e os dois
   serviços que já têm produção na planilha perdem o que foi acumulado. Você
   aceita começar do zero numa data combinada, prefere lançar o acumulado
   inicial como um saldo de abertura, ou precisa do histórico dia a dia?

---

## 6. Se você discordar

Discordar é o esperado — este documento existe para isso. Diga o item e o que
deveria ser, e a decisão é refeita. Mudança no layout do documento, em
particular, só entra com a sua aprovação explícita, porque é você quem responde
pelo que o fiscal recebe.
