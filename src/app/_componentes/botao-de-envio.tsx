'use client';

import { useFormStatus } from 'react-dom';

/**
 * Botão de submissão que sabe que está enviando.
 *
 * As telas de lançamento já tinham retorno de ação, com estado próprio. As de
 * cadastro não tinham nenhum: o engenheiro apertava "Cadastrar período" e nada
 * indicava que algo havia acontecido até a página inteira recarregar. Em rede
 * ruim isso vira clique duplo, e clique duplo vira registro duplicado.
 *
 * `useFormStatus` lê o estado do `<form>` que envolve este botão, e por isso
 * funciona com Server Action sem que a página precise virar cliente. É o único
 * pedaço de cliente destas telas.
 *
 * O desabilitado **não é só opacidade**: ganha borda e fundo próprios. Na
 * captura de 16/09 o botão desabilitado era verde esmaecido sobre branco, e se
 * lia como botão normal, não como bloqueado.
 */
export function BotaoDeEnvio({
  children,
  enviando = 'Enviando…',
  variante,
}: {
  readonly children: string;
  /** O que dizer durante o envio. Diz o que está acontecendo, não "aguarde". */
  readonly enviando?: string;
  /** `campo` é o alvo alto do celular; `perigo` é a ação destrutiva. */
  readonly variante?: 'campo' | 'perigo';
}) {
  const { pending } = useFormStatus();
  const classe = variante === undefined ? 'botao' : `botao botao--${variante}`;

  return (
    <button className={classe} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? enviando : children}
    </button>
  );
}
