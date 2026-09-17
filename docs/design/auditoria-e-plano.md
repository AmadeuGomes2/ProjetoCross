# Auditoria de design e plano de melhoria

Data: 16/09/2026 · Escopo: as 18 telas da aplicação
Estado técnico no momento da auditoria: 647 testes, lint, tipos e build verdes.

---

## Aviso metodológico

Até esta auditoria **ninguém neste projeto viu as telas**. Todo o trabalho de
layout foi feito lendo HTML e CSS. Isso já custou duas rodadas de correção.

O Playwright foi instalado e está pronto para capturar as 18 telas em 390px e
1440px. A validação da Etapa 5 depende disso, e é a diferença entre desenhar e
adivinhar.

---

## O que o produto é, e para quem

Ferramenta de campo, não site institucional. Dois públicos com necessidades
opostas:

|                  | Encarregado                            | Engenheiro                    |
| ---------------- | -------------------------------------- | ----------------------------- |
| Onde usa         | canteiro, em pé, uma mão, luva, sol    | escritório, sentado, monitor  |
| Frequência       | todo dia útil, no fim do dia           | algumas vezes por semana      |
| Ação principal   | **lançar o dia em menos de 2 minutos** | conferir e **exportar o PDF** |
| Concorrente real | mandar áudio no WhatsApp               | a planilha de 42 abas         |

A conversão aqui não é cadastro: é **o encarregado abrir o app em vez do
WhatsApp**. Tudo que aumenta atrito nessa jornada é falha de produto.

---

## Diagnóstico: dez problemas, em ordem de impacto

### 1. Não existe casca de aplicação

Cada página é um `<main>` solto. Não há barra persistente, nem identidade, nem
indicação de onde se está, nem saída visível. O único elo entre telas é um link
"Voltar" por página, acrescentado ontem.

Numa ferramenta aberta todo dia, isso desorienta. É o problema mais grave, e é
de arquitetura de informação, não de estética.

### 2. O fluxo principal não tem porta de entrada

Só existe caminho **de volta**. Da obra não se chega ao lançamento de hoje nem
ao RDO de hoje: essas telas só são alcançáveis digitando a URL com a data.

O encarregado abre o app para fazer uma coisa. Hoje ele não consegue.

### 3. A obra é uma pilha de formulários, não um painel

Três blocos empilhados: informações gerais, períodos de BM'S e responsável
técnico. Nenhum diz o **estado** da obra: quantos dias lançados, qual foi o
último RDO, o que falta preencher, se há dia em aberto.

Quem chega não sabe o que fazer em seguida.

### 4. Hierarquia visual plana

Título, bloco, lista e formulário têm peso parecido. A escala tipográfica é
curta demais: 1.55rem, 1.2rem, 1.02rem. Com intervalos assim, nada se destaca, e
"o que eu vim fazer" compete com "configuração da obra".

### 5. A paleta não carrega significado

Um verde e uma escala de cinzas. O domínio tem estados que pedem cor e não a
têm: `Trabalhado`, `Perca de produção`, `Impraticavél`; dia aberto contra dia
fechado; acumulado acima do projeto.

### 6. Formulários longos, sem agrupamento nem progresso

Criar obra pede 12 campos numa coluna única, incluindo três de responsável
técnico e três de período de BM'S, num formulário só. Sem seções, sem progresso,
sem rascunho. É a primeira coisa que o engenheiro faz no sistema.

### 7. Sem retorno de ação

As ações de servidor não têm estado de carregamento. O usuário clica em
"Cadastrar período" e nada indica que algo aconteceu até a página recarregar. Em
sinal de canteiro isso vira clique duplo e lançamento duplicado.

### 8. O RDO na tela é a planilha, não uma tela

Reproduzir o documento é requisito para o **PDF**. Na tela, 41 colunas de
efetivo não cabem em 390px. A tela precisa da mesma informação, na ordem do
documento, mas em forma legível no aparelho.

### 9. Sem identidade

O sinal da marca é um quadrado verde que eu desenhei ontem. Não há tipografia de
marca, nem referência à obra ou à empresa, nem nada que distinga este produto de
um formulário genérico.

### 10. Estados de exceção existem, mas são iguais entre si

Vazio, erro e sucesso usam o mesmo bloco com cor diferente. Vazio deveria
convidar à ação; erro deveria dizer como corrigir; sucesso deveria sumir sozinho.

---

## Referências, e o que aproveitar de cada uma

Não copiar interface. Extrair padrão.

**Procore e Fieldwire**, os dois produtos que resolvem exatamente este problema.
O que a comparação entre eles ensina: o Procore é completo e por isso pesado no
celular; o Fieldwire é mais estreito e é adotado mais rápido pelo time de campo.
Para nós, que temos **um** fluxo de campo, a lição é do Fieldwire: tela de campo
focada em uma tarefa, sem navegação em árvore. Também confirmam o que já
decidimos: entrada offline e captura no local são padrão da categoria, não luxo.

