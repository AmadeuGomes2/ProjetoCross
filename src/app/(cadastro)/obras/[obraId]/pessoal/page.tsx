/**
 * Passo 2 — pessoal da obra.
 *
 * **Esta tela é do engenheiro e só dele** (CT-034): a lista é nominal, e nome
 * de trabalhador é dado pessoal sob a LGPD. Quando a leitura é recusada, a
 * página mostra a mesma frase genérica de sempre e nenhum nome.
 *
 * A função vem de lista, nunca de texto livre (R13): é o que impede `Servente `
 * com espaço no fim virar uma função diferente.
 *
 * **A função é da passagem, não da pessoa** (decisão 29.1). Por isso a lista
 * mostra a função dentro de cada passagem, e não uma só ao lado do nome, e a
 * troca de função pede a data de corte: ela encerra a passagem vigente e abre
 * outra, de modo que o RDO já emitido não muda.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  listaPessoalProtegida,
  listaTermosProtegida,
} from '../../../../_composicao/cadastro';
import { formataBr } from '../../../../../shared/date/dia';
import { idConfiavel } from '../../../../../shared/id';
import { cadastrarPessoaAction, trocarFuncaoAction } from '../../../acoes';
import { Aviso, Bloco, Campo, Erro, Escolha, estilos } from '../../../componentes';
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
      <main className={estilos.pagina}>
        <h1>Pessoal</h1>
        <Erro mensagem={pessoal.erro.mensagem} />
        <Link href="/obras">Voltar às obras</Link>
      </main>
    );
  }

  const funcoes = listaTermosProtegida(ator, obraId, 'funcao');
  const opcoes = funcoes.ok ? funcoes.valor.map((t) => t.termo) : [];

  return (
    <main className={estilos.pagina}>
      <h1>Pessoal</h1>
      <Erro mensagem={erro} />
      <nav className={estilos.navegacao}>
        <Link href={`/obras/${obraId}`}>Voltar à obra</Link>
      </nav>

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
          <div className={estilos.duasColunas}>
            <Campo nome="entrada" rotulo="Entrada" tipo="date" obrigatorio />
            <Campo nome="saida" rotulo="Saída (deixe vazio se continua)" tipo="date" />
          </div>
          <button className={estilos.botao} type="submit">
            Cadastrar
          </button>
        </form>
      </Bloco>

      {pessoal.valor.length > 0 ? (
        <Bloco titulo="Trocar de função">
          <form action={trocarFuncaoAction}>
            <input type="hidden" name="obraId" value={obraId} />
            <label className={estilos.campo}>
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
            <Aviso>
              A passagem atual é encerrada na véspera e uma nova começa nesta data. O RDO
              dos dias anteriores continua como está.
            </Aviso>
            <button className={estilos.botao} type="submit">
              Trocar
            </button>
          </form>
        </Bloco>
      ) : null}

      <Bloco titulo="Pessoal cadastrado">
        {pessoal.valor.length === 0 ? (
          <Aviso>Nenhuma pessoa cadastrada.</Aviso>
        ) : (
          <ul className={estilos.lista}>
            {pessoal.valor.map((pessoa) => (
              <li key={pessoa.pessoaId}>
                <strong>{pessoa.nome}</strong>
                <ul className={estilos.lista}>
                  {pessoa.passagens.map((passagem) => (
                    <li key={passagem.id}>
                      {passagem.funcaoTermo} · {formataBr(passagem.entrada)} a{' '}
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
