/**
 * Listas de domínio: função, tipo de equipamento e status de atividade.
 *
 * R13: taxonomia é tabela editável, com a grafia exata herdada — **erros de
 * ortografia inclusive**, porque são o vocabulário que o fiscal reconhece.
 * O escopo é do sistema inteiro (19.2): o termo acrescentado aqui aparece em
 * todas as obras.
 *
 * `Condição de tempo` não existe (2.1), e a letra de turno não é tabela: é
 * conjunto fechado `B`, `C`, `I`, porque acrescentar letra mudaria a árvore do
 * resumo do dia, e isso é código, não dado.
 */

import { redirect } from 'next/navigation';

import { listaTermosProtegida } from '../../../../_composicao/cadastro';
import { listaLetrasDeTurno, TIPOS_DE_TAXONOMIA } from '../../../../../modules/taxonomia';
import type { TipoDeTaxonomia } from '../../../../../modules/taxonomia';
import { idConfiavel } from '../../../../../shared/id';
import { acrescentarTermoAction } from '../../../acoes';
import { Aviso, Bloco, Campo, Erro, Nota, Vazio, Voltar } from '../../../componentes';
import { atorDaRequisicao } from '../../../sessao';

export const dynamic = 'force-dynamic';

const ROTULO: Record<TipoDeTaxonomia, string> = {
  funcao: 'Função',
  tipo_equipamento: 'Tipo de equipamento',
  status_atividade: 'Status de atividade',
};

export default async function Taxonomias({
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

  const primeira = listaTermosProtegida(ator, obraId, 'funcao');
  if (!primeira.ok) {
    return (
      <main className="pagina pagina--estreita">
        <Voltar para="/obras" texto="Voltar às obras" />
        <header className="cabecalhoDaPagina">
          <h1>Listas</h1>
        </header>
        <Erro mensagem={primeira.erro.mensagem} />
      </main>
    );
  }

  return (
    <main className="pagina">
      <Voltar para={`/obras/${obraId}`} texto="Voltar à obra" />

      <header className="cabecalhoDaPagina">
        <h1>Listas</h1>
        <p className="subtitulo">Função, tipo de equipamento e status de atividade</p>
      </header>

      <Erro mensagem={erro} />

      <Aviso>
        Um termo acrescentado aqui passa a valer para todas as obras do sistema.
      </Aviso>

      {TIPOS_DE_TAXONOMIA.map((tipo) => {
        const lista = listaTermosProtegida(ator, obraId, tipo);
        const termos = lista.ok ? lista.valor : [];

        return (
          <Bloco key={tipo} titulo={ROTULO[tipo]}>
            {termos.length === 0 ? (
              <Vazio>
                Lista vazia. Acrescente o primeiro termo abaixo — sem ele o campo
                correspondente não oferece escolha nenhuma no lançamento.
              </Vazio>
            ) : (
              <ul className="listaLimpa">
                {termos.map((termo) => (
                  <li className="itemDeLista" key={termo.id}>
                    {termo.termo}
                  </li>
                ))}
              </ul>
            )}

            <form action={acrescentarTermoAction}>
              <input type="hidden" name="obraId" value={obraId} />
              <input type="hidden" name="tipo" value={tipo} />
              <Campo nome="termo" rotulo="Acrescentar termo" obrigatorio />
              <div className="linhaDeAcoes">
                <button className="botao" type="submit">
                  Acrescentar
                </button>
              </div>
            </form>
          </Bloco>
        );
      })}

      <Bloco titulo="Letra de turno">
        <Nota>
          Conjunto fechado: acrescentar uma letra mudaria a árvore do resumo do dia.
        </Nota>
        <ul className="listaLimpa">
          {listaLetrasDeTurno().map((letra) => (
            <li className="itemDeLista" key={letra}>
              {letra}
            </li>
          ))}
        </ul>
      </Bloco>
    </main>
  );
}
