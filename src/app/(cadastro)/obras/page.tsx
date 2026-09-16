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
import { Bloco, Vazio } from '../componentes';
import { atorDaRequisicao } from '../sessao';

export const dynamic = 'force-dynamic';

export default async function Obras() {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const obras = listaObrasDoUsuarioProtegida(ator.usuarioId);

  return (
    <main className="pagina">
      <header className="cabecalhoDaPagina">
        <h1>Obras</h1>
      </header>

      <Bloco titulo="Obras liberadas para você">
        {!obras.ok || obras.valor.length === 0 ? (
          <Vazio>
            Você ainda não tem obra liberada. Crie a primeira em <b>Criar obra</b>, ou
            peça ao engenheiro responsável um link de convite.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {obras.valor.map((obra) => (
              <li className="itemDeLista" key={obra.obraId}>
                <Link href={`/obras/${obra.obraId}`}>{obra.contrato}</Link>
                <span className="etiqueta">{obra.perfil}</span>
              </li>
            ))}
          </ul>
        )}
      </Bloco>

      <nav className="linhaDeAcoes">
        <Link className="botao" href="/obras/nova">
          Criar obra
        </Link>
      </nav>

      {/* Sair invalida a sessão no servidor, não só no navegador. */}
      <form className="linhaDeAcoes" action={sairAction}>
        <button className="botao botao--secundario" type="submit">
          Sair
        </button>
      </form>
    </main>
  );
}
