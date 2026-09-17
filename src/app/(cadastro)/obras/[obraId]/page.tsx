/**
 * A obra: porta do trabalho do dia, depois cadastro.
 *
 * A página é fina: lê pelas funções protegidas de `_composicao/cadastro.ts`,
 * que autorizam antes de qualquer coisa, e renderiza. Nenhuma regra de negócio
 * mora aqui.
 *
 * Desenho, depois da captura de 16/09:
 *
 * - A obra abria em formulário. Agora abre nas **portas do dia**, que são o que
 *   se vem fazer; antes disso só se chegava ao lançamento e ao RDO digitando a
 *   URL com a data na mão.
 * - Ler e escrever estavam no mesmo bloco: a lista de períodos emendava direto
 *   num formulário de cadastro, sem separação. Agora o formulário fica dentro
 *   de um `<details>`, fechado, e a lista se lê sem ruído.
 */

import { redirect } from 'next/navigation';

import {
  listaPeriodosBmsProtegida,
  obtemCabecalhoProtegido,
} from '../../../_composicao/cadastro';
import { formataBr } from '../../../../shared/date/dia';
import { hojeNaObra } from '../../../../shared/date/fuso';
import { idConfiavel } from '../../../../shared/id';
import { cadastrarPeriodoAction, definirResponsavelAction } from '../../acoes';
import { Aviso, Bloco, Campo, Erro, Vazio } from '../../componentes';
import { PortasDoDia, Trilha } from '../../../_componentes/casca';
import { perfilNaObraProtegido } from '../../../_composicao/rdo-diario';
import { atorDaRequisicao } from '../../sessao';
import { AbasDaObra } from './abas';

export const dynamic = 'force-dynamic';

