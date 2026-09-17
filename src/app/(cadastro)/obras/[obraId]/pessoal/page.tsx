/**
 * Passo 2 — pessoal da obra.
 *
 * **Quem vê e quem escreve** (decisão de 17/09/2026, que mudou o CT-034):
 * o encarregado **lê** a lista e o engenheiro **escreve**. A lista é nominal, e
 * nome de trabalhador é dado pessoal sob a LGPD, mas o encarregado convive com
 * essas pessoas todo dia e precisa conferir quem está mobilizado. A fronteira
 * que não se move é a da OBRA: quem não tem acesso recebe a frase genérica de
 * sempre, sem nenhum nome.
 *
 * A função vem de lista, nunca de texto livre (R13): é o que impede `Servente `
 * com espaço no fim virar uma função diferente.
 *
 * **A função é da passagem, não da pessoa** (decisão 29.1). Por isso a lista
 * mostra a função dentro de cada passagem, e não uma só ao lado do nome, e a
 * troca de função pede a data de corte: ela encerra a passagem vigente e abre
 * outra, de modo que o RDO já emitido não muda.
 */

import { redirect } from 'next/navigation';

import {
  listaPessoalProtegida,
  listaTermosProtegida,
} from '../../../../_composicao/cadastro';
import { BotaoDeEnvio } from '../../../../_componentes/botao-de-envio';
import { formataBr } from '../../../../../shared/date/dia';
import { idConfiavel } from '../../../../../shared/id';
import { cadastrarPessoaAction, trocarFuncaoAction } from '../../../acoes';
import { Bloco, Campo, Erro, Escolha, Nota, Vazio, estilos } from '../../../componentes';
import { Trilha } from '../../../../_componentes/casca';
import { AbasDaObra } from '../abas';
import { perfilNaObraProtegido } from '../../../../_composicao/rdo-diario';
import { atorDaRequisicao } from '../../../sessao';

export const dynamic = 'force-dynamic';

export default async function Pessoal({
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

  const pessoal = listaPessoalProtegida(ator, obraId);
  if (!pessoal.ok) {
    return (
      <main className="pagina pagina--estreita">
        <Trilha degraus={[{ texto: 'Obras', href: '/obras' }, { texto: 'Pessoal' }]} />
        <header className="cabecalhoDaPagina">
          <h1>Pessoal</h1>
        </header>
        <Erro mensagem={pessoal.erro.mensagem} />
      </main>
    );
  }

  /*
   * O encarregado LÊ a lista (decisão de 17/09/2026) mas não escreve. O
   * servidor recusa de qualquer forma; esconder o formulário tira o beco sem
   * saída de preencher e levar erro.
   */
  const ehEngenheiro = perfilNaObraProtegido(ator, obraId) === 'engenheiro';

  const funcoes = listaTermosProtegida(ator, obraId, 'funcao');
  const opcoes = funcoes.ok ? funcoes.valor.map((t) => t.termo) : [];

  return (
    <main className="pagina pagina--painel">
      <Trilha
        degraus={[
          { texto: 'Obras', href: '/obras' },
          { texto: 'Obra', href: `/obras/${obraId}` },
          { texto: 'Pessoal' },
        ]}
      />

      <header className="cabecalhoDaPagina">
        <h1>Pessoal</h1>
        <p className="subtitulo">O efetivo do RDO sai daqui, agregado por função</p>
      </header>

      <AbasDaObra obraId={obraId} atual="pessoal" ehEngenheiro={ehEngenheiro} />

      <Erro mensagem={erro} />

      {ehEngenheiro && (
        <Bloco titulo="Cadastrar pessoa">
          <form action={cadastrarPessoaAction}>
            <input type="hidden" name="obraId" value={obraId} />
            <Campo nome="nome" rotulo="Nome" obrigatorio />
            <Escolha
              nome="funcao"
              rotulo="Função nesta passagem"
              opcoes={opcoes}
              obrigatorio
            />
            <div className="grade grade--dupla">
              <Campo nome="entrada" rotulo="Entrada" tipo="date" obrigatorio />
              <Campo nome="saida" rotulo="Saída (deixe vazio se continua)" tipo="date" />
            </div>
            <div className="linhaDeAcoes">
              <BotaoDeEnvio>Cadastrar</BotaoDeEnvio>
            </div>
          </form>
        </Bloco>
      )}

      {ehEngenheiro && pessoal.valor.length > 0 ? (
        <Bloco titulo="Trocar de função">
          <form action={trocarFuncaoAction}>
            <input type="hidden" name="obraId" value={obraId} />
            <label className="campo">
              <span>Pessoa *</span>
              {/* Valor é o id, nunca o nome: nome de trabalhador não vai
                  para URL nem para log (CLAUDE.md, Segurança). */}
              <select name="pessoaId" required defaultValue="">
                <option value="" disabled>
                  Escolha…
                </option>
                {pessoal.valor.map((pessoa) => (
                  <option key={pessoa.pessoaId} value={pessoa.pessoaId}>
                    {pessoa.nome}
                  </option>
                ))}
              </select>
            </label>
            <Escolha nome="funcao" rotulo="Função nova" opcoes={opcoes} obrigatorio />
            <Campo
              nome="aPartirDe"
              rotulo="A partir de (primeiro dia na função nova)"
              tipo="date"
              obrigatorio
            />
            <Nota>
              A passagem atual é encerrada na véspera e uma nova começa nesta data. O RDO
              dos dias anteriores continua como está.
            </Nota>
            <div className="linhaDeAcoes">
              <BotaoDeEnvio>Trocar</BotaoDeEnvio>
            </div>
          </form>
        </Bloco>
      ) : null}

      <Bloco titulo="Pessoal cadastrado">
        {pessoal.valor.length === 0 ? (
          <Vazio>
            Nenhuma pessoa cadastrada. Cadastre a primeira acima: enquanto a lista estiver
            vazia, o bloco EFETIVO PESSOAL do RDO sai com total zero.
          </Vazio>
        ) : (
          <ul className="listaLimpa">
            {pessoal.valor.map((pessoa) => (
              <li className="itemDeLista" key={pessoa.pessoaId}>
                <div>
                  <strong>{pessoa.nome}</strong>
                  <ul className={estilos.passagens}>
                    {pessoa.passagens.map((passagem) => (
                      <li key={passagem.id}>
                        {passagem.funcaoTermo} · {formataBr(passagem.entrada)} a{' '}
                        {passagem.saida === null
                          ? 'em aberto'
                          : formataBr(passagem.saida)}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Bloco>
    </main>
  );
}
