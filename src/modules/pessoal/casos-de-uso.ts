/**
 * Pessoal: cadastro de pessoa e de passagens pela obra.
 *
 * **Passagem é entidade separada** (R3, caso de teste obrigatório 8). Uma
 * pessoa que sai e volta tem **duas passagens** e continua sendo **uma
 * pessoa**. O modelo de intervalo único da planilha contaria dois, e o efetivo
 * do RDO sairia dobrado.
 *
 * **Este módulo não conta efetivo.** Ele entrega a mobilização crua, e quem
 * agrega é `src/modules/rdo/efetivo.ts`, que é quem conhece o estado do dia
 * (5.1) e o formato do bloco 5. Uma regra, um lugar.
 *
 * **A função é atributo da passagem** (decisão 29.1). Cadastrar pessoa não
 * pergunta "qual é a função dela": pergunta a função da passagem que está
 * sendo aberta. Trocar de função encerra a passagem vigente e abre outra, em
 * `trocaFuncao`, e por isso o RDO já emitido não muda.
 *
 * ## Assíncrono desde 17/09/2026
 *
 * O banco passou a ser Postgres, e o driver é assíncrono. Todo caso de uso que
 * toca o banco devolve `Promise<Result<...>>`; a validação pura — ordem das
 * datas, sobreposição, resolução do termo — continua síncrona, porque não
 * depende do banco e assincronia sem motivo só esconde onde está a espera.
 *
 * **As transações deixaram de ser de graça.** No `better-sqlite3` síncrono,
 * duas escritas seguidas não tinham como ser interrompidas no meio. Agora há
 * `await` entre elas, então `cadastraPessoa` e `trocaFuncao` abrem transação
 * explícita: cada uma é **uma** mudança de cadastro contada em duas linhas, e
 * meia mudança gravada deixa a pessoa sem função num dia — efetivo errado no
 * RDO entregue ao fiscal.
 */

import { instanteAgora } from '../../shared/date/fuso';
import { somaDias, type DiaPuro } from '../../shared/date/dia';
import {
  conflitaComAlgum,
  intervaloCobreODia,
  ordemDasDatasEstaInvertida,
} from '../../shared/date/intervalo';
import {
  geraId,
  type FuncaoId,
  type ObraId,
  type PassagemPessoaId,
  type PessoaId,
} from '../../shared/id';
import { registra } from '../../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeDominio,
  ok,
  type ErroDeDominio,
  type Result,
} from '../../shared/result';
import * as repositorio from './repositorio';
import type {
  Ambiente,
  AtorDePessoal,
  ComandoCadastrarPessoa,
  ComandoEncerrarPassagem,
  ComandoPassagem,
  ComandoTrocarFuncao,
  PassagemMobilizada,
  PessoaComPassagens,
  PessoaMobilizada,
} from './tipos';

/**
 * R14, por analogia com o período de BMS: a saída não é anterior à entrada.
 *
 * Sem isto, o efetivo de um intervalo negativo é sempre zero e ninguém
 * descobre por quê — que é o que acontece com o período de −716 dias da
 * planilha (caso de teste obrigatório 2). Datas iguais são aceitas: uma
 * passagem de um dia é válida.
 *
 * A comparação mora em `shared/date/intervalo`. O que é deste módulo é só a
 * mensagem: a cópia local da regra foi apagada.
 */
function validaOrdemDasDatas(
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  if (ordemDasDatasEstaInvertida({ inicio: entrada, fim: saida })) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A data de saída não pode ser anterior à data de entrada.',
      ),
    );
  }
  return ok(undefined);
}

/**
 * Duas passagens da mesma pessoa não se sobrepõem.
 *
 * docs/arquitetura/v1.md, pergunta P4: assumido que não, rejeitado com
 * mensagem. Sobreposição não muda o número do efetivo, que conta pessoas
 * distintas, mas torna o cadastro impossível de ler e a saída ambígua.
 *
 * O código é `INTERVALO_SOBREPOSTO`, e não `DATA_FINAL_ANTES_DA_INICIAL`:
 * ali é um intervalo só, invertido; aqui são dois intervalos brigando. Com o
 * código errado, a mensagem exibida contradizia o que ficava no log.
 */
