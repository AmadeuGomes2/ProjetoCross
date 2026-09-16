# referencia/

Pasta para a planilha real de RDO, usada como **gabarito visual** da saída em PDF.

**Nada aqui vai para o repositório.** O `.gitignore` bloqueia a pasta inteira e,
por redundância, qualquer `.xlsm` e `.xlsx` em qualquer lugar do projeto.

---

## O que você precisa fazer à mão

Copie a planilha para cá. Não fiz isso automaticamente porque **o arquivo está
aberto no Excel** e o Windows bloqueia a leitura enquanto estiver.

1. Feche o arquivo no Excel.
2. Copie de `C:\Users\amadw\Downloads\` para esta pasta:
   - `8 - RDO SETEMBRO 2026 - 190 PMMC - BLOCO 02 .xlsm`
3. Confira que o arquivo aparece como ignorado:

```
git status --ignored referencia/
```

Existem duas cópias idênticas em Downloads, uma com `(1)` no nome, mais um arquivo
temporário de bloqueio começando com `~$`. Basta uma. O arquivo temporário some
sozinho quando o Excel fecha.

Para conferir que copiou a mesma versão que foi analisada:

```
certutil -hashfile "referencia\8 - RDO SETEMBRO 2026 - 190 PMMC - BLOCO 02 .xlsm" SHA256
```

Deve dar `cd3c784ec78e77261e0d4e7e1b0f80e9ea87077f84178e3b7cd5291371e87c32`.
Se der diferente, é outra versão do arquivo — vale revisar
`docs/dominio/mapa-planilha.md`, que descreve exatamente esse conteúdo.

---

## Por que este arquivo não entra no repositório

Não é zelo genérico. O arquivo contém, verificado célula a célula:

- **19 nomes completos de trabalhadores**, com função e data de admissão na obra.
  Dado pessoal sob a LGPD, de pessoas que não consentiram com publicação.
- **Nome, titulação e número de CREA do engenheiro responsável.**
- **Nomes de fiscais da Prefeitura** no texto das observações, além de coordenadas
  geográficas de áreas de bota-fora.
- **Metadados de autoria**: o criador e o último editor do arquivo, mais os autores
  dos comentários de célula. Quatro nomes que nem aparecem no conteúdo.
- **Topologia da rede interna da empresa**: o endereço do servidor de arquivos e a
  árvore de pastas de obras.
- **Um link para o RDO de outra obra, de outro cliente** (contrato de pavimentação
  da Eurofarma). Vazar isso é vazar dado de um terceiro que não tem relação nenhuma
  com este projeto.

Ser um contrato público não torna nada disso publicável. O contrato é público; a
lista nominal de quem trabalha nele, não.

Um repositório é de graça para clonar e difícil de limpar de verdade: depois do
primeiro `push`, o dado está no histórico, nos forks e nos caches. Por isso a
barreira é na entrada.

---

## Como este arquivo é usado

- **Por pessoa:** abrir ao lado do PDF gerado e comparar.
- **Pelo agente `fidelidade-documento`:** comparar blocos, rótulos, ordem, unidades
  e totais do PDF e do Excel gerados contra este gabarito.
- **Nunca pelo código da aplicação.** O sistema não lê planilha. Ver a inversão
  central em `docs/spec.md`.

## O que pode ser versionado

Planilha **sintética**, feita para teste, sem nenhum dado real de pessoa ou de
contrato. Essas vão em `test/fixtures/`, e mesmo lá o `.gitignore` exige exceção
explícita por arquivo, para que ninguém versione uma planilha real por engano.
