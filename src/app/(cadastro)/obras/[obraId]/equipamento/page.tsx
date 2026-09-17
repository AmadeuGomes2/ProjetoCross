/**
 * Passo 2 — equipamentos da obra.
 *
 * O bloco 6 do RDO agrega por **identificador** (`CF-29`, `RE-17`), não por
 * tipo (R2). O tipo é cadastro interno e não aparece no documento; está aqui
 * só para organizar a frota.
 */

import { redirect } from 'next/navigation';

import {
  listaEquipamentosProtegida,
  listaTermosProtegida,
} from '../../../../_composicao/cadastro';
import { formataBr } from '../../../../../shared/date/dia';
import { idConfiavel } from '../../../../../shared/id';
import { cadastrarEquipamentoAction } from '../../../acoes';
import { Bloco, Campo, Erro, Escolha, Vazio, estilos } from '../../../componentes';
import { Trilha } from '../../../../_componentes/casca';
import { AbasDaObra } from '../abas';
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
      <main className="pagina pagina--estreita">
        <Trilha
          degraus={[{ texto: 'Obras', href: '/obras' }, { texto: 'Equipamentos' }]}
        />
        <header className="cabecalhoDaPagina">
          <h1>Equipamentos</h1>
        </header>
        <Erro mensagem={equipamentos.erro.mensagem} />
      </main>
    );
  }

  const tipos = listaTermosProtegida(ator, obraId, 'tipo_equipamento');
  const opcoes = tipos.ok ? tipos.valor.map((t) => t.termo) : [];

  return (
    <main className="pagina pagina--painel">
      <Trilha
        degraus={[
          { texto: 'Obras', href: '/obras' },
          { texto: 'Obra', href: `/obras/${obraId}` },
          { texto: 'Equipamentos' },
        ]}
      />

      <header className="cabecalhoDaPagina">
        <h1>Equipamentos</h1>
        <p className="subtitulo">O RDO agrega por identificador, não por tipo</p>
      </header>

      <AbasDaObra obraId={obraId} atual="equipamento" />

      <Erro mensagem={erro} />

      <Bloco titulo="Cadastrar equipamento">
        <form action={cadastrarEquipamentoAction}>
          <input type="hidden" name="obraId" value={obraId} />
          <Campo nome="identificador" rotulo="Identificador" obrigatorio dica="CF-29" />
          <Escolha nome="tipo" rotulo="Tipo" opcoes={opcoes} obrigatorio />
          <div className="grade grade--dupla">
            <Campo nome="entrada" rotulo="Entrada" tipo="date" obrigatorio />
            <Campo nome="saida" rotulo="Saída (deixe vazio se continua)" tipo="date" />
          </div>
          <div className="linhaDeAcoes">
            <button className="botao" type="submit">
              Cadastrar
            </button>
          </div>
        </form>
      </Bloco>

      <Bloco titulo="Frota da obra">
        {equipamentos.valor.length === 0 ? (
          <Vazio>
            Nenhum equipamento cadastrado. Cadastre o primeiro acima: enquanto a frota
            estiver vazia, o bloco EFETIVO EQUIPAMENTOS do RDO sai com total zero.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {equipamentos.valor.map((equipamento) => (
              <li className="itemDeLista" key={equipamento.equipamentoId}>
                <div>
                  <strong>{equipamento.identificador}</strong>
                  <ul className={estilos.passagens}>
                    {equipamento.passagens.map((passagem) => (
                      <li key={passagem.id}>
                        {formataBr(passagem.entrada)} a{' '}
                        {passagem.saida === null
                          ? 'em aberto'
                          : formataBr(passagem.saida)}
                      </li>
                    ))}
                  </ul>
                </div>
                <span className="etiqueta etiqueta--neutra">{equipamento.tipoTermo}</span>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </main>
  );
}
