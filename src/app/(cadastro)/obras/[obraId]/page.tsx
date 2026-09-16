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
import { Aviso, Bloco, Campo, Erro, estilos } from '../../componentes';
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
      <main className={estilos.pagina}>
        <h1>Obra</h1>
        <Erro mensagem={cabecalho.erro.mensagem} />
        <Link href="/obras">Voltar às obras</Link>
      </main>
    );
  }

  const obra = cabecalho.valor;
  const periodos = listaPeriodosBmsProtegida(ator, obraId);

  return (
    <main className={estilos.pagina}>
      <h1>{obra.contrato}</h1>
      <Erro mensagem={erro} />

      <nav className={estilos.navegacao}>
        <Link href={`/obras/${obraId}/pessoal`}>Pessoal</Link>
        <Link href={`/obras/${obraId}/equipamento`}>Equipamentos</Link>
        <Link href={`/obras/${obraId}/servicos`}>Serviços controlados</Link>
        <Link href={`/obras/${obraId}/taxonomia`}>Listas</Link>
        <Link href={`/obras/${obraId}/acesso`}>Acesso</Link>
      </nav>

      <Bloco titulo="Informações gerais">
        <ul className={estilos.lista}>
          <li>Contratante: {obra.contratante}</li>
          <li>Contratada: {obra.contratada}</li>
          <li>Data de início: {formataBr(obra.dataInicio)}</li>
          <li>Data final: {formataBr(obra.dataTermino)}</li>
          <li>Escopo: {obra.escopo}</li>
          <li>Nome: {obra.nomeProjeto}</li>
          <li>Área: {obra.area}</li>
          <li>Local: {obra.local}</li>
        </ul>
      </Bloco>

      <Bloco titulo="Períodos de BM'S">
        {!periodos.ok || periodos.valor.length === 0 ? (
          <Aviso>Nenhum período cadastrado.</Aviso>
        ) : (
          <ul className={estilos.lista}>
            {periodos.valor.map((periodo) => (
              <li key={periodo.id}>
                BM&apos;S {periodo.numero}: {formataBr(periodo.dataInicial)} a{' '}
                {formataBr(periodo.dataFinal)} — {periodo.dias} dias
              </li>
            ))}
          </ul>
        )}

        <form action={cadastrarPeriodoAction}>
          <input type="hidden" name="obraId" value={obraId} />
          <Campo nome="numero" rotulo="Número" tipo="number" obrigatorio />
          <div className={estilos.duasColunas}>
            <Campo nome="dataInicial" rotulo="Data inicial" tipo="date" obrigatorio />
            <Campo nome="dataFinal" rotulo="Data final" tipo="date" obrigatorio />
          </div>
          <button className={estilos.botao} type="submit">
            Cadastrar período
          </button>
        </form>
      </Bloco>

      <Bloco titulo="Responsável técnico">
        {obra.respTecnico === null ? (
          <Aviso>
            Ainda não informado. O bloco de assinaturas do PDF precisa dos três campos.
          </Aviso>
        ) : (
          <ul className={estilos.lista}>
            <li>{obra.respTecnico.nome}</li>
            <li>{obra.respTecnico.titulo}</li>
            <li>{obra.respTecnico.crea}</li>
          </ul>
        )}

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
          <button className={estilos.botao} type="submit">
            Salvar responsável técnico
          </button>
        </form>
      </Bloco>
    </main>
  );
}
