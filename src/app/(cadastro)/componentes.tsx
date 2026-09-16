/**
 * Peças de tela do cadastro.
 *
 * Nada aqui decide regra de negócio: se aparecer um `if` de domínio numa
 * página ou num componente, está no lugar errado (padroes-codigo, Estrutura de
 * pastas). O que existe aqui é rótulo, campo e aviso.
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
    <label className={estilos.campo}>
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
    <label className={estilos.campo}>
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
    <p className={estilos.erro} role="alert">
      {mensagem}
    </p>
  );
}

export function Aviso({ children }: { children: ReactNode }) {
  return <p className={estilos.aviso}>{children}</p>;
}

export function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={estilos.bloco}>
      <h2 className={estilos.titulo}>{titulo}</h2>
      {children}
    </section>
  );
}

export { estilos };
