# Conferência de fidelidade — RDO diário (commit `d5dce94`)

Data da conferência: 16/09/2026
Gerado: PDF real renderizado a partir de `src/modules/export/documento/documento-rdo.tsx`
(quatro cenários: normal, dia parado, transbordo, denso). Texto extraído dos fluxos
`FlateDecode` do PDF, operador `TJ`, decodificado em `WinAnsiEncoding`.
Gabarito: **`.claude/skills/fidelidade-documento/SKILL.md`** (gabarito escrito).

> **A planilha de referência não estava disponível.** `referencia/` contém só o
> `README.md`. Tudo que depende do gabarito **visual** — fonte, corpo, espessura de
> borda, largura de coluna, alinhamento fino, posição exata do quadro — está em
> **não conferido**, e não em "conforme".

---

## Como o PDF foi gerado

Não existe rota que exporte o PDF (ver CRÍTICO 3), então os documentos foram
renderizados chamando `montaDocumentoDoRdo` com `renderToBuffer`, a partir da
dupla sintética `src/modules/export/teste/duplas.ts` (`RDO_DE_EXEMPLO`) e de três
variantes derivadas dela. Nenhum arquivo do gerador foi alterado; os dois arquivos
de teste temporários usados para renderizar foram removidos ao fim.

Os quatro cenários:

| Cenário      | O que testa                                                        |
| ------------ | ------------------------------------------------------------------ |
| `normal`     | dia trabalhado, 2 funções, 1 equipamento, 2 serviços, 1 atividade  |
| `parado`     | efetivo em branco, motivo na primeira linha, pluviometria vazia    |
| `transbordo` | 17 atividades e 6 linhas de comentário, com página de continuação  |
| `denso`      | 41 funções, 41 equipamentos, 15 atividades longas, 4 linhas cheias |

---

## Conferido, bloco a bloco

| #   | Bloco                      | Veredito                                                                                         |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Título                     | OK — `RELATÓRIO DIÁRIO DE OBRAS`, caixa alta, centralizado, topo                                 |
| 2   | Identificação              | OK — `03/09/2026` · `Quinta-Feira` · `BM'S` `7` · `RDO Nº` `210`, à direita                      |
| 3   | Informações gerais         | OK — seis campos, na ordem, com `DATA INICIO:` sem acento                                        |
| 4   | Características do projeto | OK — `CARACTERISTICAS DO PROJETO` sem acento; espaços duplos do meio preservados                 |
| 5   | Efetivo pessoal            | OK no conteúdo — por função, zero em branco, `TOTAL` somando tudo; ver ATENÇÃO 5 (hifenização)   |
| 6   | Efetivo equipamentos       | OK — `EFETIVO EQUIPAMENTOS` no plural, rótulo por identificador (`MT-26`)                        |
| 7   | Produção controlada        | OK — `SERVIÇO` / `EXEC.` / `ACUM.` / `PROJETO` + barra **e** número                              |
| 8   | Atividades                 | OK — `ATIVIDADES` à esquerda, `STATUS` à direita; motivo de parada na primeira linha, sem status |
| 9   | Pluviometria               | OK — `NOITE ANTER` / `MANHÃ` / `TARDE` / `INDICE`, letra do turno, `12 mm` com unidade           |
| 10  | Comentários                | Fonte certa; **rótulo do contratante sai partido**, ver ATENÇÃO 4                                |
| 11  | Assinaturas                | Rótulos exatos; **as duas linhas não se alinham**, ver OBSERVAÇÃO 7                              |

**Ordem:** os 11 blocos saem na sequência do gabarito, conferida na ordem dos
operadores de texto do PDF, não só na leitura do código.

### Itens de critério, um a um

- **Turno como letra** (2.3): sai `C`, `B`, `B`. Nada por extenso. Conforme.
- **Produção zero como `-`** (17.2): `RECICLAGEM(BASE+CAPA)` sai `-` em `EXEC.` e
  `ACUM.`, e `0,00%` no percentual. Conforme.
- **Percentual: barra e número juntos**: os dois saem. O número `55,85%` é texto e
  a barra é um retângulo desenhado logo abaixo, dentro da mesma célula. Conforme
  quanto à presença; a **posição relativa** (Excel desenha a barra atrás do número,
  aqui ela fica sob ele) é OBSERVAÇÃO 8 e depende do gabarito visual.
