import Link from 'next/link';

import { diaDaSemana, partesDoDia } from '../../../../shared/date/dia';
import type { DiaNoPainel } from '../../../../modules/lancamento';

/**
 * As duas últimas semanas da obra, em estado.
 *
 * A obra abria em formulário e não dizia nada sobre o trabalho. Este painel é a
 * resposta à pergunta que quem chega faz: **o que falta lançar?**
 *
 * Cada dia é um destino, não um enfeite:
 *
 * - para o engenheiro, dia lançado leva ao RDO, que é onde se confere;
 * - dia não lançado leva ao lançamento, que é o que falta fazer;
 * - para o encarregado, **todo** dia leva ao lançamento: ele não abre RDO.
 *
 * O estado não é comunicado só por cor. Cada quadro traz a palavra — em
 * `title` e para o leitor de tela —, porque quem não distingue verde de âmbar
 * precisa ler o mesmo que os outros (CLAUDE.md: "nada depende de cor sozinha").
 *
 * **Não lançado não é parado** (decisão 4.2): o quadro vazio é vazio mesmo, sem
 * cor de estado, porque ninguém disse nada sobre aquele dia.
 */

const ROTULO: Readonly<Record<DiaNoPainel['estado'], string>> = {
  trabalhado: 'Trabalhado',
  parado: 'Parado',
  nao_lancado: 'Não lançado',
};

const CLASSE: Readonly<Record<DiaNoPainel['estado'], string>> = {
  trabalhado: 'quadroDoDia--trabalhado',
  parado: 'quadroDoDia--parado',
  nao_lancado: 'quadroDoDia--vazio',
};

export function PainelDeDias({
  obraId,
  dias,
  ehEngenheiro,
}: {
  readonly obraId: string;
  readonly dias: readonly DiaNoPainel[];
  /** O encarregado não abre RDO (17/09/2026): para ele todo dia leva ao lançamento. */
  readonly ehEngenheiro: boolean;
}) {
  const pendentes = dias.filter((d) => d.estado === 'nao_lancado').length;

  return (
    <section className="cartao" aria-labelledby="painelDeDias">
      <div className="cabecalhoDoBloco">
        <h2 id="painelDeDias">Últimos dias</h2>
        <p className="subtitulo">
          {pendentes === 0
            ? 'Todos os dias da quinzena têm lançamento'
            : `${pendentes} ${pendentes === 1 ? 'dia sem lançamento' : 'dias sem lançamento'} na quinzena`}
        </p>
      </div>

      <ol className="fitaDeDias">
        {/* Do mais antigo para o mais recente: é a ordem do calendário. */}
        {[...dias].reverse().map((dia) => {
          const { dia: numero } = partesDoDia(dia.data);
          const destino =
            !ehEngenheiro || dia.estado === 'nao_lancado'
              ? `/lancamento/${obraId}/${dia.data}`
              : `/rdo/${obraId}/${dia.data}`;

          return (
            <li key={dia.data}>
              <Link
                className={`quadroDoDia ${CLASSE[dia.estado]}`}
                href={destino}
                title={`${dia.data} · ${ROTULO[dia.estado]}${dia.fechado ? ' · fechado' : ''}`}
              >
                <span className="quadroDoDiaSemana" aria-hidden="true">
                  {diaDaSemana(dia.data).slice(0, 3)}
                </span>
                <span className="quadroDoDiaNumero">{numero}</span>
                <span className="apenasLeitorDeTela">
                  {diaDaSemana(dia.data)}, dia {numero}: {ROTULO[dia.estado]}
                  {dia.fechado ? ', dia fechado' : ''}
                </span>
                {/*
                 * O dia fechado é o que já foi entregue ao fiscal e não muda
                 * mais em silêncio. Merece marca própria, e não só uma cor.
                 */}
                {dia.fechado && (
                  <span className="quadroDoDiaFechado" aria-hidden="true">
                    ✓
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>

      <ul className="legenda">
        <li>
          <span className="legendaMarca legendaMarca--trabalhado" aria-hidden="true" />
          Trabalhado
        </li>
        <li>
          <span className="legendaMarca legendaMarca--parado" aria-hidden="true" />
          Parado
        </li>
        <li>
          <span className="legendaMarca legendaMarca--vazio" aria-hidden="true" />
          Não lançado
        </li>
        <li>
          <span aria-hidden="true">✓</span> Dia fechado
        </li>
      </ul>
    </section>
  );
}
