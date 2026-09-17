/**
 * Peças de tela do cadastro.
 *
 * Nada aqui decide regra de negócio: se aparecer um `if` de domínio numa
 * página ou num componente, está no lugar errado (padroes-codigo, Estrutura de
 * pastas). O que existe aqui é rótulo, campo e aviso.
 *
 * As classes vêm de `globals.css`, o sistema visual do produto, e não de uma
 * folha própria do cadastro: o mesmo botão aparece em nove telas e precisa
 * mudar num lugar só. `estilos.module.css` ficou com o que é só daqui.
 *
 * Os três recados são diferentes de propósito:
 *
 * - `Erro` é recusa, e traz a palavra escrita além da cor e da borda, porque
 *   cor sozinha não comunica (CLAUDE.md, e a revisão de layout de 16/09/2026);
 * - `Aviso` é o que pode dar errado depois — falta de dado, efeito colateral;
 * - `Nota` é explicação, sem alarme nenhum;
 * - `Vazio` é lista sem nada, e diz o PRÓXIMO PASSO, não "nenhum registro".
 *
 * Navegação não mora aqui: onde se está e como se volta é `Trilha`, em
 * `src/app/_componentes/casca.tsx`. O `Voltar` avulso que existia aqui foi
 * removido em 16/09/2026 — ele dava um degrau só, e a captura de tela mostrou
 * que quem entrava fundo não tinha caminho de volta visível.
 */

import type { ReactNode } from 'react';

import estilos from './estilos.module.css';

export function Campo({
  nome,
  rotulo,
  tipo = 'text',
  obrigatorio = false,
  valorInicial,
  dica,
}: {
  nome: string;
  rotulo: string;
  tipo?: 'text' | 'date' | 'number' | 'email' | 'password';
  obrigatorio?: boolean;
  /** Aceita `undefined` de propósito: campo de tela vem vazio com frequência. */
  valorInicial?: string | undefined;
  dica?: string | undefined;
}) {
  return (
    <label className="campo">
      <span>
        {rotulo}
        {obrigatorio ? ' *' : ''}
      </span>
      <input
        name={nome}
        type={tipo}
        required={obrigatorio}
        defaultValue={valorInicial}
        // `inputMode` decimal abre o teclado numérico do celular com vírgula.
        inputMode={tipo === 'number' ? 'decimal' : undefined}
        placeholder={dica}
      />
    </label>
  );
}

export function Escolha({
  nome,
  rotulo,
  opcoes,
  obrigatorio = false,
}: {
  nome: string;
  rotulo: string;
  opcoes: readonly string[];
  obrigatorio?: boolean;
}) {
  return (
    <label className="campo">
      <span>
        {rotulo}
        {obrigatorio ? ' *' : ''}
      </span>
      <select name={nome} required={obrigatorio} defaultValue="">
        <option value="" disabled>
          Escolha…
        </option>
        {opcoes.map((opcao) => (
          <option key={opcao} value={opcao}>
            {opcao}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Mensagem de erro vinda da ação.
 *
 * Mostra o texto que o módulo devolveu, que é escrito para quem vai agir.
 * Nunca rastro de pilha e nunca nome de pessoa: o texto sai de `ErroDeDominio`
 * e de `ErroDeEntrada`, que não os carregam (CLAUDE.md, Segurança).
 */
export function Erro({ mensagem }: { mensagem?: string | undefined }) {
  if (mensagem === undefined || mensagem === '') return null;
  return (
    <p className="recado recado--erro" role="alert">
      <strong>Erro. </strong>
      {mensagem}
    </p>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return <p className="recado recado--aviso">{children}</p>;
}

export function Nota({ children }: { children: ReactNode }) {
  return <p className="recado">{children}</p>;
}

/** Lista sem nada. A frase diz o que fazer para que deixe de estar vazia. */
export function Vazio({ children }: { children: ReactNode }) {
  return <p className="vazio">{children}</p>;
}

export function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="cartao">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

export { estilos };
