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
 * engenheiro nasce por comando de instalação (decisão 25.1).
 */
export default async function Home() {
  const ator = await atorDaRequisicao();

  return (
    <main
      style={{
        maxWidth: '34rem',
        margin: '0 auto',
        padding: '2rem 1rem 4rem',
        lineHeight: 1.55,
      }}
    >
      <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>RDO digital</h1>
      <p style={{ marginTop: 0, color: '#555' }}>Relatório Diário de Obras</p>

      {ator === null ? (
        <>
          <p>
            O encarregado lança o dia direto do celular, em campo. O RDO diário é
            calculado a partir desses lançamentos e sai em PDF no formato que o fiscal já
            conhece.
          </p>
          <p>
            <Link
              href="/entrar"
              style={{
                display: 'inline-block',
                padding: '0.85rem 1.4rem',
                background: '#14532d',
                color: '#fff',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Entrar
            </Link>
          </p>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            Recebeu um convite? Abra o link que o engenheiro enviou. Ele vale uma vez só e
            expira em sete dias.
          </p>
        </>
      ) : (
        <>
          <p>Você já está autenticado.</p>
          <p>
            <Link
              href="/obras"
              style={{
                display: 'inline-block',
                padding: '0.85rem 1.4rem',
                background: '#14532d',
                color: '#fff',
                borderRadius: '0.5rem',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Ver minhas obras
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
