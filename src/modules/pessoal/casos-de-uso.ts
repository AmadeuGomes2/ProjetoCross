/**
 * Pessoal: cadastro, passagens e efetivo por função.
 *
 * **Passagem é entidade separada** (R3, caso de teste obrigatório 8). Uma
 * pessoa que sai e volta tem **duas passagens** e continua sendo **uma
 * pessoa**. O modelo de intervalo único da planilha contaria dois, e o efetivo
 * do RDO sairia dobrado.
 *
 * A contagem usa `intervaloCobreODia` de `shared/date/intervalo` — decisões
 * 1.1 e 1.2: a data de saída é o **último dia trabalhado**, então a pessoa
 * conta no dia em que sai. Esta regra não é reescrita aqui.
 */

import { intervaloCobreODia } from '../../shared/date/intervalo';
import { instanteAgora } from '../../shared/date/fuso';
import type { DiaPuro } from '../../shared/date/dia';
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
  EfetivoPorFuncao,
  PessoaComPassagens,
} from './tipos';

/**
 * R14, por analogia com o período de BMS: a saída não é anterior à entrada.
 *
 * Sem isto, o efetivo de um intervalo negativo é sempre zero e ninguém
 * descobre por quê — que é o que acontece com o período de −716 dias da
 * planilha (caso de teste obrigatório 2). Datas iguais são aceitas: uma
 * passagem de um dia é válida.
 */