function validaSobreposicaoDePassagens(
  existentes: readonly { entrada: DiaPuro; saida: DiaPuro | null }[],
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  const conflita = conflitaComAlgum(
    { inicio: entrada, fim: saida },
    existentes.map((p) => ({ inicio: p.entrada, fim: p.saida })),
  );
  if (conflita) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.INTERVALO_SOBREPOSTO,
        'Já existe uma passagem nesta obra cobrindo esse intervalo. Encerre a anterior antes.',
      ),
    );
  }
  return ok(undefined);
}

/**
 * O termo escolhido vira referência ao cadastro (R13).
 *
 * **Não cria termo por efeito colateral** (CT-037): foi assim que a planilha
 * ganhou `Servente ` e `Servente` como duas funções diferentes.
 */
function resolveFuncaoOuErro(
  termo: string,
  amb: Ambiente,
): Result<{ id: FuncaoId }, ErroDeDominio> {
  const funcao = amb.resolveFuncao(termo);
  if (funcao === null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Escolha uma função da lista. Para usar uma função nova, cadastre-a antes.',
      ),
    );
  }
  return ok(funcao);
}

export async function cadastraPessoa(
  cmd: ComandoCadastrarPessoa,
  ator: AtorDePessoal,
  amb: Ambiente,
): Promise<Result<PessoaId, ErroDeDominio>> {
  const nome = cmd.nome.trim();
  if (nome === '') {
    return erro(erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome da pessoa.'));
  }

  // A função vai para a PASSAGEM que este cadastro abre, não para a pessoa
  // (decisão 29.1).
  const funcao = resolveFuncaoOuErro(cmd.funcaoTermo, amb);
  if (!funcao.ok) return funcao;

  const intervalo = validaOrdemDasDatas(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const pessoaId = geraId<'pessoa'>();
  const em = instanteAgora(amb.relogio);

  // Pessoa e primeira passagem são **uma** coisa só (decisão 29.1): pessoa sem
  // passagem nenhuma não aparece em RDO nenhum e ninguém descobre por quê. No
  // driver síncrono as duas escritas não tinham como ser cortadas ao meio; com
  // `await` entre elas, têm — daí a transação explícita.
  await amb.db.transaction(async (tx) => {
    await repositorio.inserePessoa(tx, {
      id: pessoaId,
      obraId: cmd.obraId,
      nome,
      criadoPor: ator.usuarioId,
      criadoEm: em,
    });
    await repositorio.inserePassagem(tx, {
      id: geraId<'passagem_pessoa'>(),
      obraId: cmd.obraId,
      pessoaId,
      funcaoId: funcao.valor.id,
      entrada: cmd.entrada,
      saida: cmd.saida,
      registradoPor: ator.usuarioId,
      registradoEm: em,
    });
  });

  // Id, nunca nome (CLAUDE.md, Segurança).
  registra('info', geraId<'correlacao'>(), 'pessoal.pessoa_cadastrada', {
    obraId: cmd.obraId,
    pessoaId,
  });
  return ok(pessoaId);
}

/**
 * A segunda ida da mesma pessoa. O cadastro **não** ganha outra pessoa (CT-033).
 *
 * Pede função porque quem volta à obra pode voltar em outra (decisão 29.1), e
 * a passagem antiga continua dizendo a função antiga.
 */
export async function registraPassagem(
  cmd: ComandoPassagem,
  ator: AtorDePessoal,
  amb: Ambiente,
): Promise<Result<PassagemPessoaId, ErroDeDominio>> {
  if ((await repositorio.buscaPessoa(amb.db, cmd.obraId, cmd.pessoaId)) === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Pessoa não encontrada nesta obra.'),
    );
  }

  const funcao = resolveFuncaoOuErro(cmd.funcaoTermo, amb);
  if (!funcao.ok) return funcao;

  const intervalo = validaOrdemDasDatas(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const existentes = await repositorio.listaPassagensDaPessoa(
    amb.db,
    cmd.obraId,
    cmd.pessoaId,
  );
  const sobreposicao = validaSobreposicaoDePassagens(existentes, cmd.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  const id = geraId<'passagem_pessoa'>();
  await repositorio.inserePassagem(amb.db, {
    id,
    obraId: cmd.obraId,
    pessoaId: cmd.pessoaId,
    funcaoId: funcao.valor.id,
    entrada: cmd.entrada,
    saida: cmd.saida,
    registradoPor: ator.usuarioId,
    registradoEm: instanteAgora(amb.relogio),
  });
  return ok(id);
}

/**
 * Troca de função: **encerra a passagem vigente e abre outra** (decisão 29.1).
 *
 * `aPartirDe` é o primeiro dia na função nova; a passagem antiga é encerrada na
 * véspera, porque a saída é o último dia trabalhado (decisão 1.1). O período na
 * obra não muda: a passagem nova herda a saída da antiga, inclusive quando é
 * nula.
 *
 * Não existe caminho que atualize a função de uma passagem já gravada. Se
 * existisse, o efetivo dos dias que ela cobre mudaria junto, e o RDO entregue
 * ao fiscal mudaria em silêncio — que é o defeito que esta decisão corrige.
 *
 * As duas escritas vão na **mesma transação**: recusa que grava metade deixaria
 * a pessoa fora da obra entre a véspera e o dia do corte.
 */
export async function trocaFuncao(
  cmd: ComandoTrocarFuncao,
  ator: AtorDePessoal,
  amb: Ambiente,
): Promise<Result<PassagemPessoaId, ErroDeDominio>> {
  if ((await repositorio.buscaPessoa(amb.db, cmd.obraId, cmd.pessoaId)) === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Pessoa não encontrada nesta obra.'),
    );
  }

  const funcao = resolveFuncaoOuErro(cmd.funcaoTermo, amb);
  if (!funcao.ok) return funcao;

  const passagens = await repositorio.listaPassagensDaPessoa(
    amb.db,
    cmd.obraId,
    cmd.pessoaId,
  );
  // Quem decide se a passagem cobre o dia é `shared/date/intervalo`, a única
  // implementação da regra no sistema. Reescrevê-la aqui criaria a segunda
  // verdade que a divergência da planilha provou ser cara.
  const vigente = passagens.find((p) =>
    intervaloCobreODia(p.entrada, p.saida, cmd.aPartirDe),
  );
  if (vigente === undefined) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Nenhuma passagem desta pessoa cobre essa data. Confira o período na obra.',
      ),
    );
  }

  // Corte no primeiro dia da passagem não divide nada: a passagem antiga
  // ficaria com saída anterior à entrada, o período de −716 dias da planilha em
  // miniatura (caso obrigatório 2).
  if (cmd.aPartirDe <= vigente.entrada) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
        'A troca precisa começar depois do primeiro dia da passagem atual.',
      ),
    );
  }

  const vespera = somaDias(cmd.aPartirDe, -1);
  const outras = passagens.filter((p) => p.id !== vigente.id);
  const sobreposicao = validaSobreposicaoDePassagens(
    outras,
    cmd.aPartirDe,
    vigente.saida,
  );
  if (!sobreposicao.ok) return sobreposicao;

  const id = geraId<'passagem_pessoa'>();
  await amb.db.transaction(async (tx) => {
    await repositorio.atualizaSaida(tx, cmd.obraId, vigente.id, vespera);
    await repositorio.inserePassagem(tx, {
      id,
      obraId: cmd.obraId,
      pessoaId: cmd.pessoaId,
      funcaoId: funcao.valor.id,
      entrada: cmd.aPartirDe,
      saida: vigente.saida,
      registradoPor: ator.usuarioId,
      registradoEm: instanteAgora(amb.relogio),
    });
  });

  // Id, nunca nome (CLAUDE.md, Segurança). `ContextoDeLog` não tem campo de
  // passagem, e acrescentá-lo é mexer em `shared/`: o par obra + pessoa já
  // localiza o registro.
  registra('info', geraId<'correlacao'>(), 'pessoal.funcao_trocada', {
    obraId: cmd.obraId,
    pessoaId: cmd.pessoaId,
  });
  return ok(id);
}

