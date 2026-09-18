# Subir o RDO digital na Vercel, com banco no Neon

Escrito para quem vai fazer o deploy pela primeira vez. Cada passo diz **por que**
existe, porque a maior parte dos erros de deploy vem de pular um deles.

---

## Antes de começar

Você precisa de três coisas:

1. um projeto no **Neon** com um banco criado;
2. um projeto na **Vercel** ligado a este repositório;
3. a string de conexão do Neon, do painel, em **Connection string**.

---

## 1. As duas strings de conexão do Neon

O Neon dá duas, e **a diferença importa**:

| String   | Host                  | Use em            |
| -------- | --------------------- | ----------------- |
| com pool | tem `-pooler` no host | **a aplicação**   |
| direta   | sem `-pooler`         | **as migrations** |

A aplicação usa a com pool porque serverless abre e fecha conexão o tempo todo, e
sem pool o Neon esgota o limite. As migrations usam a direta porque o pooler
recusa alguns comandos de DDL.

As duas terminam em `?sslmode=require`. Sem isso a conexão é recusada.

---

## 2. Aplicar o esquema no Neon

Crie um arquivo `.env.local` na raiz do projeto com a string **direta**, a sem
`-pooler`:

```
DATABASE_URL=postgres://USUARIO:SENHA@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

**Sem aspas e sem espaço em volta do `=`.** O arquivo é bloqueado pelo
`.gitignore` e nunca vai para o repositório.

Depois, da raiz do projeto:

```bash
npm run db:preparar
```

Isso aplica as migrations e carrega as taxonomias — as 12 funções, os 14 status,
os 8 tipos de equipamento e as 8 sugestões de motivo. Os dois passos são
idempotentes: rodar de novo não duplica nada.

> **Por que um arquivo, e não `DATABASE_URL=... npm run ...` na frente do
> comando.** Aquela forma é sintaxe do shell do Unix. No Windows o npm executa os
> scripts por `cmd.exe`, onde ela não funciona — e o erro que aparece não diz
> isso. Com o arquivo, o comando é o mesmo nos três sistemas.
>
> Os comandos de linha passaram a ler `.env.local` em 17/09/2026. Antes disso não
> liam, apesar de a mensagem de erro mandar preencher esse arquivo.

### Criar o primeiro engenheiro

Não há cadastro público, e convite só nasce de dentro. A primeira conta sai por
comando (decisão 25.1):

```bash
npm run criar-engenheiro -- --email "voce@exemplo.com" --nome "Seu Nome"
```

Ele pede a senha por prompt, sem ecoar na tela. **Use a mesma `.env.local` do
passo acima**, com a string direta.

---

## 3. As variáveis na Vercel

Em **Settings → Environment Variables**, para `Production` e `Preview`:

| Variável       | Valor                 |
| -------------- | --------------------- |
| `DATABASE_URL` | a string **com pool** |

**É só uma.** Este guia pedia `AUTH_SECRET` e `AUTH_URL` também, e estava
errado: **nenhuma linha de código lê essas duas variáveis**. Alguém seguiu o
guia, configurou as três e perdeu tempo com duas que a aplicação ignora.

A sessão não precisa de segredo de assinatura porque não é um token assinado. É
um valor **opaco de 32 bytes sorteados**, cujo SHA-256 fica no banco
(`src/modules/acesso/token.ts`): não codifica id de ninguém, não pode ser
forjado sem adivinhar 256 bits, e vazamento do banco não vira vazamento de
acesso. Não há o que assinar, então não há segredo para guardar.

Se um dia a sessão virar token assinado, a variável volta — e volta sendo lida
pelo código, não só pelo guia.

> Se o projeto da Vercel já está **conectado ao Neon** pela integração oficial,
> `DATABASE_URL` pode já estar preenchida. Confira qual das duas strings ela
> traz: a integração costuma trazer a com pool, que é a certa para a aplicação.

---

## 4. O deploy

Com o repositório conectado, **cada `push` no branch de produção publica**. Não
há passo manual.

> **Confira qual é o branch de produção.** A Vercel usa `main` por padrão, e este
> repositório trabalha em `master`. Se os dois não baterem, o push acontece e
> nada é publicado — sem erro, sem aviso, e a impressão é de que o deploy falhou.
> Ajuste em **Settings → Git → Production Branch**, ou renomeie o branch.

O build roda `next build`. Ele **não** aplica migrations — de propósito: migration
no build roda a cada deploy de prévia e concorre consigo mesma. Esquema é passo
separado, feito por quem sabe o que está mudando.

---

## 5. Antes de mandar o endereço para alguém de fora

Três coisas que valem para um ambiente que o cliente vai abrir. Nenhuma é
detalhe.

**As contas de demonstração têm senha escrita no repositório.**
`engenheira@obra.local` e `encarregado@obra.local` existem com senha fixa em
`scripts/demonstracao.ts`, e isso é deliberado: elas são de banco descartável, na
máquina de quem desenvolve. Num endereço público **são conta aberta para quem
leu o código**. Para um ambiente que sai da sua máquina, crie a conta pelo
`npm run criar-engenheiro`, com senha de verdade, e convide o resto de dentro.

**Não rode `npm run demonstracao` contra o banco de produção.** Ele cria as duas
contas acima. Se quiser um ambiente de vitrine com dado de mentira, use um banco
separado e trate aquele endereço como vitrine — nada real entra lá.

**Ambiente de prévia.** Cada branch gera uma URL própria. Se ela apontar para o
banco de produção, um link de prévia dá acesso a nome de trabalhador, que é dado
pessoal sob a LGPD. Banco separado para prévia, ou prévia desligada.

---

## 6. Conferir que subiu de pé

Em ordem, porque cada um depende do anterior:

1. **abre?** Acesse a URL. A porta de entrada não toca o banco: se ela falhar, é
   build ou variável, não banco.
2. **o banco responde?** Vá a `/entrar` e tente entrar com a conta de engenheiro.
   Erro aqui é `DATABASE_URL`.
3. **o RDO monta?** Abra uma obra e um dia lançado.
4. **o PDF sai?** Exporte. É o caminho mais longo: lê tudo, monta o documento e
   grava a trilha.

---

## Quando der errado

| Sintoma                          | Causa provável                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL não está definida` | a variável não foi salva para o ambiente certo                     |
| `relation "obra" does not exist` | faltou o passo 2, as migrations                                    |
| erro de conexão sob carga        | está usando a string **direta** na aplicação; troque pela com pool |
| `password authentication failed` | a string foi copiada sem `?sslmode=require`                        |
| a primeira requisição demora     | o Neon hiberna o banco ocioso e acorda em alguns segundos          |

---

## O que **não** está resolvido aqui

- **Backup.** O Neon tem retenção própria, com janela conforme o plano. O RDO é
  documento contratual: confira a janela antes de depender dela.
- **Domínio próprio.** Enquanto não houver, `AUTH_URL` aponta para o endereço da
  Vercel, que muda entre projetos.
- **Dado pessoal em prévia.** Tratado na seção 5, e repetido aqui porque é o
  erro mais fácil de cometer: banco separado para prévia, ou prévia desligada.
