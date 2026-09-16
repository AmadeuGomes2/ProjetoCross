# Casos CT-237 a CT-265 — passo 6 do PRD v1 (exportação em PDF)

Índice, matriz, lista de não coberto e perguntas abertas: `docs/qa/v1.md`.

Contexto comum: obra "B02" com início 05/02/2026, "E1" engenheiro, "C1"
encarregado, o dia 03/09/2026 com lançamentos de atividade, produção,
pluviometria e observação. O número do RDO de 03/09/2026 é 210.

---

## F6.1 — Exportar o RDO diário (`pdf-export.test.ts`)

**CT-237 · feliz · skill `fidelidade-documento` · F6.1 c."PDF com os 11 blocos na ordem do gabarito"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** o PDF tem uma página A4 em retrato com os blocos na ordem: título, cabeçalho de identificação, INFORMAÇÕES GERAIS, CARACTERISTICAS DO PROJETO, EFETIVO PESSOAL, EFETIVO EQUIPAMENTOS, PRODUÇÃO CONTROLADA, ATIVIDADES / STATUS, PLUVIOMETRIA, COMENTÁRIOS CROS / COMENTÁRIO CONTRATANTE, assinaturas. **Por que existe:** divergência de layout é defeito, não preferência; um documento que não parece um RDO gera pedido de correção e atrasa medição.

**CT-238 · feliz · skill `fidelidade-documento` · F6.1 c."rótulos com a grafia herdada"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** o PDF contém exatamente "RELATÓRIO DIÁRIO DE OBRAS", "BM'S", "RDO Nº", "DATA INICIO", "CARACTERISTICAS DO PROJETO", "EXEC.", "ACUM.", "NOITE ANTER", "INDICE", "COMENTÁRIOS CROS", "COMENTÁRIO CONTRATANTE", "REPRESENTANTE CROS CONSTRUÇÕES S/A", "REPRESENTANTE CONTRATANTE". **Por que existe:** os rótulos são o vocabulário que o fiscal reconhece, abreviações e falta de acento inclusive; "corrigir" `DATA INICIO` ou `CARACTERISTICAS` é divergência.

**CT-239 · negativo · dec. 3.3 · F6.1 c."o resumo do dia não vai ao PDF"**
**Dado** a pluviometria de 03/09/2026 com "C","B","B" e índice 12. **Quando** "E1" exporta. **Então** o texto do PDF não contém "Perca de produção", e o bloco PLUVIOMETRIA mostra "C","B","B" e "12 mm". **Por que existe:** o gabarito impresso não tem campo de resumo do dia; acrescentá-lo é mudança de layout que ninguém aprovou.

**CT-240 · feliz · R18 · F6.1 c."mesmo conteúdo do RDO na tela"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** cada valor dos 11 blocos do PDF é igual ao valor do RDO de 03/09/2026 na tela. **Por que existe:** os dois são a mesma consulta em dois formatos; caminhos de cálculo separados divergem em semanas, e é exatamente a conferência que o produto veio eliminar.

**CT-241 · feliz · spec §5 · F6.1 c."duas exportações com os mesmos lançamentos"**
**Dado** que "E1" já exportou o RDO de 03/09/2026. **Quando** exporta de novo, sem nenhum lançamento novo. **Então** o conteúdo dos 11 blocos é idêntico ao da primeira exportação. **Por que existe:** o documento não pode depender do relógio, do fuso do servidor nem da ordem de leitura do banco; duas versões diferentes do mesmo dia nas mãos do fiscal é o pior defeito possível.

**CT-242 · feliz · R20 · F6.1 c."exportação registrada"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** existe um registro de exportação com o id de "E1", o momento, a obra "B02", a data 03/09/2026 e o formato PDF. **Por que existe:** exportação é ato registrado; o registro é gravado antes de entregar o arquivo.

**CT-243 · negativo · R19 · F6.1 c."encarregado não exporta"**
**Quando** "C1" envia ao servidor o pedido de exportar o RDO de 03/09/2026. **Então** o pedido é recusado no servidor e nenhum registro de exportação é criado. **Por que existe:** quem entrega o documento ao fiscal é o engenheiro; e a recusa não pode deixar um registro de exportação fantasma na trilha.

**CT-244 · inválido · caso obrigatório 10 · F6.1 c."exportar data inexistente"**
**Quando** "E1" pede o PDF de 31/09/2026. **Então** nenhum PDF é gerado e a mensagem diz que a data não existe. **Por que existe:** é a aba `31` da planilha, que tem área de impressão definida e imprime um RDO de outro mês.

**CT-245 · negativo · CLAUDE.md Segurança · F6.1 c."falha na geração não vaza detalhe técnico"**
**Dado** uma falha interna ao gerar o PDF. **Quando** "E1" exporta. **Então** a mensagem diz o que fazer e traz um identificador de correlação, e o detalhe fica só no log do servidor, sem nome de pessoa. **Por que existe:** a geração lê pessoal, responsável técnico e observações; é o caminho com mais dado pessoal em memória do sistema inteiro.