- **Espaço no fim normalizado, no meio preservado** (17.1): `SERVIÇOS DE
PAVIMENTAÇÃO␣␣- BLOCO 02` e `VIAS URBANAS␣␣DA CIDADE …` saem com o duplo do
  meio; `MONTES CLAROS - MG` sai sem espaço final. Conforme (`monta-rdo-diario.ts:153-165`,
  `efetivo.ts:135`, `producao.ts:112`).
- **Dia parado** (4.1, 5.1): o cenário `parado` imprime `Domingo` como primeira
  linha do bloco ATIVIDADES, sem status; as colunas de efetivo saem vazias e o
  `TOTAL` sai `0`; os quatro campos de pluviometria saem vazios. Conforme.
- **`COMENTÁRIO CONTRATANTE` presente e vazio** (10.1): o bloco aparece em todos os
  cenários, sempre sem conteúdo. Conforme.
- **Resumo do dia fora do PDF** (3.3): `Trabalhado` / `Perca de produção` /
  `Impraticavél` não aparecem em nenhum dos quatro PDFs. A poda é estrutural — o
  tipo `RdoParaDocumento` não tem o campo (`portas.ts:97-116`). Conforme, e da
  forma certa: não dá para regredir por descuido.
- **Segunda página de continuação** (11.1): no cenário `transbordo` a página 2 traz
  título, identificação, `CONTINUAÇÃO`, as atividades 16 e 17 e as linhas de
  comentário 5 e 6. Nada foi cortado. Conforme — mas ver CRÍTICO 1.
- **Grafias herdadas**: `BM'S`, `EXEC.`, `ACUM.`, `NOITE ANTER`, `INDICE`,
  `CARACTERISTICAS DO PROJETO`, `DATA INICIO`, `EFETIVO EQUIPAMENTOS`. Nenhuma foi
  "corrigida". Conforme (`rotulos.ts:21-67`).
- **Separador brasileiro**: `15.027,03`, `2.210,39`, `234,50`, `1.000,00`. Nunca
  `15,027.03`. Conforme (`shared/decimal/index.ts:148-156`, `Intl` com `pt-BR`).
- **Data `dd/mm/aaaa`**: `03/09/2026`, `05/02/2026`, `05/02/2027`. A formatação é
  fatia de string sobre `AAAA-MM-DD`, não `Date` (`shared/date/dia.ts:103-105`), então
  não há caminho por onde `mm/dd` entre. Conforme.
- **Nome de trabalhador**: não aparece. O bloco 5 agrega por função e a chave de
  renderização é o id do cadastro, nunca o nome (`efetivo.ts:116-123`). Nos
  metadados do PDF gerado: `Title` = `RDO 210 — 03/09/2026`, `Author` = `Creator` =
  `Producer` = `RDO digital`, `Subject` = o contrato, `Keywords` vazio. Nenhum nome
  de pessoa. Conforme. O nome do engenheiro responsável, acima da linha de
  assinatura, é exigido pelo próprio gabarito (bloco 11) e não é achado.

---

## Divergências

### CRÍTICO 1 — Quebra de página automática, sem cabeçalho de identificação e sem `CONTINUAÇÃO`

- **Onde:** `src/modules/rdo/limites.ts:12-14` (os limites declarados) contra
  `src/modules/export/documento/estilos.ts:16-22,46-51` (o que cabe em A4) e
  `src/modules/export/documento/documento-rdo.tsx:279-300` (a `Page` única).
- **Gabarito:** decisão 11.1 — "o dia que transborda o layout ganha uma **segunda
  página de continuação**, com o mesmo cabeçalho de identificação"; os limites que
  disparam a continuação são mais de 15 atividades, mais de 4 linhas de comentário,
  mais de 41 funções ou mais de 41 equipamentos.
