# Spec do produto — RDO digital

Status: rascunho para aprovação. As marcas **[A APROVAR]** apontam decisões que
dependem de você. Nada marcado assim foi implementado.

Base de domínio: `docs/dominio/mapa-planilha.md`, `regras-extraidas.md`,
`inconsistencias.md`, `duvidas.md`.

---

## 1. Inversão central

**A planilha não é entrada do sistema. Ela é a especificação da saída.**

A entrada é o lançamento feito por pessoas. O lançamento é o registro atômico:
uma atividade, uma medição de produção, uma leitura de pluviômetro, uma
observação, todos com data, autor e hora de registro.

O RDO diário, o semanal e o mensal são **visões calculadas** sobre lançamentos.
Nenhum deles é armazenado pronto. Pedir o RDO de 3 de setembro é executar uma
consulta, não abrir um registro.

O que isso muda, na prática:

| Na planilha                                 | No sistema                                   |
| ------------------------------------------- | -------------------------------------------- |
| 31 abas de dia, copiadas uma da outra       | nenhuma aba de dia; o dia é uma consulta     |
| o dado existe em várias abas ao mesmo tempo | o dado existe uma vez, no lançamento         |
| corrigir um dia exige repetir a correção    | corrigir o lançamento corrige tudo que o usa |
| conferir se a réplica saiu certa é trabalho | não há réplica, então não há o que conferir  |
| quem alterou o quê é desconhecido           | todo lançamento tem autor e data de registro |
| um arquivo por mês, por obra                | um histórico contínuo                        |

A conferência some **por construção, não por funcionalidade**. Não existe uma tela
de "conferir replicação" porque não existe replicação.

A planilha de referência continua sendo consultada, para uma coisa só: garantir
que o PDF exportado se pareça com o RDO que o fiscal já conhece. Ver seção 6.

---

## 2. O problema

Hoje o fluxo é este:

1. O encarregado, em obra, manda pelo WhatsApp o que aconteceu no dia: áudio,
   foto, texto solto, às vezes só de noite, às vezes no dia seguinte.
2. O engenheiro ouve, interpreta e transcreve para a planilha, em quatro abas
   diferentes, cada uma com a sua estrutura.
3. Como o RDO diário é montado por fórmula a partir dessas abas, o engenheiro
   confere se cada dia replicou certo, abrindo aba por aba.
4. No fim da semana e do mês, monta o consolidado à mão.

Quatro custos que a planilha real comprova, e não são suposição:

- **Transcrição.** 504 linhas de atividade em sete meses, todas digitadas a partir
  de mensagem de outra pessoa. Cada passo perde informação.
- **Replicação.** 31 abas idênticas cujo único conteúdo próprio é a data. Uma
  delas, a `05`, já divergiu: tem o bloco de comentários três linhas abaixo das
  outras 30, e ninguém percebeu.
- **Conferência que não pega o erro.** O bloco rotulado "COMENTÁRIOS CROS" lê a
  aba errada e nunca mostrou nada; a pluviometria está em julho num arquivo de
  setembro, então o tempo sai vazio nos 31 dias; a aba `31` imprime um RDO datado
  de 1º de outubro. Três defeitos que sobrevivem porque conferir tudo à mão é
  inviável.
- **Consolidação manual.** Semanal e mensal montados fora do sistema, sem
  rastreabilidade de como o número foi obtido.

O produto ataca a causa, não o sintoma: se o encarregado lança direto, o passo 2
deixa de existir, e com ele o 3.

---

## 3. Quem usa

### Engenheiro responsável

Quem responde pela obra perante o contratante. Assina o RDO, tem CREA, é quem o
fiscal procura.

O que faz no sistema:

- cria a obra e todo o cadastro: contrato, contratante, contratada, data de
  início, data de término, escopo, nome, área e local do projeto;
- cadastra o pessoal com função e período (entrada e saída);
- cadastra os equipamentos com identificador, tipo e período;
- cadastra os serviços controlados com a quantidade de projeto;
- libera o acesso do encarregado àquela obra;
- também lança, quando está em campo;
- consulta o RDO de qualquer dia, exporta em PDF, confere e entrega.

### Encarregado de obra

