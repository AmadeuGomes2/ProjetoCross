/**
 * As obras que o usuário pode ver.
 *
 * A lista vem de `listaObrasDoUsuario`, que filtra por acesso ativo. Vazamento
 * por listagem é o mais fácil de deixar passar, porque nenhuma tela mostra a
 * obra alheia (CT-074).
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { listaObrasDoUsuarioProtegida } from '../../_composicao/cadastro';
import { sairAction } from '../acoes';
import { Bloco, estilos } from '../componentes';
import { atorDaRequisicao } from '../sessao';

export const dynamic = 'force-dynamic';

export default async function Obras() {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const obras = listaObrasDoUsuarioProtegida(ator.usuarioId);

  return (
    <main className={estilos.pagina}>
      <h1>Obras</h1>

      <Bloco titulo="Obras liberadas para você">
        {!obras.ok || obras.valor.length === 0 ? (
          <p>Nenhuma obra ainda.</p>
        ) : (
          <ul className={estilos.lista}>
            {obras.valor.map((obra) => (
              <li key={obra.obraId}>
                <Link href={`/obras/${obra.obraId}`}>{obra.contrato}</Link> —{' '}
                {obra.perfil}
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <nav className={estilos.navegacao}>
        <Link href="/obras/nova">Criar obra</Link>
      </nav>

      {/* Sair invalida a sessão no servidor, não só no navegador. */}
      <form action={sairAction}>
        <button className={estilos.botao} type="submit">
          Sair
        </button>
      </form>
    </main>
  );
}