- **Gerado:** o código declara caber 41 colunas de pessoal e 41 de equipamento na
  página 1, mas a página A4 desenhada não segura isso. Medido, renderizando de
  verdade:

  | Atividades | Colunas de pessoal e de equipamento | Páginas |
  | ---------- | ----------------------------------- | ------- |
  | 15         | 38 + 38                             | 1       |
  | 15         | 41 + 41                             | **2**   |
  | 15 longas  | 41 + 41 (nomes de função reais)     | **2**   |

  Nessa segunda página o `@react-pdf` quebrou sozinho, e ela sai com **cinco
  textos só**: o nome, a titulação e o registro do responsável, mais
  `REPRESENTANTE CROS CONSTRUÇÕES S/A` e `REPRESENTANTE CONTRATANTE`. Sem título,
  sem data, sem `RDO Nº`, sem a marca `CONTINUAÇÃO`. E `temContinuacao` continua
  `false` (`para-documento.ts:181-185`), porque nenhum dos quatro limites lógicos
  estourou: quem transbordou foi o papel, não a contagem.

- **Efeito:** o fiscal recebe uma folha solta com duas assinaturas e nada que diga
  de que dia ela é. É exatamente o que a decisão 11.1 quis evitar. Pior: num dia
  que **também** estoure o limite lógico, a página de continuação de verdade vira a
  terceira folha, depois dessa órfã.
- **Ressalva honesta:** não acontece nos volumes de hoje (12 funções, 14
  equipamentos, 11 atividades no máximo observado). Acontece dentro do limite que o
  próprio código declara suportar. É defeito latente, não incêndio.
- **Para decidir:** ou o limite de colunas por página passa a ser o que cabe de
  verdade, ou a `Page` ganha `wrap={false}` com quebra controlada. A segunda opção
  precisa da planilha de referência para saber qual a altura real do quadro.

### CRÍTICO 2 — Exportação recusa sempre: a trilha de `registro_exportacao` não está ligada

- **Onde:** `src/app/_composicao/exportacao-rdo.ts:47-55`.
- **Requisito:** R20 — exportação é ato registrado: quem, quando, qual obra, qual
  período. `exporta-rdo-diario-em-pdf.ts:97-111` registra **antes** de devolver o
  arquivo, e se o registro falha o arquivo não sai. A ordem está certa.
- **Gerado:** a porta `registraExportacao` da raiz de composição é um coto que
  devolve `erro(NAO_ENCONTRADO, 'A trilha de exportação ainda não está disponível
nesta instalação.')`. Consequência: **em produção nenhum PDF é entregue**, nunca.
- **Avaliação do impacto na trilha:** a trilha em si não está furada — não existe
  caminho que exporte sem registrar, e é isso que R20 protege. O que está quebrado
  é a funcionalidade: o módulo `export` está pronto e testado, e a instalação não
  exporta. Do ponto de vista de fidelidade, o efeito é o pior possível: o documento
  conferido neste laudo **não chega ao fiscal**. A tabela `registro_exportacao` já
  existe na migration 0000 (linhas 336-350) com as colunas certas; falta só o
  repositório.
- **Detalhe menor, mas que confunde:** o coto usa `CODIGO_ERRO.NAO_ENCONTRADO`. Se
  uma rota mapear esse código para 404, a falha vai parecer "RDO não encontrado" em
  vez de "trilha indisponível", e quem estiver de plantão vai caçar o bug no lugar
  errado.

### CRÍTICO 3 — Nenhuma rota expõe o PDF

- **Onde:** `src/app/_composicao/exportacao-rdo.ts:59-61` exporta `exportaRdo`, e
  nada em `src/app/**` chama. `src/app/(rdo)/rdo/[obraId]/[dia]/page.tsx` renderiza
  só a tela.
- **Efeito:** somado ao CRÍTICO 2, o RDO em PDF hoje só existe dentro do teste. Não
  é achado de layout, e por isso não muda o veredito dos 11 blocos — mas é o que
  separa "o documento está fiel" de "o cliente recebe o documento".

### ATENÇÃO 4 — `COMENTÁRIO CONTRATANTE` sai partido com hífen

- **Onde:** `src/modules/export/documento/estilos.ts:41` — `metadeDireita: { width: 110 }`
  — contra `documento-rdo.tsx:210`.
- **Gabarito:** bloco 10, rótulo `COMENTÁRIO CONTRATANTE`, singular, numa linha.
- **Gerado:** em **todos** os quatro cenários, e também na página de continuação,
  o rótulo sai em duas linhas: `COMENTÁRIO CON-` / `TRATANTE`. Confirmado nas
  coordenadas do PDF: `y=420,9` e `y=429,7`, linhas diferentes. A coluna de 110pt
  não segura o rótulo em `Helvetica-Bold` 8pt, e o `@react-pdf` hifeniza por padrão.
