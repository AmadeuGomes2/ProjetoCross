'use client';

/**
 * Formulário do convite.
 *
 * É o único componente de cliente destas telas, e existe por uma razão de
 * segurança: o link precisa aparecer **na resposta da ação**, nunca na barra de
 * endereço. Token em URL cai no histórico do navegador e no log de acesso do
 * servidor, e o PRD é explícito em que o token não aparece em log, em mensagem
 * de erro, em URL registrada nem em histórico (CT-085).
 *
 * O link é exibido uma vez. Quem perder gera outro; não há reexibição, porque o
 * banco guarda só o hash.
 */

import { useActionState } from 'react';

import { gerarConviteAction } from '../../../acoes';
import { ESTADO_INICIAL_DO_CONVITE } from '../../../tipos-de-tela';
import estilos from '../../../estilos.module.css';

export function FormularioDeConvite({ obraId }: { obraId: string }) {
  const [estado, acao, enviando] = useActionState(
    gerarConviteAction,
    ESTADO_INICIAL_DO_CONVITE,
  );

  return (
    <>
      <form action={acao}>
        <input type="hidden" name="obraId" value={obraId} />
        <button className={estilos.botao} type="submit" disabled={enviando}>
          Gerar link de convite
        </button>
      </form>

      {estado.erro === null ? null : (
        <p className={estilos.erro} role="alert">
          {estado.erro}
        </p>
      )}

      {estado.link === null ? null : (
        <>
          <p>
            Envie este link ao encarregado. Ele vale por <strong>7 dias</strong> e serve{' '}
            <strong>uma vez só</strong>. Não será exibido de novo.
          </p>
          <code className={estilos.link}>{estado.link}</code>
        </>
      )}
    </>
  );
}
