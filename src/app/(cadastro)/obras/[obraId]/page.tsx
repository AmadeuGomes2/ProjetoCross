/**
 * Cadastro da obra: cabeçalho, períodos de BM'S e responsável técnico.
 *
 * A página é fina: lê pelas funções protegidas de `_composicao/cadastro.ts`,
 * que autorizam antes de qualquer coisa, e renderiza. Nenhuma regra de negócio
 * mora aqui.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  listaPeriodosBmsProtegida,
  obtemCabecalhoProtegido,
} from '../../../_composicao/cadastro';
import { formataBr } from '../../../../shared/date/dia';
import { idConfiavel } from '../../../../shared/id';
import { cadastrarPeriodoAction, definirResponsavelAction } from '../../acoes';
import { Aviso, Bloco, Campo, Erro, Vazio, Voltar } from '../../componentes';
import { perfilNaObraProtegido } from '../../../_composicao/rdo-diario';
import { atorDaRequisicao } from '../../sessao';

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
        <Voltar para="/obras" texto="Voltar às obras" />
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
  const ehEngenheiro = perfilNaObraProtegido(ator, obraId) === 'engenheiro';

  return (
    <main className="pagina">
      <Voltar para="/obras" texto="Voltar às obras" />

      <header className="cabecalhoDaPagina">
        <h1>{obra.contrato}</h1>
        <p className="subtitulo">{obra.nomeProjeto}</p>
      </header>

      <Erro mensagem={erro} />

      <nav className="linhaDeAcoes">
        <Link className="botao botao--secundario" href={`/obras/${obraId}/pessoal`}>
          Pessoal
        </Link>
        <Link className="botao botao--secundario" href={`/obras/${obraId}/equipamento`}>
          Equipamentos
        </Link>
        <Link className="botao botao--secundario" href={`/obras/${obraId}/servicos`}>
          Serviços controlados
        </Link>
        <Link className="botao botao--secundario" href={`/obras/${obraId}/taxonomia`}>
          Listas
        </Link>
        <Link className="botao botao--secundario" href={`/obras/${obraId}/acesso`}>
          Acesso
        </Link>
      </nav>

      <Bloco titulo="Informações gerais">
        <ul className="listaLimpa">
          <li className="itemDeLista">
            <span className="rotulo">Contratante</span> {obra.contratante}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Contratada</span> {obra.contratada}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Data de início</span> {formataBr(obra.dataInicio)}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Data final</span> {formataBr(obra.dataTermino)}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Escopo</span> {obra.escopo}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Nome</span> {obra.nomeProjeto}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Área</span> {obra.area}
          </li>
          <li className="itemDeLista">
            <span className="rotulo">Local</span> {obra.local}
          </li>
        </ul>
      </Bloco>

      <Bloco titulo="Períodos de BM'S">
        {!periodos.ok || periodos.valor.length === 0 ? (
          <Vazio>
            Nenhum período de BM&apos;S cadastrado. Cadastre o primeiro no formulário
            abaixo: sem ele o RDO sai com o campo BM&apos;S vazio.
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
          <form action={cadastrarPeriodoAction}>
            <input type="hidden" name="obraId" value={obraId} />
            <Campo nome="numero" rotulo="Número" tipo="number" obrigatorio />
            <div className="grade grade--dupla">
              <Campo nome="dataInicial" rotulo="Data inicial" tipo="date" obrigatorio />
              <Campo nome="dataFinal" rotulo="Data final" tipo="date" obrigatorio />
            </div>
            <div className="linhaDeAcoes">
              <button className="botao" type="submit">
                Cadastrar período
              </button>
            </div>
          </form>
        )}
      </Bloco>

      <Bloco titulo="Responsável técnico">
        {obra.respTecnico === null ? (
          <Aviso>
            Ainda não informado. O bloco de assinaturas do PDF precisa dos três campos.
          </Aviso>
        ) : (
          <ul className="listaLimpa">
            <li className="itemDeLista">{obra.respTecnico.nome}</li>
            <li className="itemDeLista">{obra.respTecnico.titulo}</li>
            <li className="itemDeLista">{obra.respTecnico.crea}</li>
          </ul>
        )}

        {ehEngenheiro && (
          <form action={definirResponsavelAction}>
            <input type="hidden" name="obraId" value={obraId} />
            <Campo
              nome="respTecnicoNome"
              rotulo="Nome"
              obrigatorio
              valorInicial={obra.respTecnico?.nome}
            />
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
            <div className="linhaDeAcoes">
              <button className="botao" type="submit">
                Salvar responsável técnico
              </button>
            </div>
          </form>
        )}
      </Bloco>
    </main>
  );
}
