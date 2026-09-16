/**
 * Passo 1 — criar a obra.
 *
 * Os nove campos do cabeçalho (blocos 3 e 4 do gabarito) mais o responsável
 * técnico (bloco 11, decisão 18.1) e **o primeiro período de BMS**, que é
 * obrigatório na criação (decisão 21.1): obra sem período nenhum imprimiria
 * `BM'S` vazio desde o primeiro dia.
 *
 * Os rótulos usam as palavras do documento, e não as do banco: quem preenche é
 * a mesma pessoa que lê o RDO impresso.
 *
 * Duas decisões de 16/09/2026 mudaram este formulário: a **32.1** tornou os três
 * campos do responsável técnico obrigatórios, e a **37.1** pôs no bloco de BM'S
 * a linha que explica o que a sigla quer dizer. O `required` do HTML é
 * conveniência; quem recusa de verdade é `analisaCriarObra`, no servidor.
 */

import { redirect } from 'next/navigation';

import { criarObraAction } from '../../acoes';
import { Aviso, Bloco, Campo, Erro, estilos } from '../../componentes';
import { atorDaRequisicao } from '../../sessao';
import { BlocoDeBms } from './campos-de-bms';

export const dynamic = 'force-dynamic';

export default async function NovaObra({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const ator = await atorDaRequisicao();
  if (ator === null) redirect('/entrar');
  const { erro } = await searchParams;

  return (
    <main className={estilos.pagina}>
      <h1>Criar obra</h1>
      <Erro mensagem={erro} />

      <form action={criarObraAction}>
        <Bloco titulo="Informações gerais">
          <Campo nome="contrato" rotulo="Contrato" obrigatorio />
          <Campo nome="contratante" rotulo="Contratante" obrigatorio />
          <Campo nome="contratada" rotulo="Contratada" obrigatorio />
          <div className={estilos.duasColunas}>
            <Campo nome="dataInicio" rotulo="Data de início" tipo="date" obrigatorio />
            <Campo nome="dataTermino" rotulo="Data final" tipo="date" obrigatorio />
          </div>
          <Campo nome="escopo" rotulo="Escopo" obrigatorio />
        </Bloco>

        <Bloco titulo="Características do projeto">
          <Campo nome="nomeProjeto" rotulo="Nome" obrigatorio />
          <Campo nome="area" rotulo="Área" obrigatorio />
          <Campo nome="local" rotulo="Local" obrigatorio />
        </Bloco>

        <BlocoDeBms />

        <Bloco titulo="Responsável técnico">
          <Aviso>
            São os três campos do bloco de assinaturas, que o fiscal assina de volta. Sem
            eles a obra não é criada.
          </Aviso>
          <Campo nome="respTecnicoNome" rotulo="Nome" obrigatorio />
          <Campo
            nome="respTecnicoTitulo"
            rotulo="Titulação"
            dica="Engenheiro Civil"
            obrigatorio
          />
          <Campo
            nome="respTecnicoCrea"
            rotulo="Registro"
            dica="CREA - MG 000000/D"
            obrigatorio
          />
        </Bloco>

        <button className={estilos.botao} type="submit">
          Criar obra
        </button>
      </form>
    </main>
  );
}
