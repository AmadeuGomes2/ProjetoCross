---
name: checklist-seguranca
description: Checklist de segurança do RDO digital — dado pessoal de trabalhador sob LGPD, controle de acesso entre perfis, injeção, segredo e CVE de dependência. Use antes de fechar qualquer entrega.
---

# Checklist de segurança — RDO digital

Percorra item a item. **Nunca responda "nada encontrado" sem listar o que foi
verificado.** Um relatório que diz só "tudo certo" é indistinguível de um
relatório que não olhou nada.

Saída em `docs/seguranca/AAAA-MM-DD-<assunto>.md`.

---

## 1. Dado pessoal de trabalhador (prioridade máxima)

O que é dado pessoal neste projeto, verificado na planilha real: 19 nomes
completos de trabalhadores com função e data de admissão; nome, titulação e CREA
do engenheiro responsável; nomes de fiscais da prefeitura no texto de observações.
O contrato ser público não torna a lista nominal publicável.

- [ ] **Log.** Nenhum `console.log`, logger ou telemetria recebe nome de pessoa.
      Grepe por nome de campo: `nome`, `name`, `funcionario`, `pessoa`, `crea`.
      Cuidado com log de objeto inteiro: `logger.info({ lancamento })` vaza tudo
      que estiver dentro.
- [ ] **Mensagem de erro.** Nenhuma mensagem para o usuário cita nome. Use id.
      Nem "Pessoa João Carlos já tem lançamento", mas "Esta pessoa já tem
      lançamento neste dia".
- [ ] **Stack trace.** Nunca chega ao navegador, em nenhum ambiente.
- [ ] **URL.** Nome nunca aparece em caminho nem em parâmetro de consulta. URL vai
      para histórico do navegador, para log de servidor e para o cabeçalho de
      referência.
- [ ] **Metadado de PDF.** Autor, título, assunto e palavras-chave do PDF gerado
      não carregam nome de pessoa. É o vazamento mais fácil de esquecer, porque
      não aparece na tela.
- [ ] **Metadado de Excel.** Mesma coisa: criador, última modificação, comentário
      de célula. A planilha legada vaza quatro nomes só nos metadados.
- [ ] **O RDO agrega por função, nunca por nome.** Confirme que o documento
      exportado não lista quem trabalhou.
- [ ] **Resposta de API.** Não devolva a pessoa inteira quando a tela precisa só
      da função. Campo a mais na resposta é campo vazado.
- [ ] **Nada de dado real versionado.** `git log --stat` e `git status --ignored`
      confirmando que nenhuma planilha, PDF ou captura entrou. Se entrou, o
      histórico precisa ser limpo, não basta apagar o arquivo.
- [ ] **Fixture é sintética.** Nenhum nome real em `test/fixtures/`.
- [ ] **Exportação é registrada:** quem, quando, qual obra, qual período.
- [ ] **Retenção e apagamento.** Existe caminho para apagar ou anonimizar uma
      pessoa que pede exclusão, sem quebrar o histórico de RDO já entregue.

---

## 2. Controle de acesso entre perfis

Dois perfis com poderes muito diferentes. A fronteira é de confiança, não de
interface.

- [ ] **Toda verificação acontece no servidor.** Esconder botão não é controle.
- [ ] **Toda requisição verifica**, não só a tela de entrada. Rota nova sem
      verificação é rota aberta.
- [ ] **O encarregado não lê nem escreve cadastro**: obra, contrato, pessoal,
      equipamento, serviço controlado, quantidade de projeto.
- [ ] **O encarregado não vê dado de outra obra.** Teste trocando o identificador
      na requisição: acessar a obra alheia pelo id tem que falhar no servidor.
- [ ] **Referência direta a objeto.** Nenhum recurso é acessível só por adivinhar
      o id. O vínculo com a obra do usuário é verificado em toda leitura.
- [ ] **Elevação de privilégio.** O encarregado não consegue se promover, nem
      convidar outro usuário, nem alterar o próprio perfil.
- [ ] **Dia fechado.** Ninguém altera lançamento de dia fechado, nem o engenheiro,
      a não ser pelo caminho de retificação, que deixa rastro.
- [ ] **Convite.** O link de liberação do encarregado expira, é de uso único e vale
      para uma obra só.
- [ ] **Sessão.** Expira, é invalidada no logout, e o cookie é `HttpOnly`,
      `Secure` e `SameSite`.

---

## 3. Injeção e entrada hostil