export async function encerraPassagem(
  cmd: ComandoEncerrarPassagem,
  amb: Ambiente,
): Promise<Result<void, ErroDeDominio>> {
  const passagem = await repositorio.buscaPassagem(amb.db, cmd.obraId, cmd.passagemId);
  if (passagem === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Passagem não encontrada.'));
  }

  const intervalo = validaOrdemDasDatas(passagem.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const outras = (
    await repositorio.listaPassagensDaPessoa(amb.db, cmd.obraId, passagem.pessoaId)
  ).filter((p) => p.id !== cmd.passagemId);
  const sobreposicao = validaSobreposicaoDePassagens(outras, passagem.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  await repositorio.atualizaSaida(amb.db, cmd.obraId, cmd.passagemId, cmd.saida);
  return ok(undefined);
}

/**
 * Cadastro nominal da obra. **Resposta só para o engenheiro** (PRD, "Quem
 * usa"; CT-034). A verificação mora na rota; este tipo carrega nome e por isso
 * não pode ser devolvido ao encarregado.
 */
export async function listaPessoalDaObra(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<PessoaComPassagens[], ErroDeDominio>> {
  // Duas leituras independentes, uma ida de rede só: em série seriam dois
  // tempos de resposta do Neon empilhados sem que uma dependa da outra.
  const [passagens, pessoas] = await Promise.all([
    repositorio.listaTodasAsPassagens(amb.db, obraId),
    repositorio.listaPessoas(amb.db, obraId),
  ]);
  return ok(
    pessoas.map((p) => ({
      pessoaId: p.id,
      nome: p.nome,
      // A função sai por passagem, e não uma só no topo: depois de uma troca
      // não existe "a função dela" (decisão 29.1).
      passagens: passagens
        .filter((passagem) => passagem.pessoaId === p.id)
        .map((passagem) => ({
          id: passagem.id,
          funcaoId: passagem.funcaoId,
          funcaoTermo: passagem.funcaoTermo,
          entrada: passagem.entrada,
          saida: passagem.saida,
        })),
    })),
  );
}

/**
 * A mobilização de pessoal da obra: as passagens cruas, **sem nome**.
 *
 * Quem agrega é o `rdo`, e só ele. A agregação do efetivo — todas as colunas
 * do cadastro, zero exibido em branco, recorte de espaço no rótulo (17.1),
 * ordem do cadastro e zeramento em dia parado (5.1) — vive em
 * `src/modules/rdo/efetivo.ts` e em nenhum outro lugar. Havia duas
 * implementações; a segunda era esta, e foi removida na integração das
 * frentes. Ver `docs/arquitetura/v1.md`, decisão 20 da seção 7.
 *
 * Este módulo entrega **dado**, não conta: a regra `entrada <= D e (saída nula
 * ou saída >= D)` é de `shared/date/intervalo`, aplicada pelo `rdo`.
 *
 * O tipo não tem campo de nome. O vazamento do cadastro mais sensível do
 * sistema fica impossível pelo tipo, não por disciplina de quem escreve a tela.
 */
export async function listaMobilizacao(
  obraId: ObraId,
  amb: Ambiente,
): Promise<Result<PessoaMobilizada[], ErroDeDominio>> {
  const porPessoa = new Map<PessoaId, PassagemMobilizada[]>();

  // **Uma consulta**, e o agrupamento em memória. Este é o caminho quente do
  // RDO: uma ida ao banco por pessoa multiplicaria a latência pelo tamanho do
  // efetivo.
  for (const linha of await repositorio.listaPassagensDaObra(amb.db, obraId)) {
    const passagens = porPessoa.get(linha.pessoaId) ?? [];
    // Uma pessoa, várias passagens: é o que impede contar duas vezes quem sai
    // e volta (R3, caso obrigatório 8). Cada passagem leva a SUA função
    // (decisão 29.1), porque duas passagens da mesma pessoa podem ter funções
    // diferentes.
    passagens.push({
      funcaoId: linha.funcaoId,
      entrada: linha.entrada,
      saida: linha.saida,
    });
    porPessoa.set(linha.pessoaId, passagens);
  }

  return ok(
    [...porPessoa.entries()].map(([pessoaId, passagens]) => ({ pessoaId, passagens })),
  );
}