**Consoles de produto com boa contenção**, como Linear e Vercel. O padrão útil:
barra superior fina com contexto à esquerda e conta à direita; hierarquia por
espaçamento e peso, não por moldura; superfície plana com fio de borda em vez de
sombra. É compatível com o que já construímos.

**shadcn/ui e Radix.** O padrão de componente — variantes explícitas, foco
visível, estado desabilitado, rótulo sempre associado — vale. **A dependência
não.** Ver a seção de decisões técnicas.

**inspora.design**, referência que você mandou: conteúdo em primeiro lugar,
cromo mínimo, respiro constante, paleta neutra. Já incorporado em parte.

---

## Plano de melhoria, em cinco frentes

Ordenadas por impacto na jornada, não por facilidade.

### Frente A — Casca e navegação (resolve 1, 2, 9)

- Barra superior persistente: marca à esquerda, nome da obra no centro quando
  houver contexto, conta e sair à direita. Some na impressão.
- Trilha de navegação em toda tela interna, substituindo o "Voltar" avulso.
- **Porta de entrada para o trabalho do dia**: da obra, dois botões grandes,
  "Lançar hoje" e "Ver RDO de hoje", com a data resolvida no fuso da obra.
- Identidade: tipografia de marca, o sinal redesenhado, e o nome da obra
  presente onde se está dentro dela.

### Frente B — Painel da obra (resolve 3, 4)

- A obra deixa de abrir em formulário e passa a abrir em **estado**: últimos
  dias lançados com o estado de cada um, o que falta no cadastro, atalho para o
  dia em aberto.
- Cadastro vira aba ou seção secundária, não a primeira coisa.
- Escala tipográfica ampliada para criar hierarquia de verdade.

### Frente C — Sistema visual maduro (resolve 4, 5, 10)

- Escala tipográfica com intervalos maiores e pesos definidos.
- Cores de estado ligadas ao domínio: dia trabalhado, parado, fechado; aviso de
  acumulado acima do projeto; resumo pluviométrico.
- Estados de vazio, erro, sucesso e carregamento com papéis distintos.
- Microinterações discretas, respeitando quem pede menos movimento.

### Frente D — Lançamento no campo (resolve 6, 7)

- Retorno de ação em toda submissão: botão que desabilita e informa envio.
- Formulário de nova obra em seções, com o essencial primeiro.
- Revisão dos alvos de toque e da zona do polegar nas cinco telas de lançamento.

### Frente E — RDO na tela (resolve 8)

- No celular, o efetivo vira lista de função e quantidade, não grade de 41
  colunas. No monitor, mantém a grade.
- A ordem dos blocos e os rótulos herdados **não mudam**: são requisito de
  fidelidade, verificado por agente próprio.

---

## Decisões técnicas, com a alternativa recusada

**Não instalar Tailwind, shadcn/ui nem Radix.**
Alternativa recusada de propósito. Já existem 724 linhas de CSS próprio,
funcionando, com tokens, tema escuro e decisões de campo documentadas. Trocar
por Tailwind é reescrever tudo que funciona para ganhar vocabulário, e traz
dependência, build e uma segunda forma de escrever estilo. O padrão de
componente do shadcn é aproveitado; o pacote, não.

**Não criar biblioteca de componentes nova.**
O vocabulário existe em `(cadastro)/componentes.tsx`: `Campo`, `Escolha`,
`Bloco`, `Erro`, `Aviso`, `Vazio`, `Voltar`. Ele será **promovido** para uso em
todas as seções, não substituído.

**Manter CSS Modules por seção mais tokens globais.**
É o que o Next favorece e o que já está em pé.

---

## Validação proposta

1. Captura das 18 telas em 390px e 1440px, antes e depois.
2. Conferência de contraste nos dois temas.
3. Agente de fidelidade sobre o PDF, para garantir que nada do documento mudou.
4. `npm run lint`, `test` e `build` verdes, com a saída colada.

---

## O que este plano não faz

- Não muda regra de negócio, rota nem consulta.
- Não mexe em rótulo, ordem de bloco ou grafia do documento.
- Não entra no que está fora do escopo da v1: mapa linear, semanal e mensal,
  Excel, assinatura, aprovação e múltiplas obras.

---

# Revisão de 16/09/2026: o que eu vi depois de olhar

A auditoria acima foi escrita **lendo HTML e CSS**. Depois dela, `npm run telas`
capturou as 17 telas em 390, 820 e 1440 px, e eu olhei. Esta seção corrige e
acrescenta. Onde as duas divergem, **vale esta**.