Toda entrada vinda do navegador é hostil até prova em contrário.

- [ ] **Validação no servidor**, por esquema, para tipo, faixa e domínio. Validação
      no cliente é conveniência, não defesa.
- [ ] **SQL.** Só consulta parametrizada. Nenhuma concatenação de string com valor
      de usuário, nem em `ORDER BY`, que é onde costuma escapar.
- [ ] **Texto livre.** Descrição de atividade e observação são texto livre longo.
      Verifique tamanho máximo, e que o conteúdo é escapado na renderização e na
      geração de PDF.
- [ ] **Injeção de fórmula no Excel exportado.** Um valor que comece com `=`, `+`,
      `-` ou `@` vira fórmula ao abrir no Excel. Como o texto vem do encarregado e
      o arquivo vai para o fiscal, isso é execução de código na máquina de
      terceiro. Prefixe o valor ou force o tipo de célula como texto.
- [ ] **Injeção em PDF.** Se a geração passa por HTML, o texto é escapado.
- [ ] **Upload**, quando existir: tipo verificado pelo conteúdo, tamanho limitado,
      nome de arquivo nunca usado direto no caminho.
- [ ] **Travessia de caminho.** Nenhum caminho de arquivo montado com entrada de
      usuário.
- [ ] **Negação de serviço por consulta.** Consulta de período tem limite: pedir o
      RDO de dez anos não pode derrubar o servidor.

---

## 4. Segredo

- [ ] Nenhum segredo no repositório, agora nem no histórico.
      `git log -p | grep -iE "senha|password|secret|token|api[_-]?key"`.
- [ ] `.env` está ignorado; só `.env.example` é versionado, sem valores.
- [ ] Nenhum segredo em variável com prefixo público, que vai para o navegador.
- [ ] Nenhuma credencial em log, em mensagem de erro ou em URL.
- [ ] Nenhuma credencial embutida em código, nem "temporária".
- [ ] Nenhum endereço de servidor interno no código. A planilha legada carrega
      `\\192.168.1.55` e a árvore de pastas da empresa; isso não se repete aqui.

---

## 5. Dependência e CVE

- [ ] `npm audit` sem vulnerabilidade. Já roda como hook depois de cada edição.
- [ ] **O pacote `xlsx` do npm não está instalado**, nem direto nem transitivo.
      Está parado na 0.18.5 com prototype pollution na leitura (CVE-2023-30533,
      até a 0.19.2). Confirme com `npm ls xlsx`.
- [ ] O override de `uuid` em 11.1.1 continua no `package.json`. É ele que mantém
      o `npm audit` limpo apesar do ExcelJS pedir uma versão com advisory.
- [ ] Dependência nova foi justificada: o que faz, quem mantém, último lançamento,
      quantos dependentes. Dependência de um autor só, parada há anos, para fazer
      o que dez linhas fariam, é risco de cadeia de suprimento.
- [ ] Lockfile versionado e a instalação usa ele.
- [ ] Nada instalado de fora do registro público. Foi por isso que o SheetJS por
      CDN próprio foi recusado: o `npm audit` não cobre.

---

## 6. Cabeçalho e transporte

- [ ] HTTPS obrigatório.
- [ ] `X-Powered-By` desligado. Já está em `next.config.ts`.
- [ ] Política de segurança de conteúdo definida antes de ir para produção.
- [ ] Cabeçalhos de cache não guardam resposta com dado pessoal em cache
      compartilhado.
- [ ] Origem cruzada restrita ao necessário.

---

## Formato do relatório

```markdown
# Revisão de segurança — <assunto>

Data: AAAA-MM-DD · Escopo: <o que foi olhado, com arquivo:linha>

## Verificado

<lista explícita do que foi checado, item por item, mesmo o que passou>

## Achados

### CRÍTICO — <título>

- Onde: arquivo:linha
- O que acontece: <descrição concreta do vazamento ou da falha>
- Como reproduzir: <passos>
- Correção sugerida: <o que fazer>

### ATENÇÃO — ...

### OBSERVAÇÃO — ...

## Não verificado e por quê

<o que ficou de fora, com o motivo>
```

Severidade:

- **CRÍTICO**: vaza dado pessoal, permite acesso indevido, expõe segredo, executa
  código. Bloqueia a entrega.
- **ATENÇÃO**: enfraquece a defesa sem exploração direta.
- **OBSERVAÇÃO**: melhoria, dívida, endurecimento futuro.
