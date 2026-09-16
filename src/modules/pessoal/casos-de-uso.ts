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
 */

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
export function listaMobilizacao(
  obraId: ObraId,
  amb: Ambiente,
): Result<PessoaMobilizada[], ErroDeDominio> {
  const porPessoa = new Map<
    PessoaId,
    { funcaoId: FuncaoId; passagens: PassagemMobilizada[] }
  >();

  for (const linha of repositorio.listaPassagensDaObra(amb.db, obraId)) {
    const atual = porPessoa.get(linha.pessoaId) ?? {
      funcaoId: linha.funcaoId,
      passagens: [],
    };
    // Uma pessoa, várias passagens: é o que impede contar duas vezes quem sai
    // e volta (R3, caso obrigatório 8).
    atual.passagens.push({ entrada: linha.entrada, saida: linha.saida });
    porPessoa.set(linha.pessoaId, atual);
  }

  return ok(
    [...porPessoa.entries()].map(([pessoaId, dados]) => ({
      pessoaId,
      funcaoId: dados.funcaoId,
      passagens: dados.passagens,
    })),
  );
}
