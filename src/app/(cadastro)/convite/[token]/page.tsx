/**
 * Aceite do convite do encarregado.
 *
 * O token é o caminho do link, porque o link **é** o fator de acesso (decisão
 * 14.0). Ele não é gravado em claro, não entra em log e não volta em mensagem
 * de erro; o que o servidor guarda é o SHA-256.
 *
 * A tela não confirma nem desmente que o convite existe antes do envio: quem
 * não tem o link não descobre nada aqui.
 */

import { aceitarConviteAction } from '../../acoes';
import { Aviso, Bloco, Campo, Erro, estilos } from '../../componentes';

export const dynamic = 'force-dynamic';

export default async function Convite({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;

  return (
    <main className={estilos.pagina}>
      <h1>Convite para lançar o RDO</h1>
      <Erro mensagem={erro} />

      <Bloco titulo="Criar sua conta e aceitar">
        <Aviso>
          O link serve uma vez só e vale por 7 dias. Se já tiver conta e estiver com a
          sessão aberta, basta confirmar.
        </Aviso>
        <form action={aceitarConviteAction}>
          <input type="hidden" name="token" value={token} />
          <Campo nome="nome" rotulo="Seu nome" />
          <Campo nome="email" rotulo="Seu e-mail" tipo="email" />
          <Campo nome="senha" rotulo="Crie uma senha" tipo="password" />
          <button className={estilos.botao} type="submit">
            Aceitar convite
          </button>
        </form>
      </Bloco>
    </main>
  );
}
