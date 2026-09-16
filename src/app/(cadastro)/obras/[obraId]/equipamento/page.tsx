/**
 * Passo 2 — equipamentos da obra.
 *
 * O bloco 6 do RDO agrega por **identificador** (`CF-29`, `RE-17`), não por
 * tipo (R2). O tipo é cadastro interno e não aparece no documento; está aqui
 * só para organizar a frota.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  listaEquipamentosProtegida,
  listaTermosProtegida,
} from '../../../../_composicao/cadastro';
import { formataBr } from '../../../../../shared/date/dia';
import { idConfiavel } from '../../../../../shared/id';
import { cadastrarEquipamentoAction } from '../../../acoes';
import { Aviso, Bloco, Campo, Erro, Escolha, estilos } from '../../../componentes';
import { atorDaRequisicao } from '../../../sessao';

export const dynamic = 'force-dynamic';

export default async function Equipamentos({
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

  const equipamentos = listaEquipamentosProtegida(ator, obraId);
  if (!equipamentos.ok) {
    return (
      <main className={estilos.pagina}>
        <h1>Equipamentos</h1>
        <Erro mensagem={equipamentos.erro.mensagem} />
        <Link href="/obras">Voltar às obras</Link>
      </main>
    );
  }

  const tipos = listaTermosProtegida(ator, obraId, 'tipo_equipamento');
  const opcoes = tipos.ok ? tipos.valor.map((t) => t.termo) : [];

  return (
    <main className={estilos.pagina}>
      <h1>Equipamentos</h1>
      <Erro mensagem={erro} />
      <nav className={estilos.navegacao}>
        <Link href={`/obras/${obraId}`}>Voltar à obra</Link>
      </nav>

      <Bloco titulo="Cadastrar equipamento">
        <form action={cadastrarEquipamentoAction}>
          <input type="hidden" name="obraId" value={obraId} />
          <Campo nome="identificador" rotulo="Identificador" obrigatorio dica="CF-29" />
          <Escolha nome="tipo" rotulo="Tipo" opcoes={opcoes} obrigatorio />
          <div className={estilos.duasColunas}>
            <Campo nome="entrada" rotulo="Entrada" tipo="date" obrigatorio />
            <Campo nome="saida" rotulo="Saída (deixe vazio se continua)" tipo="date" />
          </div>
          <button className={estilos.botao} type="submit">
            Cadastrar
          </button>
        </form>
      </Bloco>

      <Bloco titulo="Frota da obra">
        {equipamentos.valor.length === 0 ? (
          <Aviso>Nenhum equipamento cadastrado.</Aviso>
        ) : (
          <ul className={estilos.lista}>
            {equipamentos.valor.map((equipamento) => (
              <li key={equipamento.equipamentoId}>
                <strong>{equipamento.identificador}</strong> — {equipamento.tipoTermo}
                <ul className={estilos.lista}>
                  {equipamento.passagens.map((passagem) => (
                    <li key={passagem.id}>
                      {formataBr(passagem.entrada)} a{' '}
                      {passagem.saida === null ? 'em aberto' : formataBr(passagem.saida)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </main>
  );
}