export default async function Obra({
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

  const cabecalho = obtemCabecalhoProtegido(ator, obraId);
  // Obra inexistente e obra sem acesso dão a mesma resposta, de propósito.
  if (!cabecalho.ok) {
    return (
      <main className="pagina pagina--estreita">
        <Trilha degraus={[{ texto: 'Obras', href: '/obras' }, { texto: 'Obra' }]} />
        <header className="cabecalhoDaPagina">
          <h1>Obra</h1>
        </header>
        <Erro mensagem={cabecalho.erro.mensagem} />
      </main>
    );
  }

  const obra = cabecalho.valor;
  const periodos = listaPeriodosBmsProtegida(ator, obraId);

  /**
   * O que a tela OFERECE, não o que ela protege.
   *
   * Decisão 27.1: o encarregado não vê o controle que o servidor vai recusar.
   * Aqui vale o mesmo princípio para cadastrar período de BM'S e definir o
   * responsável técnico, que são do engenheiro (25.1 e 32.1). O servidor
   * continua recusando de qualquer forma; isto tira o beco sem saída.
   */
  const perfil = perfilNaObraProtegido(ator, obraId);
  const ehEngenheiro = perfil === 'engenheiro';

  // O dia sai do fuso da obra, no servidor. Nunca do relógio do navegador.
  const hoje = hojeNaObra();

  return (
    <main className="pagina pagina--painel">
      <Trilha degraus={[{ texto: 'Obras', href: '/obras' }, { texto: obra.contrato }]} />

      <header className="cabecalhoDaPagina">
        <div>
          <h1>{obra.contrato}</h1>
          <p className="subtitulo">{obra.nomeProjeto}</p>
        </div>
      </header>

      <Erro mensagem={erro} />

      <PortasDoDia
        obraId={obraId}
        hoje={hoje}
        perfil={ehEngenheiro ? 'engenheiro' : 'encarregado'}
      />

      <AbasDaObra obraId={obraId} atual="visao" />

      <Bloco titulo="Informações gerais">
        <dl className="fichaTecnica">
          <dt>Contratante</dt>
          <dd>{obra.contratante}</dd>
          <dt>Contratada</dt>
          <dd>{obra.contratada}</dd>
          <dt>Data de início</dt>
          <dd>{formataBr(obra.dataInicio)}</dd>
          <dt>Data final</dt>
          <dd>{formataBr(obra.dataTermino)}</dd>
          <dt>Escopo</dt>
          <dd>{obra.escopo}</dd>
          <dt>Nome</dt>
          <dd>{obra.nomeProjeto}</dd>
          <dt>Área</dt>
          <dd>{obra.area}</dd>
          <dt>Local</dt>
          <dd>{obra.local}</dd>
        </dl>
      </Bloco>

      <Bloco titulo="Períodos de BM'S">
        {!periodos.ok || periodos.valor.length === 0 ? (
          <Vazio>
            Nenhum período de BM&apos;S cadastrado. Cadastre o primeiro em{' '}
            <b>Cadastrar período</b>: sem ele o RDO sai com o campo BM&apos;S vazio.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {periodos.valor.map((periodo) => (
              <li className="itemDeLista" key={periodo.id}>
                <span>
                  <span className="rotulo">BM&apos;S {periodo.numero}</span>
                  {formataBr(periodo.dataInicial)} a {formataBr(periodo.dataFinal)}
                </span>
                <span className="etiqueta etiqueta--neutra">{periodo.dias} dias</span>
              </li>
            ))}
          </ul>
        )}

        {ehEngenheiro && (
          /*
           * Fechado por padrão. Cadastrar período é ato raro — uma vez por mês —
           * e estava ocupando meia tela todo dia, colado na lista que se lê.
           */
          <details className="gaveta">
            <summary>Cadastrar período</summary>
            <form action={cadastrarPeriodoAction}>
              <input type="hidden" name="obraId" value={obraId} />
              <div className="grade grade--tripla">
                <Campo nome="numero" rotulo="Número" tipo="number" obrigatorio />
                <Campo nome="dataInicial" rotulo="Data inicial" tipo="date" obrigatorio />
                <Campo nome="dataFinal" rotulo="Data final" tipo="date" obrigatorio />
              </div>
              <div className="linhaDeAcoes">
                <button className="botao" type="submit">
                  Cadastrar período
                </button>
              </div>
            </form>
          </details>
        )}
      </Bloco>

      <Bloco titulo="Responsável técnico">
        {obra.respTecnico === null ? (
          <Aviso>
            Ainda não informado. O bloco de assinaturas do PDF precisa dos três campos.
          </Aviso>
        ) : (
          <dl className="fichaTecnica">
            <dt>Nome</dt>
            <dd>{obra.respTecnico.nome}</dd>
            <dt>Titulação</dt>
            <dd>{obra.respTecnico.titulo}</dd>
            <dt>Registro</dt>
            <dd>{obra.respTecnico.crea}</dd>
          </dl>
        )}

        {ehEngenheiro && (
          <details className="gaveta" open={obra.respTecnico === null}>
            <summary>
              {obra.respTecnico === null
                ? 'Informar responsável técnico'
                : 'Alterar responsável técnico'}
            </summary>
            <form action={definirResponsavelAction}>
              <input type="hidden" name="obraId" value={obraId} />
              <Campo
                nome="respTecnicoNome"
                rotulo="Nome"
                obrigatorio
                valorInicial={obra.respTecnico?.nome}
              />
              <div className="grade grade--dupla">
                <Campo
                  nome="respTecnicoTitulo"
                  rotulo="Titulação"
                  obrigatorio
                  valorInicial={obra.respTecnico?.titulo}
                />
                <Campo
                  nome="respTecnicoCrea"
                  rotulo="Registro"
                  obrigatorio
                  valorInicial={obra.respTecnico?.crea}
                />
              </div>
              <div className="linhaDeAcoes">
                <button className="botao" type="submit">
                  Salvar responsável técnico
                </button>
              </div>
            </form>
          </details>
        )}
      </Bloco>
    </main>
  );
}
