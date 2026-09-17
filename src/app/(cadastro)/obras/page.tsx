/**
 * As obras que o usuário pode ver.
 *
 * A lista vem de `listaObrasDoUsuario`, que filtra por acesso ativo. Vazamento
 * por listagem é o mais fácil de deixar passar, porque nenhuma tela mostra a
 * obra alheia (CT-074).
 *
 * Desenho: "Criar obra" subiu para o cabeçalho, ao lado do título, e "Sair"
 * saiu daqui para a barra da casca. Na captura de 16/09 os dois eram botões
 * empilhados do mesmo tamanho, e encerrar a sessão tinha o peso visual da ação
 * principal da tela.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import { listaObrasDoUsuarioProtegida } from '../../_composicao/cadastro';
import { Vazio } from '../componentes';
import { Trilha } from '../../_componentes/casca';
import { painelDosUltimosDiasProtegido } from '../../_composicao/lancamento';
import { hojeNaObra } from '../../../shared/date/fuso';
import { atorDaRequisicao } from '../sessao';

export const dynamic = 'force-dynamic';

export default async function Obras() {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');

  const obras = listaObrasDoUsuarioProtegida(ator.usuarioId);
  const lista = obras.ok ? obras.valor : [];

  /*
   * Cada obra vem com o estado da quinzena. Sem isso o cartão era só um nome
   * num retângulo, e esta tela não respondia à única pergunta que se faz aqui:
   * qual obra precisa de mim?
   *
   * O dia sai do fuso da obra, no servidor. Uma consulta por obra: a lista é
   * curta por construção — são as obras liberadas para uma pessoa.
   */
  const hoje = hojeNaObra();
  const comEstado = await Promise.all(
    lista.map(async (obra) => ({
      ...obra,
      pendentes: (
        await painelDosUltimosDiasProtegido(ator, obra.obraId, hoje, 14)
      ).filter((d) => d.estado === 'nao_lancado').length,
    })),
  );

  return (
    <main className="pagina pagina--painel">
      <Trilha degraus={[{ texto: 'Obras' }]} />

      <header className="cabecalhoDaPagina cabecalhoDaPagina--comAcao">
        <div>
          <h1>Obras</h1>
          <p className="subtitulo">
            {lista.length === 0
              ? 'Nenhuma obra liberada para você'
              : `${lista.length} ${lista.length === 1 ? 'obra liberada' : 'obras liberadas'} para você`}
          </p>
        </div>
        <Link className="botao" href="/obras/nova">
          Criar obra
        </Link>
      </header>

      {lista.length === 0 ? (
        <div className="cartao">
          <Vazio>
            Você ainda não tem obra liberada. Crie a primeira em <b>Criar obra</b>, ou
            peça ao engenheiro responsável um link de convite.
          </Vazio>
        </div>
      ) : (
        /*
         * Cartão por obra, e não linha de tabela: a lista é curta e cada obra é
         * um destino, não um dado a comparar. A linha inteira é o alvo, para
         * que funcione com o dedo.
         */
        <ul className="grade grade--cartoes">
          {comEstado.map((obra) => (
            <li key={obra.obraId}>
              <Link className="cartaoDeObra" href={`/obras/${obra.obraId}`}>
                <span className="cartaoDeObraTopo">
                  <span className="cartaoDeObraContrato">{obra.contrato}</span>
                  <span className="etiqueta etiqueta--neutra">{obra.perfil}</span>
                </span>
                <span className="cartaoDeObraEstado">
                  {obra.pendentes === 0
                    ? 'Quinzena completa'
                    : `${obra.pendentes} ${obra.pendentes === 1 ? 'dia' : 'dias'} sem lançamento na quinzena`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
