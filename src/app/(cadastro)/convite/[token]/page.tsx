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

import { BotaoDeEnvio } from '../../../_componentes/botao-de-envio';
import { aceitarConviteAction } from '../../acoes';
import { Bloco, Campo, Erro, Nota } from '../../componentes';

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
    <main className="pagina pagina--estreita">
      <header className="cabecalhoDaPagina">
        <h1>Convite para lançar o RDO</h1>
      </header>

      <Erro mensagem={erro} />

      <Bloco titulo="Criar sua conta e aceitar">
        <Nota>
          O link serve uma vez só e vale por 7 dias. Se já tiver conta e estiver com a
          sessão aberta, basta confirmar.
        </Nota>
        <form action={aceitarConviteAction}>
          <input type="hidden" name="token" value={token} />
          <Campo nome="nome" rotulo="Seu nome" />
          <Campo nome="email" rotulo="Seu e-mail" tipo="email" />
          <Campo nome="senha" rotulo="Crie uma senha" tipo="password" />
          <div className="linhaDeAcoes">
            <BotaoDeEnvio variante="campo">Aceitar convite</BotaoDeEnvio>
          </div>
        </form>
      </Bloco>
    </main>
  );
}
