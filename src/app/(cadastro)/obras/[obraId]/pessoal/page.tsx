/**
 * Passo 2 — pessoal da obra.
 *
 * **Esta tela é do engenheiro e só dele** (CT-034): a lista é nominal, e nome
 * de trabalhador é dado pessoal sob a LGPD. Quando a leitura é recusada, a
 * página mostra a mesma frase genérica de sempre e nenhum nome.
 *
 * A função vem de lista, nunca de texto livre (R13): é o que impede `Servente `
 * com espaço no fim virar uma função diferente.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  listaPessoalProtegida,
  listaTermosProtegida,
} from '../../../../_composicao/cadastro';
import { formataBr } from '../../../../../shared/date/dia';
import { idConfiavel } from '../../../../../shared/id';
import { cadastrarPessoaAction } from '../../../acoes';
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
          <Escolha nome="funcao" rotulo="Função" opcoes={opcoes} obrigatorio />
          <div className={estilos.duasColunas}>
            <Campo nome="entrada" rotulo="Entrada" tipo="date" obrigatorio />
            <Campo nome="saida" rotulo="Saída (deixe vazio se continua)" tipo="date" />
          </div>
          <button className={estilos.botao} type="submit">
            Cadastrar
          </button>
        </form>
      </Bloco>

      <Bloco titulo="Pessoal cadastrado">
        {pessoal.valor.length === 0 ? (
          <Aviso>Nenhuma pessoa cadastrada.</Aviso>
        ) : (
          <ul className={estilos.lista}>
            {pessoal.valor.map((pessoa) => (
              <li key={pessoa.pessoaId}>
                <strong>{pessoa.nome}</strong> — {pessoa.funcaoTermo}
                <ul className={estilos.lista}>
                  {pessoa.passagens.map((passagem) => (
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
