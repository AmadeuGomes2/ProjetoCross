/**
 * A casca da aplicação: barra superior, trilha e portas do dia.
 *
 * Existe porque não existia. Até 16/09/2026 cada página era um `<main>` solto,
 * sem barra, sem identidade e sem indicação de onde se estava; o único elo
 * entre telas era um botão "Voltar" por página. A captura das 17 telas
 * (`docs/design/auditoria-e-plano.md`, revisão de 16/09) mostrou o efeito: numa
 * ferramenta aberta todo dia útil, quem chega não sabe onde está nem para onde
 * vai.
 *
 * Três peças, e o motivo de cada uma:
 *
 * - `BarraSuperior` dá identidade e a saída. Some na impressão, porque o RDO
 *   impresso é documento contratual e não carrega cromo de aplicação.
 * - `Trilha` diz onde se está e devolve **todos** os degraus do caminho, não só
 *   o anterior. Substitui o `Voltar` avulso.
 * - `PortasDoDia` é a porta de entrada do trabalho. Sem ela só se chega ao
 *   lançamento e ao RDO digitando a URL com a data na mão.
 *
 * A barra **não mostra nome de usuário**, e isso é de propósito: `Ator` carrega
 * só `usuarioId` e `sessaoId` (`modules/acesso/tipos.ts`), de modo que não há
 * nome para vazar em cromo de tela (CLAUDE.md, Segurança).
 */

import Link from 'next/link';

import { sairAction } from '../(cadastro)/acoes';
import { diaDaSemana, formataBr } from '../../shared/date/dia';
import type { DiaPuro } from '../../shared/date/dia';

/** Um degrau da trilha. Sem `href`, é o lugar onde se está agora. */
export interface Degrau {
  readonly texto: string;
  readonly href?: string;
}

export function BarraSuperior({ autenticado = true }: { autenticado?: boolean }) {
  return (
    <header className="barra">
      <div className="barraInterna">
        <Link className="barraMarca" href={autenticado ? '/obras' : '/'}>
          <span className="marcaSinal" aria-hidden="true" />
          <span className="barraMarcaNome">RDO digital</span>
        </Link>

        {autenticado && (
          // Sair invalida a sessão no servidor, não só o cookie do navegador.
          <form action={sairAction}>
            <button className="barraSair" type="submit">
              Sair
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

/**
 * Onde se está, e o caminho inteiro de volta.
 *
 * O último degrau é a página atual e não é link — é `aria-current="page"`, para
 * que o leitor de tela anuncie a posição em vez de oferecer um link circular.
 */
export function Trilha({ degraus }: { degraus: readonly Degrau[] }) {
  return (
    <nav className="trilha" aria-label="Você está em">
      <ol>
        {degraus.map((degrau, indice) => {
          const ultimo = indice === degraus.length - 1;
          return (
            <li key={degrau.texto}>
              {degrau.href === undefined || ultimo ? (
                <span aria-current={ultimo ? 'page' : undefined}>{degrau.texto}</span>
              ) : (
                <Link href={degrau.href}>{degrau.texto}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * As duas portas do trabalho do dia.
 *
 * A data é resolvida no fuso da obra pelo servidor, nunca pelo navegador: um
 * encarregado às 23h50 precisa cair no dia que ele está vivendo, e não no dia
 * seguinte em UTC (CLAUDE.md, Modelo).
 *
 * **O encarregado não vê a porta do RDO** (17/09/2026): o RDO é do engenheiro,
 * e o servidor recusa. Oferecer um caminho que termina em recusa é pior do que
 * não oferecer.
 *
 * A porta principal muda com o perfil, porque a tarefa muda: o encarregado vem
 * **lançar** e o engenheiro vem **conferir e exportar**
 * (`docs/design/auditoria-e-plano.md`, a tabela dos dois públicos). O engenheiro
 * vê as duas, porque ele também lança (decisão 8.1); o encarregado vê uma só.
 *
 * Ordem e destaque andam juntos: a porta principal é sempre a primeira. Separar
 * as duas coisas — pôr uma na frente e pintar a outra de verde — dá à tela duas
 * respostas diferentes para "o que eu faço aqui".
 */
export function PortasDoDia({
  obraId,
  hoje,
  perfil,
}: {
  readonly obraId: string;
  readonly hoje: DiaPuro;
  readonly perfil: 'engenheiro' | 'encarregado';
}) {
  const principal = perfil === 'engenheiro' ? 'ver' : 'lancar';

  const lancar = (
    <Link
      key="lancar"
      className={principal === 'lancar' ? 'porta porta--principal' : 'porta'}
      href={`/lancamento/${obraId}/${hoje}`}
    >
      <span className="portaTitulo">Lançar hoje</span>
      <span className="portaData">
        {formataBr(hoje)} · {diaDaSemana(hoje)}
      </span>
    </Link>
  );

  const ver = (
    <Link
      key="ver"
      className={principal === 'ver' ? 'porta porta--principal' : 'porta'}
      href={`/rdo/${obraId}/${hoje}`}
    >
      <span className="portaTitulo">Ver o RDO de hoje</span>
      <span className="portaData">
        {formataBr(hoje)} · {diaDaSemana(hoje)}
      </span>
    </Link>
  );

  return (
    <div className="portas">{perfil === 'engenheiro' ? [ver, lancar] : [lancar]}</div>
  );
}
