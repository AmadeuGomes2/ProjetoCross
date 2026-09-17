/**
 * `npm run criar-engenheiro -- --email "..." --nome "..."`
 *
 * A primeira conta de engenheiro do sistema, criada fora da web (decisão 25.1).
 * Depois dela, quem já é engenheiro de alguma obra cria as outras obras, e o
 * encarregado entra por convite (14.0). Não existe cadastro público.
 *
 * Este arquivo é **borda**: lê argumentos, pede a senha, abre o banco, imprime
 * o resultado. A regra — o que é idempotente, quando recusar, o que é gravado —
 * mora em `src/modules/acesso/instalacao.ts`, testada sem terminal.
 *
 * ## A senha não é argumento
 *
 * `--senha` é recusado de propósito. O que vai na linha de comando fica no
 * histórico do shell, aparece na lista de processos (`ps` mostra a linha
 * inteira, para qualquer usuário da máquina) e sobra em log de CI. A senha é
 * lida por prompt **sem eco**, confirmada duas vezes, e não é escrita em lugar
 * nenhum: nem na tela, nem em log, nem em arquivo.
 *
 * Tudo que este comando imprime vai para `stderr`: `console.log` é proibido
 * pela regra do projeto, e a saída padrão fica livre para quem quiser encadear.
 */

import { fileURLToPath } from 'node:url';

import {
  criaContaDeEngenheiroDeInstalacao,
  type ComandoCriarEngenheiro,
} from '../modules/acesso';
import { geraId } from '../shared/id';
import { mensagemGenericaDeErro, registra } from '../shared/log';
import {
  CODIGO_ERRO,
  erro,
  erroDeEntrada,
  ok,
  type ErroDeEntrada,
  type Result,
} from '../shared/result';
import { carregaAmbienteLocal } from './ambiente-local';
import { criaBanco, type ConexaoRdo } from './index';

export interface OpcoesDoComando {
  readonly nome: string;
  readonly email: string;
  readonly forcar: boolean;
}

const USO =
  'Uso: npm run criar-engenheiro -- --email "voce@exemplo.com" --nome "Seu Nome" [--forcar]';

/** Aceita `--chave valor` e `--chave=valor`. Opção desconhecida é recusada. */
export function interpretaArgumentos(
  argumentos: readonly string[],
): Result<OpcoesDoComando, ErroDeEntrada> {
  let nome = '';
  let email = '';
  let forcar = false;

  for (let i = 0; i < argumentos.length; i += 1) {
    const bruto = argumentos[i] ?? '';
    const separador = bruto.indexOf('=');
    const chave = separador === -1 ? bruto : bruto.slice(0, separador);
    const colado = separador === -1 ? null : bruto.slice(separador + 1);

    const proximo = (): string => {
      if (colado !== null) return colado;
      i += 1;
      return argumentos[i] ?? '';
    };

    switch (chave) {
      case '--nome':
        nome = proximo();
        break;
      case '--email':
        email = proximo();
        break;
      case '--forcar':
        forcar = true;
        break;
      case '--senha':
      case '--password':
        // Recusar, e não ignorar: quem passou precisa saber que o segredo foi
        // exposto e que o comando não o usou. A mensagem NÃO repete o valor.
        return erro(
          erroDeEntrada(
            CODIGO_ERRO.VALOR_FORA_DA_LISTA,
            'A senha não vem por argumento: a linha de comando fica no histórico do shell e na lista de processos. ' +
              'Rode sem --senha; ela será pedida no terminal, sem aparecer na tela. ' +
              'Troque agora a senha que você acabou de digitar aí.',
            'senha',
          ),
        );
      default:
        return erro(
          erroDeEntrada(
            CODIGO_ERRO.VALOR_FORA_DA_LISTA,
            `Opção desconhecida: ${chave}. ${USO}`,
          ),
        );
    }
  }

  if (nome.trim() === '' || email.trim() === '') {
    return erro(
      erroDeEntrada(CODIGO_ERRO.CAMPO_OBRIGATORIO, `Informe --email e --nome. ${USO}`),
    );
  }

  return ok({ nome: nome.trim(), email: email.trim(), forcar });
}

/** As teclas que o leitor sem eco precisa distinguir, por código. */
const FIM_DE_TRANSMISSAO = '\u0004'; // Ctrl+D
const INTERRUPCAO = '\u0003'; // Ctrl+C
const APAGAR = '\u007f'; // Backspace da maioria dos terminais

/** Erro que o operador precisa ler inteiro: é instrução, não falha do sistema. */
class ErroDoOperador extends Error {}

function avisa(texto: string): void {
  process.stderr.write(`${texto}\n`);
}

/**
 * Lê uma linha do terminal **sem eco**.
 *
 * Exportada só para o teste: é a única parte do comando que precisa de um
 * terminal, e sem ela coberta a promessa "não aparece na tela" ficaria no
 * comentário.
 *
 * Nada do que for digitado aparece na tela nem fica na rolagem do terminal.
 * O modo bruto é restaurado ao estado anterior em qualquer saída, inclusive no
 * Ctrl+C, senão o terminal fica sem eco depois que o comando termina.
 */
