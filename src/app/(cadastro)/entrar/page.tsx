/**
 * Entrada do engenheiro: e-mail e senha.
 *
 * Responde a pergunta P1 de docs/arquitetura/v1.md. A senha é derivada com
 * `scrypt` de `node:crypto`; a mensagem de erro é a mesma para e-mail
 * desconhecido e senha errada, para que a tela não vire lista de quem tem
 * conta.
 *
 * **Esta tela é só entrada** (decisão 25.1, de 16/09/2026). O cadastro público
 * de engenheiro saiu: qualquer pessoa que chegasse ao endereço abria conta, e
 * conta aberta é o primeiro degrau para criar obra. A primeira conta nasce por
 * `npm run criar-engenheiro`, no servidor; as demais, por convite do engenheiro
 * (14.0), que é encarregado e chega pela tela do convite.
 */

import { entrarAction } from '../acoes';
import { Bloco, Campo, Erro, Voltar } from '../componentes';

export const dynamic = 'force-dynamic';

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="pagina pagina--estreita">
      <Voltar para="/" texto="Início" />

      <header className="cabecalhoDaPagina">
        <h1>Entrar</h1>
        <p className="subtitulo">RDO digital</p>
      </header>

      <Erro mensagem={erro} />

      <Bloco titulo="Sua conta">
        <form action={entrarAction}>
          <Campo nome="email" rotulo="E-mail" tipo="email" obrigatorio />
          <Campo nome="senha" rotulo="Senha" tipo="password" obrigatorio />
          <div className="linhaDeAcoes">
            <button className="botao botao--campo" type="submit">
              Entrar
            </button>
          </div>
        </form>
      </Bloco>

      <p className="ajuda">
        Recebeu um convite? Abra o link que o engenheiro enviou. A conta é criada ali, e o
        link vale uma vez só.
      </p>
    </main>
  );
}