Quem está no canteiro todo dia. Hoje é quem manda o áudio.

O que faz no sistema:

- lança o dia a dia: atividades com status, condição de tempo, produção do dia,
  pluviometria, observações;
- vê o que já lançou e corrige enquanto o dia está aberto;
- **não** cadastra obra, não cadastra pessoal, não cadastra equipamento, não
  define quantidade de projeto, não vê outra obra.

O contorno de acesso entre os dois perfis é requisito de segurança, verificado
pelo agente `seguranca`, e não uma questão de interface.

---

## 4. Restrições que são requisito, não enfeite

### 4.1. Lançamento de celular, em obra, com sinal ruim

O encarregado lança em pé, no canteiro, com uma mão, possivelmente com luva, sol
na tela e sinal de dados instável.

A comparação não é com outro software: é com **mandar um áudio no WhatsApp**, que
custa três segundos. Se lançar for mais trabalhoso que isso, ele não usa e o
produto falha, por melhor que seja o resto.

O que isso impõe:

- toda tela de lançamento é desenhada primeiro para celular, em pé;
- alvo de toque grande, nada de tabela com rolagem horizontal;
- o que se repete todo dia vem preenchido do dia anterior, para confirmar em vez
  de digitar;
- escolher de lista sempre que houver taxonomia, digitar só o que é livre;
- o lançamento sobrevive a conexão instável: o que foi digitado não se perde
  quando a rede cai, e sincroniza depois;
- nada de exigir o preenchimento do dia inteiro numa tela só.

### 4.2. Fidelidade do documento

A saída em PDF precisa reproduzir o layout do RDO da planilha de referência:
os mesmos blocos, na mesma ordem, com os mesmos rótulos e os mesmos totais.

O RDO é um documento contratual lido por um fiscal de prefeitura que já conhece o
formato. Um documento que não parece um RDO gera pedido de correção, atrasa
medição e queima a confiança no sistema novo.

**Divergência de layout é defeito, não preferência.** Existe um agente dedicado a
verificar isso, `fidelidade-documento`, e uma skill com o gabarito,
`.claude/skills/fidelidade-documento/SKILL.md`.

### 4.3. Dado pessoal, LGPD desde o desenho

O que é dado pessoal aqui, verificado no arquivo real:

- 19 nomes completos de trabalhadores, com função e data de admissão na obra;
- nome, titulação e número de CREA do engenheiro responsável;
- nomes de fiscais da Prefeitura no texto das observações;
- metadados de autoria da planilha, com dois nomes a mais.

Regras que saem daí:

- o RDO agrega pessoal **por função**, nunca por nome. O documento que circula não
  precisa expor quem trabalhou, e não vai expor.
- nome de pessoa não entra em log, em mensagem de erro, em URL nem em metadado de
  PDF;
- o cadastro de pessoal é visível só a quem tem perfil de engenheiro naquela obra;
- nenhum arquivo de obra real é versionado — ver `referencia/README.md` e o
  `.gitignore`;
- exportação é ato registrado: quem exportou, quando, de qual obra e período.

Isso está escrito também no `CLAUDE.md`, seção Segurança, e é verificado pelo
agente `seguranca` a cada frente de trabalho.

---

## 5. Saídas

RDO **diário**, **semanal** e **mensal**, em **PDF** e **Excel**.

- **Diário**: reproduz o layout da planilha de referência, bloco a bloco.
- **Semanal** e **mensal**: consolidam o período. O formato ainda não existe na
  planilha — hoje é montado à mão. **[A APROVAR]** o layout do semanal e do mensal
  precisa ser definido com você; não inventei um.
- **Excel**: mesma informação, em formato manipulável, para quem quiser somar por
  conta própria.

Todas as saídas são geradas na hora, a partir dos lançamentos. Nenhuma é guardada
pronta. Duas exportações do mesmo período com os mesmos lançamentos produzem o
mesmo documento.

---

## 6. Fluxo da v1, em passos

**[A APROVAR]** — este é o recorte proposto. Aprove, troque ou corte.

1. **Engenheiro cria a obra.** Preenche contrato, contratante, contratada, datas
   de início e término, escopo, nome, área e local. O sistema valida que a data
   final não é anterior à inicial.
