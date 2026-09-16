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

import { redirect } from 'next/navigation';

import { listaAcessosDaObraProtegida } from '../../../../_composicao/cadastro';
import { idConfiavel } from '../../../../../shared/id';
import { revogarAcessoAction } from '../../../acoes';
import { Bloco, Erro, Vazio, Voltar } from '../../../componentes';
import { atorDaRequisicao } from '../../../sessao';
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

  const acessos = listaAcessosDaObraProtegida(ator, obraId);
  if (!acessos.ok) {
    return (
      <main className="pagina pagina--estreita">
        <Voltar para="/obras" texto="Voltar às obras" />
        <header className="cabecalhoDaPagina">
          <h1>Acesso</h1>
        </header>
        <Erro mensagem={acessos.erro.mensagem} />
      </main>
    );
  }

  return (
    <main className="pagina">
      <Voltar para={`/obras/${obraId}`} texto="Voltar à obra" />

      <header className="cabecalhoDaPagina">
        <h1>Acesso</h1>
        <p className="subtitulo">Quem pode lançar e quem pode fechar o dia</p>
      </header>

      <Erro mensagem={erro} />

      <Bloco titulo="Convidar encarregado">
        <FormularioDeConvite obraId={obraId} />
      </Bloco>

      <Bloco titulo="Quem tem acesso">
        {acessos.valor.length === 0 ? (
          <Vazio>
            Ninguém além de você. Gere um link de convite acima e mande ao encarregado — é
            com ele que o dia é lançado no canteiro.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {acessos.valor.map((acesso) => (
              <li className="itemDeLista" key={acesso.id}>
                <span>
                  <span className="etiqueta">{acesso.perfil}</span>{' '}
                  <span className="numero">{acesso.usuarioId.slice(0, 8)}</span>
                </span>
                {acesso.perfil === 'encarregado' ? (
                  <form action={revogarAcessoAction}>
                    <input type="hidden" name="obraId" value={obraId} />
                    <input type="hidden" name="acessoId" value={acesso.id} />
                    <button className="botao botao--perigo" type="submit">
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