**CT-246 · negativo · PRD, Requisitos de segurança, item 4 e tabela de dado pessoal**
**Quando** o registro de exportação é inspecionado. **Então** ele guarda o id do usuário e nunca o nome. **Por que existe:** a trilha de auditoria é permanente e nunca apagada; guardar nome nela é guardar dado pessoal para sempre sem necessidade.

---

## F6.2 — Fidelidade dos valores no PDF (`pdf-fidelidade.test.ts`)

**CT-247 · feliz · caso obrigatório 15 · F6.2 c."data em dd/mm/aaaa e dia da semana capitalizado"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** o cabeçalho mostra "03/09/2026" e "Quinta-Feira", e não aparece "09/03/2026" em lugar nenhum. **Por que existe:** três formatos de data convivem na planilha e metade das abas usa o americano; 03/09 e 09/03 trocam de significado conforme a aba.

**CT-248 · feliz · skill `fidelidade-documento` (CRÍTICO) · F6.2 c."número com separador brasileiro"**
**Dado** `ACUM.` de "REC.(FRESA+CAPA)" igual a 15027,032 em 03/09/2026. **Quando** "E1" exporta. **Então** `ACUM.` sai como "15.027,03". **Por que existe:** ponto e vírgula trocados transformam quinze mil em quinze; duas casas na exibição, valor exato no cálculo.

**CT-249 · fronteira · dec. 17.2 · F6.2 c."produção zero sai como traço"**
**Dado** que "RECICLAGEM(BASE+CAPA)" não tem nenhum lançamento até 03/09/2026. **Quando** "E1" exporta. **Então** `EXEC.` e `ACUM.` desse serviço saem como "-". **Por que existe:** é o que o gabarito mostra; "0,00" nas quatro linhas do bloco 7 é divergência visível.

**CT-250 · fronteira · gabarito bloco 5 · F6.2 c."efetivo zero em branco"**
**Dado** a função "Topografo" cadastrada e sem ninguém na obra em 03/09/2026. **Quando** "E1" exporta. **Então** a coluna "Topografo" existe e a quantidade está em branco, não "0". **Por que existe:** zero no efetivo é branco, zero na produção é traço. São duas convenções diferentes no mesmo documento e é fácil uniformizar por engano.

**CT-251 · negativo · LGPD (CRÍTICO) · F6.2 c."nome de trabalhador não aparece no PDF"**
**Dado** a pessoa "P1" com função "Motorista" na obra em 03/09/2026. **Quando** "E1" exporta. **Então** o texto do PDF não contém "P1" e contém "Motorista" com a quantidade. **Por que existe:** o RDO agrega por função, nunca por nome; o contrato ser público não torna a lista nominal publicável.

**CT-252 · negativo · PRD, Requisitos de segurança, item 5 · F6.2 c."metadados do PDF sem nome de pessoa"**
**Quando** "E1" exporta. **Então** os campos Autor, Título, Assunto e Palavras-chave do PDF não contêm nome de pessoa. **Por que existe:** metadado é o vazamento que ninguém vê ao abrir o arquivo; a planilha real já exporta metadados de autoria sem que ninguém perceba.

**CT-253 · feliz · dec. 17.3 · F6.2 c."nome do arquivo com data e número do RDO"**
**Quando** "E1" exporta o RDO de 03/09/2026. **Então** o nome do arquivo é "rdo-2026-09-03-n210.pdf" e não contém nome de pessoa. **Por que existe:** o nome do arquivo circula em e-mail e WhatsApp; a data em `AAAA-MM-DD` ordena sozinha e o número é o que o fiscal procura.

**CT-254 · feliz · dec. 18.1 · F6.2 c."assinatura com o responsável técnico da obra"**
**Dado** o responsável técnico "R1", "Engenheiro Civil", "CREA - MG 000000/D" cadastrado em "B02". **Quando** "E1" exporta. **Então** o bloco de assinaturas mostra os três valores à esquerda, acima da linha. **Por que existe:** é o bloco 11 do gabarito; o CREA sem titulação, ou a titulação sem nome, é documento recusado.

**CT-255 · fronteira · dec. 17.1 · F6.2 c."espaços no fim dos textos fixos são normalizados"**
**Dado** a área digitada como `"MONTES CLAROS - MG "`. **Quando** "E1" exporta. **Então** `ÁREA` sai como "MONTES CLAROS - MG", sem espaço no fim. **Por que existe:** o arquivo real tem espaço final em funções, nomes e tipos de equipamento, e a lista gerada por fórmula preserva o espaço; o rótulo impresso sai desalinhado.

**CT-256 · negativo · R12 · F6.2 c."bloco de comentários lê a fonte certa"**
**Dado** uma observação de lado CROS em 03/09/2026 com texto "Frente liberada". **Quando** "E1" exporta. **Então** "Frente liberada" está sob `COMENTÁRIOS CROS` e não sob `COMENTÁRIO CONTRATANTE`. **Por que existe:** é o defeito C10 da planilha, em que o rótulo diz CROS e a fórmula lê a aba do contratante; reproduzi-lo é defeito de fidelidade, e o bloco nunca mostrou nada em nenhum dos 31 dias.