export function leSemEco(pergunta: string): Promise<string> {
  return new Promise((resolve, rejeita) => {
    const entrada = process.stdin;
    const eraBruto = entrada.isRaw === true;
    let digitado = '';

    const aoDigitar = (pedaco: string): void => {
      for (const caractere of pedaco) {
        if (
          caractere === '\r' ||
          caractere === '\n' ||
          caractere === FIM_DE_TRANSMISSAO
        ) {
          encerra();
          resolve(digitado);
          return;
        }
        if (caractere === INTERRUPCAO) {
          encerra();
          rejeita(new ErroDoOperador('Cancelado. Nada foi criado.'));
          return;
        }
        if (caractere === APAGAR || caractere === '\b') {
          digitado = digitado.slice(0, -1);
          continue;
        }
        // Descarta os demais caracteres de controle, que não são senha.
        if (caractere >= ' ') digitado += caractere;
      }
    };

    function encerra(): void {
      entrada.off('data', aoDigitar);
      entrada.setRawMode(eraBruto);
      entrada.pause();
      process.stderr.write('\n');
    }

    process.stderr.write(pergunta);
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding('utf8');
    entrada.on('data', aoDigitar);
  });
}

/**
 * Pede a senha duas vezes e confere.
 *
 * Sem a confirmação, um erro de digitação criaria uma conta cuja senha ninguém
 * sabe — e, como o comando não reseta senha (idempotência segura), o conserto
 * seria mexer no banco à mão.
 */
async function pedeSenhaNoTerminal(): Promise<string> {
  // A verificação mora aqui, e não na entrada do comando, para que erro de
  // argumento seja reportado mesmo sem terminal: quem errou a opção merece
  // saber qual, e nada de secreto foi pedido ainda.
  if (process.stdin.isTTY !== true) {
    throw new ErroDoOperador(
      'Este comando precisa de um terminal interativo: a senha é digitada sem eco e não aceita entrada redirecionada.',
    );
  }

  const primeira = await leSemEco('Senha da conta (não aparece na tela): ');
  const segunda = await leSemEco('Repita a senha: ');
  if (primeira !== segunda) {
    throw new ErroDoOperador('As duas digitações não conferem. Nada foi criado.');
  }
  return primeira;
}

/**
 * O comando inteiro. Devolve o código de saída do processo.
 *
 * `pedeSenha` é injetado para que o teste do caso de uso não precise de
 * terminal (padroes-codigo, Testes: nada de sistema de arquivos, rede nem
 * relógio real).
 */
export async function executa(
  argumentos: readonly string[],
  pedeSenha: ComandoCriarEngenheiro['pedeSenha'] = pedeSenhaNoTerminal,
): Promise<number> {
  const opcoes = interpretaArgumentos(argumentos);
  if (!opcoes.ok) {
    avisa(opcoes.erro.mensagem);
    return 1;
  }

  // A conexão abre **dentro** do `try`: se o caminho do banco estiver errado,
  // o erro vira mensagem genérica com identificador, e não rastro de pilha.
  let conexao: ConexaoRdo | null = null;
  try {
    carregaAmbienteLocal();
    conexao = criaBanco();
    const resultado = await criaContaDeEngenheiroDeInstalacao(
      {
        nome: opcoes.valor.nome,
        email: opcoes.valor.email,
        mesmoComEngenheiroExistente: opcoes.valor.forcar,
        pedeSenha,
      },
      { db: conexao.db, relogio: () => new Date() },
    );

    if (!resultado.ok) {
      avisa(resultado.erro.mensagem);
      return 1;
    }
    if (resultado.valor.situacao === 'conta_ja_existia') {
      // Nem cria outra conta, nem reseta a senha da que existe.
      avisa('Já existe conta com esse e-mail. Nada foi alterado.');
      return 0;
    }

    // Id, nunca nome nem e-mail (CLAUDE.md, Segurança).
    avisa(`Conta de engenheiro criada: ${resultado.valor.usuarioId}`);
    avisa('Entre em /entrar com esse e-mail e a senha que você digitou.');
    return 0;
  } catch (falha: unknown) {
    if (falha instanceof ErroDoOperador) {
      avisa(falha.message);
      return 1;
    }
    // Inesperado: o detalhe vai para o log com identificador de correlação, e
    // o terminal recebe a mensagem genérica. Nunca rastro de pilha.
    const correlacaoId = geraId<'correlacao'>();
    // A causa não vira texto no log: `ContextoDeLog` não tem campo livre, e a
    // mensagem de um erro de driver costuma citar o valor da linha lida. O que
    // identifica o caso é o nome do erro, no nome do evento.
    registra(
      'erro',
      correlacaoId,
      falha instanceof Error
        ? `acesso.instalacao_falhou.${falha.name}`
        : 'acesso.instalacao_falhou',
      { codigo: CODIGO_ERRO.FALHA_INESPERADA },
    );
    avisa(mensagemGenericaDeErro(correlacaoId));
    // Pista sem vazamento: a falha mais provável na instalação é rodar este
    // comando antes de o banco existir, e a mensagem genérica sozinha manda o
    // operador procurar no lugar errado.
    avisa('Se o banco ainda não foi preparado, rode antes: npm run db:preparar');
    return 1;
  } finally {
    conexao?.fecha();
  }
}

/**
 * Ponto de entrada da linha de comando.
 *
 * Só dispara quando este arquivo é executado direto, nunca quando é importado
 * por um teste — a mesma guarda de `seed.ts`. Sem ela, importar o módulo
 * criaria conta no banco de verdade no meio de uma suíte.
 */
const esteArquivo = fileURLToPath(import.meta.url);

if (process.argv[1] === esteArquivo) {
  // Sem `await` de topo: o `tsx` roda este arquivo como CommonJS, e ali o
  // `await` de topo não existe. A promessa é encadeada, e o `catch` final
  // garante que nenhuma falha suma em silêncio.
  void executa(process.argv.slice(2)).then(
    (codigo) => {
      process.exitCode = codigo;
    },
    () => {
      avisa('Não foi possível concluir. Tente de novo.');
      process.exitCode = 1;
    },
  );
}
