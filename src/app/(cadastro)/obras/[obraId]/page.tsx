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
import { BotaoDeEnvio } from '../../../_componentes/botao-de-envio';
import { formataBr } from '../../../../shared/date/dia';
import { hojeNaObra } from '../../../../shared/date/fuso';
import { idConfiavel } from '../../../../shared/id';
import {
  cadastrarPeriodoAction,
  definirResponsavelAction,
  editarObraAction,
  editarPeriodoAction,
  excluirPeriodoAction,
} from '../../acoes';
import { Aviso, Bloco, Campo, Erro, Vazio } from '../../componentes';
import { PortasDoDia, Trilha } from '../../../_componentes/casca';
import {
  AvisoDeImpacto,
  NAO_MEXE_NO_QUE_JA_FOI_LANCADO,
} from '../../../_componentes/aviso-de-impacto';
import { impactoDoCabecalho, impactoDoPeriodoBms } from '../../../_composicao/impacto';
import { painelDosUltimosDiasProtegido } from '../../../_composicao/lancamento';
import { perfilNaObraProtegido } from '../../../_composicao/rdo-diario';
import { atorDaRequisicao } from '../../sessao';
import { SeletorDePeriodo } from '../../../(rdo)/_componentes/seletor-de-periodo';
import { AbasDaObra } from './abas';
import { PainelDeDias } from './painel-de-dias';

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

  const cabecalho = await obtemCabecalhoProtegido(ator, obraId);
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

  const obra = await cabecalho.valor;
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

  // Duas semanas: é o quanto se olha para trás para perceber buraco de
  // lançamento antes que a medição feche.
  const ultimosDias = await painelDosUltimosDiasProtegido(ator, obraId, hoje, 14);

  // O cabeçalho sai em TODO RDO: o impacto de mexer nele é a obra inteira.
  const impactoDoTopo = impactoDoCabecalho(ator, obraId);

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

      <AbasDaObra obraId={obraId} atual="visao" ehEngenheiro={ehEngenheiro} />

      <PainelDeDias obraId={obraId} dias={ultimosDias} ehEngenheiro={ehEngenheiro} />

      {/* Exportar é do engenheiro (R19). O servidor recusa de qualquer forma. */}
      {ehEngenheiro && <SeletorDePeriodo obraId={obraId} hoje={hoje} />}

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

        {ehEngenheiro && (
          <details className="gaveta">
            <summary>Alterar informações gerais</summary>
            <AvisoDeImpacto
              impacto={impactoDoTopo}
              oQueMuda="A correção vale para todos os RDOs, inclusive os já emitidos:
                reimprimir um RDO antigo passa a dar o texto novo."
              oQueNaoMuda={NAO_MEXE_NO_QUE_JA_FOI_LANCADO}
            />
            <form action={editarObraAction}>
              <input type="hidden" name="obraId" value={obraId} />
              <Campo
                nome="contrato"
                rotulo="Contrato"
                obrigatorio
                valorInicial={obra.contrato}
              />
              <div className="grade grade--dupla">
                <Campo
                  nome="contratante"
                  rotulo="Contratante"
                  obrigatorio
                  valorInicial={obra.contratante}
                />
                <Campo
                  nome="contratada"
                  rotulo="Contratada"
                  obrigatorio
                  valorInicial={obra.contratada}
                />
              </div>
              <div className="grade grade--dupla">
                <Campo
                  nome="dataInicio"
                  rotulo="Data de início"
                  tipo="date"
                  obrigatorio
                  valorInicial={obra.dataInicio}
                />
                <Campo
                  nome="dataTermino"
                  rotulo="Data final"
                  tipo="date"
                  obrigatorio
                  valorInicial={obra.dataTermino}
                />
              </div>
              <Campo
                nome="escopo"
                rotulo="Escopo"
                obrigatorio
                valorInicial={obra.escopo}
              />
              <Campo
                nome="nomeProjeto"
                rotulo="Nome"
                obrigatorio
                valorInicial={obra.nomeProjeto}
              />
              <div className="grade grade--dupla">
                <Campo nome="area" rotulo="Área" obrigatorio valorInicial={obra.area} />
                <Campo
                  nome="local"
                  rotulo="Local"
                  obrigatorio
                  valorInicial={obra.local}
                />
              </div>
              <div className="linhaDeAcoes">
                <BotaoDeEnvio enviando="Salvando…">
                  Salvar informações gerais
                </BotaoDeEnvio>
              </div>
            </form>
          </details>
        )}
      </Bloco>

      <Bloco titulo="Períodos de BM'S">
        {!periodos.ok || periodos.valor.length === 0 ? (
          <Vazio>
            Nenhum período de BM&apos;S cadastrado. Cadastre o primeiro em{' '}
            <b>Cadastrar período</b>: sem ele o RDO sai com o campo BM&apos;S vazio.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {periodos.valor.map((periodo) => {
              /*
               * O impacto é lido por período, e não uma vez para a obra: a
               * janela de cada um alcança dias diferentes, e um número médio
               * não ajudaria ninguém a decidir sobre este aqui.
               */
              const impacto = impactoDoPeriodoBms(ator, obraId, periodo.id);
              return (
                <li className="itemDeLista" key={periodo.id}>
                  <span>
                    <span className="rotulo">BM&apos;S {periodo.numero}</span>
                    {formataBr(periodo.dataInicial)} a {formataBr(periodo.dataFinal)}
                  </span>
                  <span className="etiqueta etiqueta--neutra">{periodo.dias} dias</span>
                  {ehEngenheiro && (
                    <details className="gaveta gaveta--solta">
                      <summary>Alterar</summary>
                      <AvisoDeImpacto
                        impacto={impacto}
                        oQueMuda="Mudar as datas muda qual número de BM'S sai no
                            cabeçalho dos RDOs desses dias."
                        oQueNaoMuda={NAO_MEXE_NO_QUE_JA_FOI_LANCADO}
                      />
                      <form action={editarPeriodoAction}>
                        <input type="hidden" name="obraId" value={obraId} />
                        <input type="hidden" name="periodoId" value={periodo.id} />
                        <div className="grade grade--tripla">
                          <Campo
                            nome="numero"
                            rotulo="Número"
                            tipo="number"
                            obrigatorio
                            valorInicial={String(periodo.numero)}
                          />
                          <Campo
                            nome="dataInicial"
                            rotulo="Data inicial"
                            tipo="date"
                            obrigatorio
                            valorInicial={periodo.dataInicial}
                          />
                          <Campo
                            nome="dataFinal"
                            rotulo="Data final"
                            tipo="date"
                            obrigatorio
                            valorInicial={periodo.dataFinal}
                          />
                        </div>
                        <div className="linhaDeAcoes">
                          <BotaoDeEnvio enviando="Salvando…">Salvar período</BotaoDeEnvio>
                        </div>
                      </form>

                      {/*
                          Excluir não bloqueia por haver dia lançado dentro: o
                          dia continua lançado e o campo BM'S do RDO passa a
                          sair vazio com aviso (decisão 21.1).
                        */}
                      <form action={excluirPeriodoAction} className="afastado">
                        <input type="hidden" name="obraId" value={obraId} />
                        <input type="hidden" name="periodoId" value={periodo.id} />
                        <BotaoDeEnvio variante="perigo" enviando="Excluindo…">
                          Excluir este período
                        </BotaoDeEnvio>
                      </form>
                    </details>
                  )}
                </li>
              );
            })}
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
                <BotaoDeEnvio>Cadastrar período</BotaoDeEnvio>
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
                <BotaoDeEnvio>Salvar responsável técnico</BotaoDeEnvio>
              </div>
            </form>
          </details>
        )}
      </Bloco>
    </main>
  );
}
