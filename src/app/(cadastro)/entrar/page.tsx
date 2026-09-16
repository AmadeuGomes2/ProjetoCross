/**
 * Entrada do engenheiro: e-mail e senha.
 *
 * Responde a pergunta P1 de docs/arquitetura/v1.md. A senha é derivada com
 * `scrypt` de `node:crypto`; a mensagem de erro é a mesma para e-mail
 * desconhecido e senha errada, para que a tela não vire lista de quem tem
 * conta.
 */

import { criarContaAction, entrarAction } from '../acoes';
import { Bloco, Campo, Erro, estilos } from '../componentes';

export const dynamic = 'force-dynamic';

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className={estilos.pagina}>
      <h1>RDO digital</h1>
      <Erro mensagem={erro} />

      <Bloco titulo="Entrar">
        <form action={entrarAction}>
          <Campo nome="email" rotulo="E-mail" tipo="email" obrigatorio />
          <Campo nome="senha" rotulo="Senha" tipo="password" obrigatorio />
          <button className={estilos.botao} type="submit">
            Entrar
          </button>
        </form>
      </Bloco>

      <Bloco titulo="Criar conta de engenheiro">
        <form action={criarContaAction}>
          <Campo nome="nome" rotulo="Nome" obrigatorio />
          <Campo nome="email" rotulo="E-mail" tipo="email" obrigatorio />
          <Campo nome="senha" rotulo="Senha" tipo="password" obrigatorio />
          <button className={estilos.botao} type="submit">
            Criar conta
          </button>
        </form>
      </Bloco>
    </main>
  );
}