2. **Engenheiro cadastra o básico.** Pessoal com função e período; equipamentos
   com identificador, tipo e período; serviços controlados com quantidade de
   projeto. Funções, status e condições de tempo vêm pré-carregados com as
   taxonomias da planilha, e são editáveis.
3. **Engenheiro libera o encarregado.** Convite por link ou código; o encarregado
   passa a ver aquela obra e só ela.
4. **Encarregado lança o dia**, do celular:
   - marca se o dia foi trabalhado ou parado, e o motivo se parado;
   - lança as atividades, cada uma com descrição e status;
   - marca a condição de tempo do dia;
   - registra a produção do dia por serviço controlado, quando houver.
5. **RDO diário na tela.** Qualquer um dos dois perfis abre o dia e vê o
   documento montado: cabeçalho, efetivo de pessoal por função, efetivo de
   equipamento, produção com executado, acumulado, projeto e percentual,
   atividades com status, tempo, observações.
6. **Engenheiro exporta em PDF.** O arquivo sai com o layout do RDO de referência.

Tudo que não está nesses seis passos está fora da v1.

---

## 7. Fora do escopo da v1

**[A APROVAR]** — se algum destes for essencial para o primeiro uso real, me diga
agora, porque muda o desenho.

| Item                                           | Por que fica de fora                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Mapa linear por estaca (`LINEAR`)              | domínio não compreendido; ver `duvidas.md`, dúvida 8                 |
| RDO semanal e mensal                           | dependem de layout que ainda não existe                              |
| Exportação em Excel                            | o PDF é o que o fiscal recebe; o Excel é conveniência                |
| Assinatura digital do RDO                      | exige decisão jurídica sobre validade                                |
| Fluxo de aprovação e comentário do contratante | a aba do contratante está vazia há sete meses; não há uso comprovado |
| Múltiplas obras simultâneas                    | uma obra resolve o problema do usuário hoje                          |
| Importar a planilha legada                     | ver `duvidas.md`, dúvida 9                                           |
| Foto anexada à atividade                       | desejável, pesado em obra com sinal ruim; avaliar depois             |
| Integração com o mapa de controle              | ver `duvidas.md`, dúvida 6                                           |
| Controle de presença diária                    | ver `duvidas.md`, dúvida 11                                          |

A mesma lista está no `CLAUDE.md`. A regra lá é: se um pedido cair nesta lista,
perguntar antes de fazer.

---

## 8. Como saberemos que funcionou

Critérios verificáveis, na ordem em que importam.

### Adoção

1. O encarregado lança **no mesmo dia**, não no dia seguinte. Medida: diferença
   entre a data do lançamento e a data a que ele se refere.
2. O volume de áudio de RDO no WhatsApp cai a zero em duas semanas de uso.
3. O tempo para lançar um dia comum, cronometrado em campo, fica **abaixo de dois
   minutos**. **[A APROVAR]** este número é uma proposta, não uma medição.

### Eliminação do retrabalho

4. O engenheiro **não transcreve nada**. Medida direta: ele deixa de abrir a
   planilha para lançar.
5. Não existe passo de conferência de replicação, porque não existe replicação.
6. Corrigir um lançamento antigo corrige automaticamente todos os documentos que o
   usam, sem ação adicional.

### Qualidade do documento

7. O PDF do dia é aceito pelo fiscal **sem pedido de correção de formato** na
   primeira entrega.
8. Os três defeitos conhecidos da planilha não se reproduzem: o bloco de
   comentários mostra os comentários certos; o tempo do dia aparece; não existe
   dia 31 em mês de 30.
9. Todo caso de teste obrigatório listado em `inconsistencias.md` tem teste
   automatizado passando antes do primeiro uso real.

### Confiança

10. Todo número do RDO é rastreável até o lançamento que o originou, com autor e
    data.
11. Nenhum nome de trabalhador aparece em log, erro, URL ou metadado de PDF,
    verificado pelo agente `seguranca`.

### O teste final

Fechar um mês inteiro no sistema e comparar, lado a lado, com o mesmo mês feito na
planilha. Divergência em qualquer número precisa ter explicação, e a explicação
precisa ser "o sistema está certo e a planilha estava errada" ou um defeito nosso.
