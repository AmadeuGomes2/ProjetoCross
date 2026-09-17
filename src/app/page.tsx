import Link from 'next/link';

import { atorDaRequisicao } from './_composicao/sessao';

/**
 * Porta de entrada.
 *
 * Desenhada para o celular primeiro: no aparelho é uma coluna só, com o texto
 * no alto e o botão largo ao alcance do polegar. A partir de 60rem vira duas
 * colunas e aparece a miniatura do documento.
 *
 * A miniatura é desenhada em CSS, sem nenhuma imagem. É honesta, porque o
 * produto deste sistema é um documento, e mostrá-lo diz o que o sistema faz
 * mais depressa que qualquer frase. Também não custa requisição e não quebra
 * quando a rede do canteiro cai.
 *
 * Não há cadastro aqui: a primeira conta de engenheiro nasce por comando de
 * instalação (decisão 25.1) e o encarregado nasce por convite (14.0).
 */
function MiniaturaDoDocumento() {
  return (
    <div className="folha" aria-hidden="true">
      <div className="folhaTitulo">RELATÓRIO DIÁRIO DE OBRAS</div>

      <div className="folhaBloco">
        <div className="folhaRotulo">Informações gerais</div>
        <div className="folhaLinhas">
          <div className="folhaLinha folhaLinha--media" />
          <div className="folhaLinha folhaLinha--curta" />
        </div>
      </div>

      <div className="folhaBloco">
        <div className="folhaRotulo">Efetivo pessoal</div>
        <div className="folhaColunas">
          {Array.from({ length: 8 }, (_, indice) => (
            <div className="folhaCelula" key={indice} />
          ))}
        </div>
      </div>

      <div className="folhaBloco">
        <div className="folhaRotulo">Produção controlada</div>
        <div className="folhaBarra">
          <div className="folhaBarraCheia" />
        </div>
      </div>

      <div className="folhaBloco">
        <div className="folhaRotulo">Atividades</div>
        <div className="folhaLinhas">
          <div className="folhaLinha" />
          <div className="folhaLinha folhaLinha--media" />
          <div className="folhaLinha folhaLinha--curta" />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const ator = await atorDaRequisicao();

  return (
    <main className="entrada">
      <div className="marca">
        <span className="marcaSinal" aria-hidden="true" />
        <span className="marcaNome">RDO digital</span>
      </div>

      <div className="entradaCorpo">
        <div className="chamada">
          {ator === null ? (
            <>
              <span className="selo">Relatório Diário de Obras</span>
              <h1>O relatório do dia, feito no canteiro.</h1>
              <p className="chamadaTexto">
                O encarregado lança do celular, em campo. O RDO sai calculado, no formato
                que o fiscal já conhece.
              </p>
              <div className="entradaAcoes">
                <Link className="botao" href="/entrar">
                  Entrar
                </Link>
              </div>
            </>
          ) : (
            <>
              <span className="selo">Sessão ativa</span>
              <h1>Bem-vindo de volta.</h1>
              <p className="chamadaTexto">Você já está autenticado neste aparelho.</p>
              <div className="entradaAcoes">
                <Link className="botao" href="/obras">
                  Ver minhas obras
                </Link>
              </div>
            </>
          )}
        </div>

        <MiniaturaDoDocumento />
      </div>

      <p className="entradaRodape">
        Recebeu um convite? Abra o link que o engenheiro enviou. Ele vale uma vez só e
        expira em sete dias.
      </p>
    </main>
  );
}
