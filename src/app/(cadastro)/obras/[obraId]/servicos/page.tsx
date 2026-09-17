/**
 * Passo 2 — serviços controlados e quantidade de projeto.
 *
 * As quatro linhas são fixas e nascem com a obra, na grafia herdada. A
 * quantidade de projeto é **versionada** (R15): alterar não sobrescreve, grava
 * versão nova, e o histórico fica. É o denominador do percentual do bloco 7,
 * e na planilha ele vinha de um arquivo de rede sem rastro nenhum.
 */

import { redirect } from 'next/navigation';

import {
  listaHistoricoDeQuantidadeProtegido,
  listaServicosProtegida,
} from '../../../../_composicao/cadastro';
import { BotaoDeEnvio } from '../../../../_componentes/botao-de-envio';
import { formataBr as formataQuantidade } from '../../../../../shared/decimal';
import { formataBr as formataDia } from '../../../../../shared/date/dia';
import { fusoDaObra, hojeNaObra } from '../../../../../shared/date/fuso';
import { idConfiavel } from '../../../../../shared/id';
import { definirQuantidadeAction } from '../../../acoes';
import { Aviso, Bloco, Campo, Erro, Vazio } from '../../../componentes';
import { Trilha } from '../../../../_componentes/casca';
import { perfilNaObraProtegido } from '../../../../_composicao/rdo-diario';
import { AbasDaObra } from '../abas';
import { atorDaRequisicao } from '../../../sessao';

export const dynamic = 'force-dynamic';

export default async function Servicos({
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

  const servicos = await listaServicosProtegida(ator, obraId);
  if (!servicos.ok) {
    return (
      <main className="pagina pagina--estreita">
        <Trilha
          degraus={[
            { texto: 'Obras', href: '/obras' },
            { texto: 'Serviços controlados' },
          ]}
        />
        <header className="cabecalhoDaPagina">
          <h1>Serviços controlados</h1>
        </header>
        <Erro mensagem={servicos.erro.mensagem} />
      </main>
    );
  }

  const ehEngenheiro = perfilNaObraProtegido(ator, obraId) === 'engenheiro';

  return (
    <main className="pagina pagina--painel">
      <Trilha
        degraus={[
          { texto: 'Obras', href: '/obras' },
          { texto: 'Obra', href: `/obras/${obraId}` },
          { texto: 'Serviços controlados' },
        ]}
      />

      <header className="cabecalhoDaPagina">
        <h1>Serviços controlados</h1>
        <p className="subtitulo">A quantidade de projeto é o denominador do percentual</p>
      </header>

      <AbasDaObra obraId={obraId} atual="servicos" ehEngenheiro={ehEngenheiro} />

      <Erro mensagem={erro} />

      {servicos.valor.length === 0 ? (
        <Vazio>
          Esta obra não tem serviço controlado. Os quatro nascem com a obra: se a lista
          está vazia, avise quem cuida do cadastro antes de lançar produção.
        </Vazio>
      ) : null}

      {servicos.valor.map((servico) => {
        const historico = listaHistoricoDeQuantidadeProtegido(
          ator,
          obraId,
          servico.servicoId,
        );

        return (
          <Bloco key={servico.servicoId} titulo={servico.nome}>
            {servico.quantidadeDeProjeto === null ? (
              <Aviso>
                Sem quantidade de projeto. Enquanto não houver, o percentual deste serviço
                não é calculável.
              </Aviso>
            ) : (
              <p>
                Quantidade de projeto vigente:{' '}
                <strong className="numero">
                  {formataQuantidade(servico.quantidadeDeProjeto)}
                </strong>
              </p>
            )}

            <form action={definirQuantidadeAction}>
              <input type="hidden" name="obraId" value={obraId} />
              <input type="hidden" name="servicoId" value={servico.servicoId} />
              <Campo
                nome="quantidade"
                rotulo="Nova quantidade de projeto"
                obrigatorio
                dica="2210,392"
              />
              <div className="linhaDeAcoes">
                <BotaoDeEnvio>Definir</BotaoDeEnvio>
              </div>
            </form>

            {historico.ok && historico.valor.length > 0 ? (
              <>
                <p className="rotulo">Histórico</p>
                <ul className="listaLimpa">
                  {historico.valor.map((versao) => (
                    <li className="itemDeLista" key={versao.definidoEm}>
                      <span className="numero">
                        {formataQuantidade(versao.quantidade)}
                      </span>
                      <span className="ajuda">
                        definida em {diaDaObraDoInstante(versao.definidoEm)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Bloco>
        );
      })}
    </main>
  );
}

/**
 * O histórico exibe o **dia da obra** em que a versão foi definida, em pt-BR.
 *
 * O instante é gravado em UTC; recortar os dez primeiros caracteres daria o dia
 * de Londres, e é assim que se perde um dia. A conversão passa por
 * `hojeNaObra`, que é a única função do sistema que decide qual é o fuso.
 */
function diaDaObraDoInstante(instante: string): string {
  return formataDia(hojeNaObra(fusoDaObra(), () => new Date(instante)));
}
