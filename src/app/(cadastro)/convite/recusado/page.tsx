/**
 * O aceite falhou.
 *
 * Existe como página própria para que o token **saia da barra de endereço**
 * junto com a tentativa: a mensagem de erro nunca viaja na mesma URL do link.
 */

import Link from 'next/link';

import { Erro, estilos } from '../../componentes';

export const dynamic = 'force-dynamic';

export default async function ConviteRecusado({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className={estilos.pagina}>
      <h1>Convite</h1>
      <Erro mensagem={erro ?? 'Não foi possível usar este convite.'} />
      <p>Peça um link novo ao engenheiro responsável pela obra.</p>
      <Link href="/entrar">Entrar</Link>
    </main>
  );
}