**CT-257 · fronteira · caso obrigatório 12 · dec. 2.3 · F6.2 c."tempo do dia aparece no PDF como letra"**
**Dado** a pluviometria de 03/09/2026 lançada com "B","B","B" e índice 0. **Quando** "E1" exporta. **Então** o bloco PLUVIOMETRIA mostra "B","B","B" e "0 mm", e não vazio. **Por que existe:** na planilha a pluviometria está em julho num arquivo de setembro, a busca não encontra a data e os quatro campos saem vazios em todos os 31 dias. O bloco preenchido com zero é diferente do bloco vazio, e o teste precisa distinguir os dois.

**CT-258 · fronteira · dec. 4.1, 5.1 · F6.2 c."dia parado imprime o motivo na primeira linha"**
**Dado** 06/09/2026 parado com motivo "Domingo". **Quando** "E1" exporta. **Então** a primeira linha do bloco ATIVIDADES mostra "Domingo" e o bloco EFETIVO PESSOAL sai com as quantidades em branco e TOTAL 0. **Por que existe:** junta as duas decisões que mais mudam o que o fiscal vê num domingo: o motivo onde era a atividade falsa, e o efetivo zerado onde hoje aparecem 19 pessoas.

**CT-259 · fronteira · dec. 17.2, leitura literal registrada em `docs/prd/v1.md:77-82`**
**Dado** que "RECICLAGEM(BASE+CAPA)" não tem nenhum lançamento até 03/09/2026. **Quando** "E1" exporta. **Então** o percentual desse serviço sai como "0%" e não como "-". **Por que existe:** a 17.2 fala em produção zero e vale para `EXEC.` e `ACUM.`, não para o percentual. O PRD deixou a leitura explícita justamente porque estender o traço à quarta coluna é o deslize natural.

---

## F6.3 — Transbordo no PDF (`pdf-transbordo.test.ts`)

**CT-260 · fronteira · R10 · F6.3 c."15 atividades cabem numa página"**
**Dado** 03/09/2026 com 15 atividades. **Quando** "E1" exporta. **Então** o PDF tem uma página e as 15 aparecem, nenhuma cortada. **Por que existe:** 15 é o limite do layout herdado; gerar segunda página antes da hora é divergência tanto quanto truncar.

**CT-261 · fronteira · dec. 11.1 · F6.3 c."16 atividades saem em duas páginas"**
**Dado** 03/09/2026 com 16 atividades. **Quando** "E1" exporta. **Então** o PDF tem duas páginas, as 15 primeiras na página 1, a 16.ª na continuação da página 2, e nenhuma atividade some em silêncio. **Por que existe:** transbordo nunca é truncamento silencioso. O máximo real observado é 11, então o primeiro dia de 16 atividades vai passar despercebido se não houver teste.

**CT-262 · fronteira · dec. 11.1 · F6.3 c."comentário com mais de 4 linhas continua na segunda página"**
**Dado** uma observação de lado CROS em 05/09/2026 cujo texto ocupa 5 linhas no layout. **Quando** "E1" exporta. **Então** as 4 primeiras linhas saem no bloco `COMENTÁRIOS CROS` da página 1 e a 5.ª na continuação da página 2. **Por que existe:** o bloco 10 tem 4 linhas em 30 das 31 abas e 7 na aba `05`; texto de observação real já vem quebrado em três linhas que repetem a data (inconsist. E8).

**CT-263 · fronteira · R10**
**Dado** uma observação de lado CROS em 04/09/2026 cujo texto ocupa exatamente 4 linhas. **Quando** "E1" exporta. **Então** o PDF tem uma página e as 4 linhas saem no bloco `COMENTÁRIOS CROS`. **Por que existe:** é o último valor que cabe; sem ele, um erro de um na comparação criaria segunda página em todo comentário de tamanho normal.

**CT-264 · fronteira · R10 · F6.3 c."41 funções cabem na página 1"**
**Dado** 03/09/2026 com efetivo em 41 funções distintas. **Quando** "E1" exporta. **Então** o PDF tem uma página, com as 41 colunas. **Por que existe:** o bloco 5 tem 41 colunas de reserva e 12 em uso; 41 é o limite exato do gabarito.

**CT-265 · fronteira · dec. 11.1 · F6.3 c."42 funções distintas com efetivo"**
**Dado** 03/09/2026 com efetivo em 42 funções distintas. **Quando** "E1" exporta. **Então** as 41 primeiras colunas saem na página 1, a 42.ª na continuação da página 2, e o TOTAL do efetivo pessoal soma as 42. **Por que existe:** o total é a soma de todas, inclusive as que transbordaram; somar só o que coube na página 1 é o defeito silencioso mais provável do transbordo.
