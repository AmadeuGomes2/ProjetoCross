/**
 * O RDO diário na tela.
 *
 * Os mesmos 11 blocos do papel, na mesma ordem, mais duas coisas que só existem
 * aqui: o **resumo do dia** (decisão 3.3) e os **avisos** (decisão 12.1). O PDF
 * não recebe nenhum dos dois, e a projeção `paraDocumento` é quem garante isso.
 *
 * Desenhada primeiro para celular (CLAUDE.md, Mobile): bloco embaixo de bloco,
 * nada de tabela com rolagem horizontal. As 41 colunas de efetivo viram uma
 * lista que quebra linha.
 *
 * A página é fina de propósito: não há `if` de regra de negócio aqui. Tudo que
 * é decisão — traço, branco, letra do turno, motivo na primeira linha — chegou
 * pronto de `montaRdoDiario`.
 */

import type { ReactElement } from 'react';

import type { BlocoDeEfetivo } from '../../../modules/rdo/efetivo';
import type { RdoDiario } from '../../../modules/rdo/tipos';
import estilos from './rdo.module.css';

function Campo({ rotulo, valor }: { rotulo: string; valor: string }): ReactElement {
  return (
    <p className={estilos.linhaDeCampo}>
      <span className={estilos.rotulo}>{rotulo}</span>
      <span>{valor}</span>
    </p>
  );
}

function BlocoDeEfetivoNaTela({
  titulo,
  bloco,
}: {
  titulo: string;
  bloco: BlocoDeEfetivo;
}): ReactElement {
  return (
    <section className={estilos.bloco}>
      <h2 className={estilos.cabecalhoDoBloco}>{titulo}</h2>
      <div className={estilos.corpoDoBloco}>
        <ul className={estilos.colunas}>
          {bloco.colunas.map((coluna) => (
            /*
              A função SEM gente continua aparecendo — o gabarito tem a grade
              inteira e omiti-la mudaria o documento —, mas recua visualmente.
              Na captura de 16/09 as nove funções vazias pesavam o mesmo que as
              seis preenchidas, e o olho não achava o que importava.
            */
            <li
              className={
                coluna.texto === ''
                  ? `${estilos.coluna} ${estilos.colunaVazia}`
                  : estilos.coluna
              }
              key={coluna.chave}
            >
              <span className={estilos.rotuloDaColuna}>{coluna.rotulo}</span>
              {/* Zero sai em branco, como no gabarito. */}
              <span className={estilos.quantidade}>{coluna.texto}</span>
            </li>
          ))}
          <li className={`${estilos.coluna} ${estilos.total}`}>
            <span className={estilos.rotuloDaColuna}>TOTAL</span>
            <span className={estilos.quantidade}>{String(bloco.total)}</span>
          </li>
        </ul>
      </div>
    </section>
  );
}

