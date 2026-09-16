/**
 * O aceite falhou.
 *
 * Existe como página própria para que o token **saia da barra de endereço**
 * junto com a tentativa: a mensagem de erro nunca viaja na mesma URL do link.
 */

import Link from 'next/link';

import { Erro } from '../../componentes';

export const dynamic = 'force-dynamic';

export default async function ConviteRecusado({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="pagina pagina--estreita">
      <header className="cabecalhoDaPagina">
        <h1>Convite</h1>
      </header>

      <Erro mensagem={erro ?? 'Não foi possível usar este convite.'} />
      <p>Peça um link novo ao engenheiro responsável pela obra.</p>

      <nav className="linhaDeAcoes">
        <Link className="botao botao--secundario" href="/entrar">
          Entrar
        </Link>
      </nav>
    </main>
  );
}
