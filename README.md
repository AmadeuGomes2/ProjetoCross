# RDO digital

Relatório Diário de Obras para a obra de pavimentação urbana da CROS Construções
em Montes Claros, contrato `P0476/01-25 - BLOCO 02`.

O encarregado lança o dia direto do celular, em campo. O RDO diário é **calculado**
a partir desses lançamentos e sai em PDF no formato que o fiscal da prefeitura já
conhece. Nenhum RDO é armazenado pronto: corrigir um lançamento de março corrige o
acumulado de setembro sem nenhuma ação extra.

A planilha de 42 abas que o projeto substitui **não é entrada do sistema**. Ela é a
especificação da saída. Ver `docs/spec.md`, seção 1.

---

## Rodar pela primeira vez

Precisa de Node 20.9 ou mais novo.

```bash
npm install
npm run db:preparar      # aplica as migrations e carrega as taxonomias
npm run criar-engenheiro -- --email voce@exemplo.com --nome "Seu Nome"
npm run dev              # http://localhost:3000
```

O terceiro comando cria a **primeira conta de engenheiro**. Ele existe porque o
sistema não tem cadastro público: só o engenheiro cria obra (decisão 25.1), e não
há caminho na web para a primeira conta nascer.

A senha é pedida por **prompt, sem eco**, e confirmada duas vezes. Não existe
opção `--senha`: argumento de linha de comando fica no histórico do shell e na
lista de processos da máquina. Rodar o comando duas vezes com o mesmo e-mail não
cria conta duplicada nem troca a senha em silêncio; se já houver engenheiro no
sistema, o comando recusa e só prossegue com uma opção explícita.

Depois disso, no navegador: entrar, criar a obra com pelo menos um período de BMS,
cadastrar pessoal, equipamento e serviços controlados, e gerar o link de convite
do encarregado. O link vale **uma vez** e expira em **sete dias**.

---

## Comandos

| Comando               | O que faz                          |
| --------------------- | ---------------------------------- |
| `npm run dev`         | servidor de desenvolvimento        |
| `npm run build`       | build de produção                  |
| `npm run lint`        | eslint mais `prettier --check`     |
| `npm run format`      | `prettier --write`                 |
| `npm run test`        | suíte completa                     |
| `npm run typecheck`   | `tsc --noEmit`                     |
| `npm run db:migrate`  | aplica as migrations               |
| `npm run db:seed`     | carrega as taxonomias, idempotente |
| `npm run db:preparar` | os dois acima, em ordem            |
| `npm run db:generate` | gera migration a partir do esquema |

---

## Onde ficam as coisas

```
src/shared/     dia puro, decimal exato, taxonomia, erro, log, contrato
src/db/         esquema Drizzle, migrations, seed
src/modules/    acesso, taxonomia, obra, pessoal, equipamento,
                lancamento, rdo, export
src/app/        rotas; (cadastro), (lancamento), (rdo), _composicao
docs/           domínio, spec, PRD, arquitetura, QA, segurança, fidelidade
referencia/     a planilha real, fora do repositório
```

Regra dura: **módulo não importa de módulo.** O consumidor declara a porta, o
produtor exporta uma função com a mesma forma, e a ligação acontece em
`src/app/_composicao/`. Detalhes em `docs/arquitetura/v1.md`, seção 4.

---

## Antes de mexer no código

Leia `CLAUDE.md`. Três regras concentram quase todo o risco do projeto:

- **Dado de trabalhador é dado pessoal sob a LGPD.** O RDO agrega por função e
  nunca lista nomes. Nome de pessoa não entra em log, erro, URL nem metadado de
  PDF. `src/shared/log` faz isso pelo tipo: registrar um nome **não compila**.
- **Nenhum arquivo de obra real versionado.** Nem planilha, nem PDF, nem banco.
  Ver `referencia/README.md`.
- **Divergência de layout no PDF é defeito, não preferência.** O gabarito está em
  `.claude/skills/fidelidade-documento/SKILL.md`, extraído célula a célula da
  planilha real, com os erros de ortografia herdados preservados de propósito,
  porque são o vocabulário que o fiscal reconhece.

---

## Estado

A fatia vertical funciona de ponta a ponta: cadastro, lançamento, RDO calculado na
tela e PDF pela rota. Provado em `test/circuito-rdo-e-pdf.test.ts`, que roda contra
banco real e chama o manipulador da rota de verdade.

**Fora do escopo desta versão**, e é decisão registrada, não esquecimento: mapa
linear por estaca, RDO semanal e mensal, exportação em Excel, assinatura digital,
fluxo de aprovação do contratante e múltiplas obras simultâneas. Ver `CLAUDE.md`,
seção Fora do escopo da v1.

**Ainda não conferido:** a fidelidade visual do PDF. A planilha de referência não
está em `referencia/`, então fonte, borda, largura de coluna e alinhamento fino
nunca foram comparados com o original. Ver `docs/fidelidade/`.

---

## Um aviso sobre o ambiente

O projeto está numa pasta sincronizada pelo OneDrive. O OneDrive trava arquivos da
pasta de build e derruba o `npm run build` com erro de permissão em momentos
aleatórios. Exclua `.next`, `node_modules` e `tmp` da sincronização, ou mova o
projeto para fora do OneDrive.
