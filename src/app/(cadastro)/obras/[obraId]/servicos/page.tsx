/**
 * Passo 2 — serviços controlados e quantidade de projeto.
 *
 * As quatro linhas são fixas e nascem com a obra, na grafia herdada. A
 * quantidade de projeto é **versionada** (R15): alterar não sobrescreve, grava
 * versão nova, e o histórico fica. É o denominador do percentual do bloco 7,
 * e na planilha ele vinha de um arquivo de rede sem rastro nenhum.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  listaHistoricoDeQuantidadeProtegido,
  listaServicosProtegida,
} from '../../../../_composicao/cadastro';
import { formataBr as formataQuantidade } from '../../../../../shared/decimal';
import { formataBr as formataDia } from '../../../../../shared/date/dia';
import { fusoDaObra, hojeNaObra } from '../../../../../shared/date/fuso';
import { idConfiavel } from '../../../../../shared/id';
import { definirQuantidadeAction } from '../../../acoes';
import { Aviso, Bloco, Campo, Erro, estilos } from '../../../componentes';
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

  const servicos = listaServicosProtegida(ator, obraId);
  if (!servicos.ok) {
    return (
      <main className={estilos.pagina}>
        <h1>Serviços controlados</h1>
        <Erro mensagem={servicos.erro.mensagem} />
        <Link href="/obras">Voltar às obras</Link>
      </main>
    );
  }

  return (
    <main className={estilos.pagina}>
      <h1>Serviços controlados</h1>
      <Erro mensagem={erro} />
      <nav className={estilos.navegacao}>
        <Link href={`/obras/${obraId}`}>Voltar à obra</Link>
      </nav>

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
                <strong>{formataQuantidade(servico.quantidadeDeProjeto)}</strong>
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
              <button className={estilos.botao} type="submit">
                Definir
              </button>
            </form>

            {historico.ok && historico.valor.length > 0 ? (
              <ul className={estilos.lista}>
                {historico.valor.map((versao) => (
                  <li key={versao.definidoEm}>
                    {formataQuantidade(versao.quantidade)} — definida em{' '}
                    {diaDaObraDoInstante(versao.definidoEm)}
                  </li>
                ))}
              </ul>
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
