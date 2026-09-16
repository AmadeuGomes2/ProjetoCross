# Decisões pendentes — terceira rodada

Mesmo formato das anteriores. Responda com os códigos, por exemplo
`1 a, 2 a, 3 b`, ou escreva **"todas as sugestões"** se todas servirem.

Nenhuma destas bloqueia o uso do sistema hoje. Todas aparecem no primeiro mês
de uso real, e todas ficam mais caras de decidir depois que houver dado.

Origem: pendências que o agente de arquitetura isolou em `docs/arquitetura/v1.md`,
seção 8, mais o que apareceu ao navegar o sistema.

---

## 1. Uma pessoa muda de função. O RDO já entregue muda junto?

Hoje a função está no cadastro da pessoa. Se o Motorista virar Operador II, o RDO
de março **passa a dizer** que ele era Operador II em março. O documento que o
fiscal já recebeu muda sozinho.

- [ ] **a)** A função passa a ser da **passagem**, não da pessoa. Mudar de função
      encerra a passagem atual e abre outra. O RDO de março continua dizendo
      Motorista, para sempre. ← sugestão
- [ ] **b)** A função é da pessoa, como hoje. O RDO antigo muda junto, e isso é
      aceito.
- [ ] **c)** Não se muda a função: cadastra-se outra pessoa.

> Por que importa: o RDO é documento contratual. Se ele muda depois de entregue,
> duas cópias do mesmo dia divergem e ninguém sabe qual vale.

---

## 2. Como se anula um lançamento em dia fechado?

Hoje **não existe caminho**. Depois que o dia fecha, só há retificação, que
substitui o conteúdo. Não há como dizer "esta produção nunca existiu".

- [ ] **a)** Retificação que marca o lançamento como **anulado**, com o motivo. O
      original continua no histórico e o RDO deixa de contá-lo. ← sugestão
- [ ] **b)** Botão de anular que cria uma retificação vazia.
- [ ] **c)** Não se anula. Se foi lançado errado, corrige-se para o valor certo.

> Por que importa: produção lançada no serviço errado hoje entra no acumulado e
> no percentual de projeto. Sem anulação, o único jeito é corrigir para outro
> valor, e não existe valor que signifique "nada".

---

## 3. Dois períodos de BMS podem se sobrepor?

Hoje é **rejeitado**: se você cadastra 01/08 a 31/08 e depois 15/08 a 15/09, o
segundo é recusado.

- [ ] **a)** Continuar rejeitando. Um dia pertence a um BMS só. ← sugestão
- [ ] **b)** Permitir, e o RDO mostra o **menor** número entre os que cobrem o dia.
- [ ] **c)** Permitir, e o RDO mostra o **maior**.

> Por que importa: o BMS amarra o RDO à medição financeira. Dia em dois BMS é dia
> que pode ser faturado duas vezes.

---

## 4. Responsável técnico é obrigatório para criar a obra?

Hoje pode ficar vazio, e o bloco de assinaturas do PDF sai em branco.

- [ ] **a)** Obrigatório. Sem nome, titulação e CREA não se cria a obra. ← sugestão
- [ ] **b)** Opcional. O bloco 11 sai vazio até alguém preencher.

> Por que importa: é o bloco que o fiscal assina de volta. RDO sem responsável
> técnico provavelmente é devolvido.

---

## 5. O encarregado lança numa data que ninguém abriu ainda. O que acontece?

- [ ] **a)** O dia é criado sozinho, como **trabalhado**, e o lançamento entra.
      Menos toques, que é o que decide se ele usa o sistema. ← sugestão
- [ ] **b)** Exige confirmar o dia primeiro, e só depois aceita lançamento.

> Por que importa: são dois toques a mais por dia, todo dia, para o usuário mais
> sensível a atrito que o produto tem.

---

## 6. O engenheiro sai da empresa. Como nasce o próximo?

Sua decisão 25.1 tirou o cadastro público. Hoje **só o comando de instalação**, no
servidor, cria conta de engenheiro. Se o engenheiro sair, alguém precisa de acesso
ao servidor.

- [ ] **a)** Um engenheiro pode promover outra pessoa a engenheiro naquela obra.
      ← sugestão
- [ ] **b)** Continua só pelo comando no servidor. É raro e é proposital.
- [ ] **c)** Engenheiro convida outro engenheiro por link, como já faz com o
      encarregado.

> Por que importa: hoje a saída do engenheiro trava o cadastro da obra até alguém
> com acesso ao servidor agir.

---

## 7. Qual o período máximo que uma consulta pode pedir?

Hoje não há teto. Pedir dez anos de RDO de uma vez é permitido.

- [ ] **a)** 366 dias, que é a duração do contrato. ← sugestão
- [ ] **b)** 92 dias, cerca de um trimestre.
- [ ] **c)** Sem limite.

> Por que importa: é o caminho mais barato para derrubar o servidor, de dentro,
> sem precisar de senha de ninguém.

---

## 8. Duas telas respondem 200 onde as outras redirecionam. Uniformizar?

A tela de lançamento sem sessão responde **200** com "Sua sessão terminou", e a
consulta de um dia inexistente, como 31 de setembro, responde **200** com "O mês
09/2026 não tem o dia 31". As demais telas protegidas redirecionam para a entrada.
O comportamento está certo nos dois casos; só o código HTTP destoa.

- [ ] **a)** Uniformizar: sem sessão redireciona; dia inexistente vira 404.
      ← sugestão
- [ ] **b)** Manter como está. A mensagem na tela é mais clara que um redirecionamento.

> Por que importa: pouco, hoje. Importa quando alguém puser monitoramento ou um
> cache na frente, porque os dois leem o código e não a mensagem.

---

## Resumo

Se todas as sugestões servem: **"todas as sugestões"**.

As que mais mudam código, se quiser priorizar: **1** (função na passagem mexe no
esquema), **2** (anulação não existe) e **6** (não há caminho para o próximo
engenheiro).