- **Efeito:** o fiscal lê um hífen que não existe no documento que ele conhece. É a
  divergência mais visível deste laudo, porque aparece em 100% dos RDOs, sem
  depender de volume de dado.
- **Como corrigir sem adivinhar:** duas frentes independentes, e as duas valem —
  alargar `metadeDireita` (ou reduzir o corpo do cabeçalho deste bloco), **e**
  desligar a hifenização com `Font.registerHyphenationCallback((palavra) => [palavra])`,
  que resolve a classe inteira do problema.

### ATENÇÃO 5 — Hifenização automática também quebra nome de função e texto de comentário

- **Onde:** mesma causa da ATENÇÃO 4 — hifenização padrão do `@react-pdf`, sem
  `registerHyphenationCallback` em lugar nenhum do módulo.
- **Gabarito:** bloco 5 imprime o nome da função; bloco 10 imprime o comentário da
  contratada. Nenhum dos dois prevê hífen inserido.
- **Gerado**, no cenário `denso`, com nomes de função realistas:
  `Tecnico de Se-` / `guranca do Tra-` / `balho`, e `Motorista de` / `Caminhao Bas-` /
  `culante`. Uma linha de comentário de 88 caracteres saiu como `…CCC-` / `CC`.
- **Efeito:** no efetivo, a coluna tem 40pt e o corpo 5pt (`estilos.ts:46-52`), então
  função de nome longo sempre vai quebrar — a questão é quebrar **por palavra**, o
  que o fiscal aceita, ou **no meio da palavra com hífen**, que é texto que ele nunca
  viu. No comentário é pior: é texto livre do encarregado, e o hífen inventado pode
  mudar a leitura de um número de rua ou de um trecho.

### OBSERVAÇÃO 6 — A página de continuação repete o bloco vazio do contratante

- **Onde:** `documento-rdo.tsx:263` chama `blocoDeComentarios`, que sempre emite as
  duas colunas (`documento-rdo.tsx:198-215`).
- **Gerado:** a página 2 do cenário `transbordo` traz `COMENTÁRIOS CROS` com as
  linhas 5 e 6 — correto — e, ao lado, mais um `COMENTÁRIO CONTRATANTE` vazio.
- **Efeito:** um quadro vazio a mais numa página que deveria ser enxuta. Não engana
  ninguém, mas o gabarito não tem duas ocorrências do bloco 10 no mesmo RDO.

### OBSERVAÇÃO 7 — As duas linhas de assinatura ficam em alturas diferentes

- **Onde:** `estilos.ts:71-75` e `documento-rdo.tsx:218-243`.
- **Gabarito:** bloco 11, "dois campos lado a lado".
- **Gerado:** medido no PDF normal, `REPRESENTANTE CONTRATANTE` está em `y=463,6` e
  `REPRESENTANTE CROS CONSTRUÇÕES S/A` em `y=488,7` — 25pt de diferença. A coluna da
  esquerda carrega nome, titulação e registro acima da linha; a da direita não
  carrega nada, e a linha dela sobe para o topo da caixa.
- **Efeito:** as duas réguas de assinatura não formam uma linha só no rodapé. É
  alinhamento fino e depende do gabarito visual para saber se importa — por isso
  OBSERVAÇÃO e não ATENÇÃO.

### OBSERVAÇÃO 8 — Barra de percentual abaixo do número, e não atrás

- **Onde:** `documento-rdo.tsx:139-149`.
- **Gabarito:** no Excel a regra de barra de dados não traz `showValue="0"`, então a
  barra é desenhada **atrás** do número, na mesma célula.
- **Gerado:** número em cima, trilho e barra logo abaixo, empilhados.
- **Efeito:** a informação está toda lá — os dois elementos existem, que é o critério
  duro. A diferença é de disposição dentro da célula, e só a planilha ao lado decide
  se o fiscal estranha.

---

## As duas dúvidas da frente C

### 1. Nome do arquivo sem zero à esquerda — **não é divergência**

