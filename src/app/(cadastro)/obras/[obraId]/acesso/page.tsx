/**
 * Passo 3 — liberar e revogar o acesso do encarregado.
 *
 * Decisão 14.0: link de uso único, validade de 7 dias, vários encarregados por
 * obra, revogável pelo engenheiro. Revogar **não apaga** a linha nem o
 * histórico: os lançamentos já feitos continuam existindo, com a autoria
 * preservada (CT-082).
 *
 * A lista identifica cada acesso por id, sem nome e sem e-mail. Ver o relatório
 * de entrega: exibir o nome aqui precisa de decisão de quem responde pelo
 * produto.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { listaAcessosDaObra } from '../../../../../modules/acesso';
import { paraAcesso } from '../../../../_composicao/ambiente-de-cadastro';
import { idConfiavel } from '../../../../../shared/id';
import { revogarAcessoAction } from '../../../acoes';
import { Aviso, Bloco, Erro, estilos } from '../../../componentes';
import { atorDaRequisicao } from '../../../sessao';
import { ambienteDeCadastroPadrao } from '../../../../_composicao/ambiente-de-cadastro';
import { FormularioDeConvite } from './formulario-de-convite';

export const dynamic = 'force-dynamic';

export default async function Acesso({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const { obraId: bruto } = await params;
  const obraId = idConfiavel<'obra'>(bruto);
  const { erro } = await searchParams;

  const acessos = listaAcessosDaObra(
    obraId,
    ator,
    paraAcesso(ambienteDeCadastroPadrao()),
  );
  if (!acessos.ok) {
    return (
      <main className={estilos.pagina}>
        <h1>Acesso</h1>
        <Erro mensagem={acessos.erro.mensagem} />
        <Link href="/obras">Voltar às obras</Link>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <h1>Acesso</h1>
      <Erro mensagem={erro} />
      <nav className={estilos.navegacao}>
        <Link href={`/obras/${obraId}`}>Voltar à obra</Link>
      </nav>

      <Bloco titulo="Convidar encarregado">
        <FormularioDeConvite obraId={obraId} />
      </Bloco>

      <Bloco titulo="Quem tem acesso">
        {acessos.valor.length === 0 ? (
          <Aviso>Ninguém além de você.</Aviso>
        ) : (
          <ul className={estilos.lista}>
            {acessos.valor.map((acesso) => (
              <li key={acesso.id}>
                {acesso.perfil} · {acesso.usuarioId.slice(0, 8)}
                {acesso.perfil === 'encarregado' ? (
                  <form action={revogarAcessoAction}>
                    <input type="hidden" name="obraId" value={obraId} />
                    <input type="hidden" name="acessoId" value={acesso.id} />
                    <button className={estilos.botao} type="submit">
                      Revogar
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </main>
  );
}