export function RdoDiarioNaTela({ rdo }: { rdo: RdoDiario }): ReactElement {
  return (
    <main className={estilos.pagina}>
      <h1 className={estilos.titulo}>RELATÓRIO DIÁRIO DE OBRAS</h1>

      <div className={estilos.identificacao}>
        <p className={estilos.campo}>
          <span className={estilos.rotuloDoCampo}>Data</span>
          <span className={estilos.valorDoCampo}>{rdo.identificacao.dataBr}</span>
        </p>
        <p className={estilos.campo}>
          <span className={estilos.rotuloDoCampo}>Dia</span>
          <span className={estilos.valorDoCampo}>{rdo.identificacao.diaDaSemana}</span>
        </p>
        <p className={estilos.campo}>
          <span className={estilos.rotuloDoCampo}>BM&apos;S</span>
          <span className={estilos.valorDoCampo}>
            {rdo.identificacao.bms === null ? '' : String(rdo.identificacao.bms)}
          </span>
        </p>
        <p className={estilos.campo}>
          <span className={estilos.rotuloDoCampo}>RDO Nº</span>
          <span className={estilos.valorDoCampo}>
            {String(rdo.identificacao.numeroDoRdo)}
          </span>
        </p>
      </div>

      <p className={estilos.resumo}>
        <strong>Resumo do dia: </strong>
        {rdo.resumoDoDia === null || rdo.resumoDoDia === ''
          ? 'sem pluviometria lançada'
          : rdo.resumoDoDia}
      </p>

      {rdo.avisos.length === 0 ? null : (
        <ul className={estilos.avisos}>
          {rdo.avisos.map((aviso) => (
            <li
              className={estilos.aviso}
              key={`${aviso.codigo}-${aviso.servicoId ?? ''}`}
            >
              {aviso.mensagem}
            </li>
          ))}
        </ul>
      )}

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>INFORMAÇÕES GERAIS</h2>
        <div className={estilos.corpoDoBloco}>
          <Campo rotulo="CONTRATO:" valor={rdo.informacoesGerais.contrato} />
          <Campo rotulo="DATA INICIO:" valor={rdo.informacoesGerais.dataInicio} />
          <Campo rotulo="DATA FINAL:" valor={rdo.informacoesGerais.dataFinal} />
          <Campo rotulo="CONTRATANTE:" valor={rdo.informacoesGerais.contratante} />
          <Campo rotulo="CONTRATADA:" valor={rdo.informacoesGerais.contratada} />
          <Campo rotulo="ESCOPO:" valor={rdo.informacoesGerais.escopo} />
        </div>
      </section>

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>CARACTERISTICAS DO PROJETO</h2>
        <div className={estilos.corpoDoBloco}>
          <Campo rotulo="NOME:" valor={rdo.caracteristicasDoProjeto.nome} />
          <Campo rotulo="ÁREA:" valor={rdo.caracteristicasDoProjeto.area} />
          <Campo rotulo="LOCAL:" valor={rdo.caracteristicasDoProjeto.local} />
        </div>
      </section>

      <BlocoDeEfetivoNaTela titulo="EFETIVO PESSOAL" bloco={rdo.efetivoPessoal} />
      <BlocoDeEfetivoNaTela
        titulo="EFETIVO EQUIPAMENTOS"
        bloco={rdo.efetivoEquipamentos}
      />

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>PRODUÇÃO CONTROLADA</h2>
        <div className={estilos.corpoDoBloco}>
          {rdo.producao.map((linha) => (
            <article className={estilos.servico} key={linha.servicoId}>
              <p className={estilos.nomeDoServico}>{linha.nome}</p>
              {/*
                Rótulo ACIMA do valor, em quatro colunas fixas.
                Antes os quatro saíam numa linha corrida — `EXEC. - ACUM. -
                PROJETO 0,00 -` — com o rótulo colado no número e o traço de
                valor ausente indistinguível do separador. É o número que
                sustenta a medição, e era o bloco menos legível da tela.

                As grafias `EXEC.`, `ACUM.` e `PROJETO` são as herdadas da
                planilha e não mudam: é o vocabulário que o fiscal reconhece
                (CLAUDE.md, Fidelidade do documento). O que muda é só onde
                cada uma fica.
              */}
              <dl className={estilos.numeros}>
                <div>
                  <dt>EXEC.</dt>
                  <dd>{linha.executadoTexto}</dd>
                </div>
                <div>
                  <dt>ACUM.</dt>
                  <dd>{linha.acumuladoTexto}</dd>
                </div>
                <div>
                  <dt>PROJETO</dt>
                  <dd>{linha.projetoTexto}</dd>
                </div>
                <div>
                  <dt>%</dt>
                  <dd>{linha.percentualTexto}</dd>
                </div>
              </dl>
              <div className={estilos.trilho}>
                <div
                  className={estilos.barra}
                  style={{
                    width: `${Math.min(Math.max(linha.fracaoDoProjeto, 0), 1) * 100}%`,
                  }}
                />
              </div>
              {/* Rastreabilidade: todo número leva de volta ao lançamento. */}
              <details className={estilos.rastro}>
                <summary>
                  {linha.lancamentosDoAcumulado.length} lançamento(s) neste acumulado
                </summary>
                <ul>
                  {linha.lancamentosDoAcumulado.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>
      </section>

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>ATIVIDADES</h2>
        <div className={estilos.corpoDoBloco}>
          {rdo.atividades.length === 0 ? (
            <p className={estilos.vazio}>Nenhuma atividade lançada neste dia.</p>
          ) : (
            <ul className={estilos.lista}>
              {rdo.atividades.map((linha) =>
                linha.tipo === 'atividade' ? (
                  <li className={estilos.atividade} key={linha.lancamentoId}>
                    <span>{linha.descricao}</span>
                    <span className={estilos.status}>{linha.status}</span>
                  </li>
                ) : (
                  // Decisão 4.1: o motivo ocupa a primeira linha e não tem status.
                  <li className={estilos.motivo} key="motivo-de-parada">
                    {linha.motivo}
                  </li>
                ),
              )}
            </ul>
          )}
        </div>
      </section>

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>PLUVIOMETRIA</h2>
        <div className={estilos.corpoDoBloco}>
          <Campo rotulo="NOITE ANTER" valor={rdo.pluviometria.noiteAnterior ?? ''} />
          <Campo rotulo="MANHÃ" valor={rdo.pluviometria.manha ?? ''} />
          <Campo rotulo="TARDE" valor={rdo.pluviometria.tarde ?? ''} />
          <Campo rotulo="INDICE" valor={rdo.pluviometria.indiceTexto} />
        </div>
      </section>

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>COMENTÁRIOS CROS</h2>
        <div className={estilos.corpoDoBloco}>
          {rdo.comentariosCros.textos.length === 0 ? (
            <p className={estilos.vazio}>Sem observações neste dia.</p>
          ) : (
            <ul className={estilos.lista}>
              {rdo.comentariosCros.textos.map((texto, indice) => (
                <li className={estilos.atividade} key={`${indice}-${texto.slice(0, 12)}`}>
                  {texto}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={estilos.bloco}>
        <h2 className={estilos.cabecalhoDoBloco}>COMENTÁRIO CONTRATANTE</h2>
        {/* Decisão 10.1: o bloco aparece e sai sempre vazio na v1. */}
        <div className={estilos.corpoDoBloco}>
          <p className={estilos.vazio}>Sem comentários do contratante.</p>
        </div>
      </section>

      <div className={estilos.assinaturas}>
        <p className={estilos.assinatura}>
          {rdo.responsavelTecnico === null
            ? 'REPRESENTANTE CROS CONSTRUÇÕES S/A'
            : `${rdo.responsavelTecnico.nome} · ${rdo.responsavelTecnico.titulo} · ${rdo.responsavelTecnico.registro}`}
        </p>
        <p className={estilos.assinatura}>REPRESENTANTE CONTRATANTE</p>
      </div>
    </main>
  );
}
