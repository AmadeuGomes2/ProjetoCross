/**
 * Leitura dos argumentos de `npm run criar-engenheiro`.
 *
 * A regra que este arquivo trava é a que mais importa aqui: **a senha não vem
 * por argumento de linha de comando.** Argumento fica no histórico do shell e
 * na lista de processos — `ps` mostra a linha inteira de qualquer processo da
 * máquina —, e o que aparece ali não se apaga depois. Por isso `--senha` não é
 * "ignorado": é recusado, com a explicação, para ninguém achar que funcionou.
 *
 * Origem da expectativa: decisão 25.1 do PRD e o enunciado da tarefa que a
 * implementa. Não há nada aqui lido da implementação.
 */

import { EventEmitter } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { interpretaArgumentos, leSemEco } from './criar-engenheiro';

describe('argumentos do comando de instalação', () => {
  it('lê o nome e o e-mail nas duas formas de escrever a opção', () => {
    const comEspaco = interpretaArgumentos([
      '--email',
      'e1@exemplo.invalido',
      '--nome',
      'E1',
    ]);
    const comIgual = interpretaArgumentos(['--email=e1@exemplo.invalido', '--nome=E1']);

    expect(comEspaco.ok && comEspaco.valor).toEqual({
      email: 'e1@exemplo.invalido',
      nome: 'E1',
      forcar: false,
    });
    expect(comIgual.ok && comIgual.valor).toEqual({
      email: 'e1@exemplo.invalido',
      nome: 'E1',
      forcar: false,
    });
  });

  it('recusa a senha vinda por argumento, e diz por quê', () => {
    const resultado = interpretaArgumentos([
      '--email',
      'e1@exemplo.invalido',
      '--nome',
      'E1',
      '--senha',
      'nao-faca-isso',
    ]);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.erro.mensagem).toContain('histórico');
    // A mensagem de erro não repete o segredo que acabou de ser exposto.
    expect(resultado.erro.mensagem).not.toContain('nao-faca-isso');
  });

  it('exige o e-mail e o nome', () => {
    expect(interpretaArgumentos(['--nome', 'E1']).ok).toBe(false);
    expect(interpretaArgumentos(['--email', 'e1@exemplo.invalido']).ok).toBe(false);
  });

  it('só liga o forçar quando a opção explícita é passada', () => {
    const sem = interpretaArgumentos(['--email', 'e@x.invalido', '--nome', 'E']);
    const com = interpretaArgumentos([
      '--email',
      'e@x.invalido',
      '--nome',
      'E',
      '--forcar',
    ]);

    expect(sem.ok && sem.valor.forcar).toBe(false);
    expect(com.ok && com.valor.forcar).toBe(true);
  });

  it('recusa opção desconhecida em vez de ignorar em silêncio', () => {
    const resultado = interpretaArgumentos([
      '--email',
      'e@x.invalido',
      '--nome',
      'E',
      '--perfil',
      'administrador',
    ]);

    expect(resultado.ok).toBe(false);
  });
});

/**
 * A leitura sem eco, contra um terminal de mentira.
 *
 * O que está sob teste é a promessa que sustentou a escolha do prompt: **o que
 * é digitado não aparece na saída**. Sem isto, "não aparece na tela" seria só
 * um comentário. O terminal falso troca `process.stdin` por um emissor: não há
 * rede, nem relógio, nem arquivo — só a decisão de quem escreve na saída.
 */
describe('leitura da senha sem eco', () => {
  const stdinOriginal = process.stdin;
  const escritaOriginal = process.stderr.write.bind(process.stderr);

  afterEach(() => {
    Object.defineProperty(process, 'stdin', {
      value: stdinOriginal,
      configurable: true,
    });
    process.stderr.write = escritaOriginal;
  });

  /**
   * Um `process.stdin` de mentira. O molde é `tty.ReadStream`, que tem dezenas
   * de membros irrelevantes aqui; a conversão é explícita e mora só no teste.
   */
  function terminalFalso(): EventEmitter {
    const falso = new EventEmitter();
    Object.assign(falso, {
      isTTY: true,
      isRaw: false,
      setRawMode(bruto: boolean) {
        Object.assign(falso, { isRaw: bruto });
        return falso;
      },
      resume: () => falso,
      pause: () => falso,
      setEncoding: () => falso,
    });
    Object.defineProperty(process, 'stdin', { value: falso, configurable: true });
    return falso;
  }

  function capturaSaida(): { texto: () => string } {
    let acumulado = '';
    process.stderr.write = ((pedaco: string) => {
      acumulado += pedaco;
      return true;
    }) as typeof process.stderr.write;
    return { texto: () => acumulado };
  }

  it('devolve o que foi digitado e não escreve nada disso na saída', async () => {
    const terminal = terminalFalso();
    const saida = capturaSaida();

    const lida = leSemEco('Senha: ');
    terminal.emit('data', 'ponte-cavalo');
    terminal.emit('data', '\r');

    expect(await lida).toBe('ponte-cavalo');
    expect(saida.texto()).toContain('Senha: ');
    expect(saida.texto()).not.toContain('ponte-cavalo');
  });

  it('apaga o último caractere no backspace', async () => {
    const terminal = terminalFalso();
    capturaSaida();

    const lida = leSemEco('Senha: ');
    terminal.emit('data', 'abc\u007f\r');

    expect(await lida).toBe('ab');
  });

  it('devolve o terminal ao estado anterior ao terminar', async () => {
    const terminal = terminalFalso();
    capturaSaida();

    const lida = leSemEco('Senha: ');
    terminal.emit('data', 'x\r');
    await lida;

    expect((terminal as unknown as { isRaw: boolean }).isRaw).toBe(false);
    expect(terminal.listenerCount('data')).toBe(0);
  });
});