As imagens ficam em `tmp/telas/`, fora do versionamento: captura de obra real
mostra nome de trabalhador (CLAUDE.md, Segurança).

## Onde a auditoria às cegas errou

| Item       | O que eu tinha escrito                                    | O que a imagem mostra                                                                                                                                                          |
| ---------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Problema 6 | "criar obra pede 12 campos numa coluna única, sem seções" | **Já tem quatro seções.** O defeito é outro: campo de 5 caracteres com 930 px de largura, e nota explicativa desenhada com borda igual à do campo, que parece input preenchido |
| Problema 8 | "41 colunas não cabem em 390 px"                          | No celular o efetivo **já é grade de 3 colunas**. O defeito é que a tela inteira é um PDF encolhido, com 5.586 px de altura                                                    |

## O que só apareceu ao olhar

**1. A aplicação ignora o monitor.** Em 1440 px o conteúdo ocupa uma faixa de
~640 px no centro. A tela de obras tem **90% de área vazia** para listar uma
obra. Num sistema que o engenheiro abre no escritório, isso é desperdício de
tela, não respiro.

**2. Nenhuma tela cabe numa tela.** Alturas medidas, em página inteira:
obra 3.748 px, criar obra 4.102 px, RDO 4.584 px no monitor e 5.586 px no
celular. Sete rolagens para ler um relatório de um dia.

**3. `PRODUÇÃO CONTROLADA` está ilegível.** A linha sai como
`EXEC. - ACUM. - PROJETO 0,00 -`: monoespaçada, com traço no lugar do valor
ausente e rótulo colado no número. É a informação que sustenta a medição, e é o
pior bloco da tela. Precisa de tabela com coluna, não de linha corrida.

**4. Função sem gente pesa o mesmo que função com gente.** O efetivo desenha as
15 funções da taxonomia com a mesma célula; 6 têm número, 9 estão vazias. O
olho não acha o que importa. No papel a grade fixa é requisito; na tela, não.

**5. As abas da obra não dizem onde se está.** Pessoal, Equipamentos, Serviços
controlados, Listas e Acesso são cinco botões brancos idênticos, sem estado
ativo. São navegação desenhada como ação.

**6. Cadastro e informação estão entrelaçados.** Em "Períodos de BM'S" a lista
dos dois períodos emenda direto num formulário de cadastro, sem separação. Ler e
escrever no mesmo bloco, sem hierarquia.

**7. "Sair" tem o peso de "Criar obra".** Dois botões empilhados, mesmo
tamanho, um destrutivo da sessão e o outro a ação principal.

**8. No lançamento, "Confirmar o dia" é o botão mais forte da tela — e fica no
topo, antes de lançar qualquer coisa.** A ação de _fechar_ domina a ação de
_preencher_. Além disso "Produção 0" é cinza igual a "Atividades 1": o que falta
não se distingue do que está feito.

**9. O cabeçalho do lançamento come 45% da dobra.** Data, dia da semana e
estado repetem em cada uma das cinco subtelas, gastando ~380 px dos 844 px do
celular antes de qualquer campo. E não há noção de progresso entre as etapas.

**10. Botão desabilitado parece habilitado.** "Lançar atividade" desabilitado é
verde claro sobre branco; lê-se como botão normal esmaecido, não como bloqueado.

## O que já está bom, e não vou mexer

- O hub de lançamento no celular: coluna única, alvo grande, contagem por seção.
- O efetivo em grade de 3 colunas no celular.
- A seccionação do formulário de criar obra.
- A folha de estilo global, os tokens e o tema escuro.

## Efeito no plano

As cinco frentes continuam válidas. Mudanças de ênfase:

- **Frente A** ganha o enquadramento SaaS: barra persistente e largura útil de
  verdade no monitor, não uma coluna de 640 px centralizada.
- **Frente B** absorve os achados 5, 6 e 7: aba com estado ativo, leitura
  separada da escrita, ação secundária com peso secundário.
- **Frente C** absorve o 4 e o 10: densidade que destaca o preenchido, e estado
  desabilitado inequívoco.
- **Frente D** absorve o 8 e o 9: ordem das ações no hub, cabeçalho compacto com
  progresso, e "o que falta" em cor de aviso.
- **Frente E** absorve o 2 e o 3: tabela de produção legível e RDO que caiba em
  menos rolagem, sem tocar em ordem de bloco nem em rótulo herdado.

## Enquadramento do produto, atualizado

Não é landing page. É **sistema web operacional**: painel, menu, tabela,
formulário e fluxo. O celular continua sendo primeiro **no lançamento**, porque
é lá que o encarregado está; o monitor deixa de ser celular esticado nas telas
do engenheiro, que são consulta e conferência.