function validaIntervaloDaPassagem(
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  if (saida !== null && saida < entrada) {
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
 */
function validaSobreposicao(
  existentes: readonly { entrada: DiaPuro; saida: DiaPuro | null }[],
  entrada: DiaPuro,
  saida: DiaPuro | null,
): Result<void, ErroDeDominio> {
  for (const p of existentes) {
    const conflita =
      (p.saida === null || entrada <= p.saida) && (saida === null || saida >= p.entrada);
    if (conflita) {
      return erro(
        erroDeDominio(
          CODIGO_ERRO.DATA_FINAL_ANTES_DA_INICIAL,
          'Já existe uma passagem nesta obra cobrindo esse intervalo. Encerre a anterior antes.',
        ),
      );
    }
  }
  return ok(undefined);
}

export function cadastraPessoa(
  cmd: ComandoCadastrarPessoa,
  ator: AtorDePessoal,
  amb: Ambiente,
): Result<PessoaId, ErroDeDominio> {
  const nome = cmd.nome.trim();
  if (nome === '') {
    return erro(erroDeDominio(CODIGO_ERRO.TERMO_VAZIO, 'Informe o nome da pessoa.'));
  }

  const funcao = amb.resolveFuncao(cmd.funcaoTermo);
  if (funcao === null) {
    return erro(
      erroDeDominio(
        CODIGO_ERRO.NAO_ENCONTRADO,
        'Escolha uma função da lista. Para usar uma função nova, cadastre-a antes.',
      ),
    );
  }

  const intervalo = validaIntervaloDaPassagem(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const pessoaId = geraId<'pessoa'>();
  const em = instanteAgora(amb.relogio);

  amb.db.transaction((tx) => {
    repositorio.inserePessoa(tx, {
      id: pessoaId,
      obraId: cmd.obraId,
      nome,
      funcaoId: funcao.id,
      criadoPor: ator.usuarioId,
      criadoEm: em,
    });
    repositorio.inserePassagem(tx, {
      id: geraId<'passagem_pessoa'>(),
      obraId: cmd.obraId,
      pessoaId,
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

/** A segunda ida da mesma pessoa. O cadastro **não** ganha outra pessoa (CT-033). */
export function registraPassagem(
  cmd: ComandoPassagem,
  ator: AtorDePessoal,
  amb: Ambiente,
): Result<PassagemPessoaId, ErroDeDominio> {
  if (repositorio.buscaPessoa(amb.db, cmd.obraId, cmd.pessoaId) === null) {
    return erro(
      erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Pessoa não encontrada nesta obra.'),
    );
  }

  const intervalo = validaIntervaloDaPassagem(cmd.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const existentes = repositorio.listaPassagensDaPessoa(amb.db, cmd.obraId, cmd.pessoaId);
  const sobreposicao = validaSobreposicao(existentes, cmd.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  const id = geraId<'passagem_pessoa'>();
  repositorio.inserePassagem(amb.db, {
    id,
    obraId: cmd.obraId,
    pessoaId: cmd.pessoaId,
    entrada: cmd.entrada,
    saida: cmd.saida,
    registradoPor: ator.usuarioId,
    registradoEm: instanteAgora(amb.relogio),
  });
  return ok(id);
}

export function encerraPassagem(
  cmd: ComandoEncerrarPassagem,
  amb: Ambiente,
): Result<void, ErroDeDominio> {
  const passagem = repositorio.buscaPassagem(amb.db, cmd.obraId, cmd.passagemId);
  if (passagem === null) {
    return erro(erroDeDominio(CODIGO_ERRO.NAO_ENCONTRADO, 'Passagem não encontrada.'));
  }

  const intervalo = validaIntervaloDaPassagem(passagem.entrada, cmd.saida);
  if (!intervalo.ok) return intervalo;

  const outras = repositorio
    .listaPassagensDaPessoa(amb.db, cmd.obraId, passagem.pessoaId)
    .filter((p) => p.id !== cmd.passagemId);
  const sobreposicao = validaSobreposicao(outras, passagem.entrada, cmd.saida);
  if (!sobreposicao.ok) return sobreposicao;

  repositorio.atualizaSaida(amb.db, cmd.obraId, cmd.passagemId, cmd.saida);
  return ok(undefined);
}

/**
 * Cadastro nominal da obra. **Resposta só para o engenheiro** (PRD, "Quem
 * usa"; CT-034). A verificação mora na rota; este tipo carrega nome e por isso
 * não pode ser devolvido ao encarregado.
 */
export function listaPessoalDaObra(
  obraId: ObraId,
  amb: Ambiente,
): Result<PessoaComPassagens[], ErroDeDominio> {
  const passagens = repositorio.listaTodasAsPassagens(amb.db, obraId);
  return ok(
    repositorio.listaPessoasComFuncao(amb.db, obraId).map((p) => ({
      pessoaId: p.id,
      nome: p.nome,
      funcaoId: p.funcaoId,
      funcaoTermo: p.funcaoTermo,
      passagens: passagens
        .filter((passagem) => passagem.pessoaId === p.id)
        .map((passagem) => ({
          id: passagem.id,
          entrada: passagem.entrada,
          saida: passagem.saida,
        })),
    })),
  );
}

/**
 * Efetivo do dia, agregado por função — o bloco 5 do RDO.
 *
 * Conta **pessoas distintas**, não linhas de passagem: quem tem duas passagens
 * conta uma (R3). A decisão de cobrir o dia é de `intervaloCobreODia`, então a
 * pessoa conta no dia da saída (1.1).
 *
 * **Não zera em dia parado.** Quem zera é o `rdo`, que é quem conhece o estado
 * do dia (5.1 e arquitetura, decisão 20). Manter o zeramento fora daqui evita
 * que `pessoal` precise conhecer `dia_de_obra`.
 */
export function contaEfetivoPorFuncao(
  obraId: ObraId,
  dia: DiaPuro,
  amb: Ambiente,
): Result<EfetivoPorFuncao[], ErroDeDominio> {
  const linhas = repositorio.listaPassagensDaObra(amb.db, obraId);

  const porFuncao = new Map<
    FuncaoId,
    { termo: string; ordem: number; pessoas: Set<PessoaId> }
  >();

  for (const linha of linhas) {
    if (!intervaloCobreODia(linha.entrada, linha.saida, dia)) continue;
    const atual = porFuncao.get(linha.funcaoId) ?? {
      termo: linha.funcaoTermo,
      ordem: linha.funcaoOrdem,
      pessoas: new Set<PessoaId>(),
    };
    // Conjunto de pessoas, não contagem de linhas: quem tem duas passagens
    // vigentes no mesmo dia continua sendo uma pessoa (R3).
    atual.pessoas.add(linha.pessoaId);
    porFuncao.set(linha.funcaoId, atual);
  }

  const efetivo = [...porFuncao.entries()]
    .map(([funcaoId, dados]) => ({
      funcaoId,
      termo: dados.termo,
      ordem: dados.ordem,
      quantidade: dados.pessoas.size,
    }))
    // A ordem é a do cadastro de funções, não a de inserção: o bloco 5 tem
    // ordem de coluna estável entre um RDO e o seguinte.
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ funcaoId, termo, quantidade }) => ({ funcaoId, termo, quantidade }));

  return ok(efetivo);
}