`src/modules/export/nome-do-arquivo.ts:18-20` produz `rdo-2026-09-03-n210.pdf` e
`rdo-2026-02-05-n0.pdf` no primeiro dia.

O gabarito escreve a forma como `rdo-AAAA-MM-DD-nNNN.pdf` e dá o exemplo
`rdo-2026-09-01-n208.pdf`. O `NNN` do enunciado é a largura do **exemplo**, não uma
largura fixa declarada: a decisão 17.3 nunca disse "três dígitos".

E há uma razão de fidelidade para não completar com zero. O número do RDO que sai
impresso no bloco 2 é `0` no primeiro dia e `8` no oitavo — é o número que a fórmula
`dia − data de início` produz, e é o que o fiscal lê no papel. Um arquivo chamado
`n000` ou `n008` carregaria um identificador que não existe em lugar nenhum do
documento. O argumento de ordenação também não se sustenta: quem ordena a pasta é a
data em `AAAA-MM-DD`, que vem antes do número, exatamente como o comentário do
arquivo já explica.

**Veredito: está bem, pode ficar.** Fica registrado como ponto de ambiguidade do
gabarito — se quem responde pelo produto quiser `n000`, é decisão dele, não defeito
do código, e aí vira mudança de layout com aprovação.

### 2. `registro_exportacao` não ligado — ver CRÍTICO 2

Resumo do impacto na trilha: a **trilha não está furada**, está **ausente junto com
a exportação**. O desenho está correto — registrar antes de entregar, e recusar a
entrega se o registro falhar — e o coto respeita esse desenho ao recusar. O custo é
que a v1 não exporta nada. Enquanto isso durar, este laudo vale para o documento que
o teste renderiza, não para um documento que alguém tenha recebido.

---

## Não conferido, e por quê

1. **Tudo que é visual.** Fonte, corpo, espessura de borda, largura de coluna,
   altura de linha, margens, posição do quadro na folha. A planilha não está em
   `referencia/`. Isso inclui saber se `Helvetica` 7pt com borda de `0.5pt`
   (`estilos.ts:13,20`) se parece com o original, e se a identificação no canto
   superior direito está onde o fiscal procura.
2. **"Sempre as quatro linhas" do bloco 7.** O gerador imprime uma linha por serviço
   que vier da porta, e `calculaProducaoControlada` (`producao.ts:89-91`) mapeia
   todos os serviços cadastrados, sem filtrar. Se as quatro aparecem depende do
   cadastro da obra, não do documento. `src/db/seed.ts:16` diz explicitamente que
   `servico_controlado` não é semeado, porque pertence à obra. Não dá para conferir
   sem uma obra cadastrada.
3. **Comportamento com `BM'S` vazio no papel.** O caminho existe
   (`para-documento.ts:152`), mas não foi renderizado: exigiria um cenário com data
   fora de todo período de BMS.
4. **O PDF como o cliente o receberia.** Não existe rota (CRÍTICO 3), então nenhum
   arquivo saiu pelo caminho real, com o ator, a obra e a trilha de verdade.
5. **Impressão.** Nenhum dos PDFs foi impresso nem aberto num leitor; a conferência
   foi sobre o conteúdo e as coordenadas dos fluxos de texto.

---

## Pontos onde o gabarito é ambíguo

Registrados para não serem decididos por conta própria:

- **Largura do número no nome do arquivo** (17.3): `NNN` é forma ou exemplo? Ver
  dúvida 1 acima. Leitura adotada: exemplo.
- **Percentual acima de 100%**: o número sai `679,84%` e a barra fica presa em 100%
  (`documento-rdo.tsx:145`). O gabarito não diz o que a planilha desenha nesse caso.
  A leitura adotada é a única que não mente sobre o acumulado, mas não foi conferida
  contra o original.
- **Posição da barra de dados dentro da célula**: ver OBSERVAÇÃO 8.
- **Assinaturas na página de continuação**: a página 2 não as repete. O gabarito não
  diz se deveria. A leitura adotada — assinar uma vez só, na página 1 — parece a
  certa, mas é leitura.

---

## Nada para corrigir aqui

Este agente reporta. Nenhum arquivo do gerador, do módulo `rdo` ou de configuração
foi tocado. Os dois arquivos de teste temporários criados para renderizar os PDFs
foram removidos; `git status` na área do `export` está limpo.
