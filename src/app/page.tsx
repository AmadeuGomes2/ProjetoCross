import Link from 'next/link';

import { atorDaRequisicao } from './_composicao/sessao';

/**
 * Porta de entrada.
 *
 * Era o texto de andaime dizendo "nenhuma funcionalidade implementada", o que
 * deixava quem abrisse o sistema numa página morta mesmo com o fluxo inteiro
 * funcionando atrás dela.
 *
 * Quem já entrou vai direto para as obras; quem não entrou vê o que o sistema
 * faz e o caminho para entrar. Não há cadastro aqui: a primeira conta de
 * engenheiro nasce por comando de instalação (decisão 25.1), e o encarregado
 * nasce por convite de uso único (14.0).
 *
 * Os estilos vêm de `globals.css`. Nada de estilo em linha: o mesmo botão
 * aparece em oito telas e precisa mudar num lugar só.
 */
export default async function Home() {
  const ator = await atorDaRequisicao();

  return (
    <main className="pagina pagina--estreita">
      <header className="cabecalhoDaPagina">
        <h1>RDO digital</h1>
        <p className="subtitulo">Relatório Diário de Obras</p>
      </header>

      {ator === null ? (
        <>
          <p>
            O encarregado lança o dia direto do celular, em campo. O RDO diário é
            calculado a partir desses lançamentos e sai em PDF no formato que o fiscal já
            conhece.
          </p>

          <div className="linhaDeAcoes">
            <Link className="botao" href="/entrar">
              Entrar
            </Link>
          </div>

          <p className="ajuda afastado">
            Recebeu um convite? Abra o link que o engenheiro enviou. Ele vale uma vez só e
            expira em sete dias.
          </p>
        </>
      ) : (
        <>
          <p>Você já está autenticado neste aparelho.</p>
          <div className="linhaDeAcoes">
            <Link className="botao" href="/obras">
              Ver minhas obras
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
