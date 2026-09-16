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
 *
 * O tipo de acesso é escolhido aqui (decisão 34.1), e o padrão é `encarregado`,
 * que é o convite do dia a dia. A escolha **não** é controle de acesso: o
 * servidor confere de novo que quem convida é engenheiro daquela obra, e
 * recusa qualquer valor fora dos dois.
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
        <label className="campo">
          <span>Tipo de acesso *</span>
          <select name="perfil" required defaultValue="encarregado">
            <option value="encarregado">Encarregado — lança o dia no canteiro</option>
            <option value="engenheiro">
              Engenheiro — fecha o dia, exporta o RDO e cadastra
            </option>
          </select>
        </label>
        <div className="linhaDeAcoes">
          <button className="botao" type="submit" disabled={enviando}>
            Gerar link de convite
          </button>
        </div>
      </form>

      {estado.erro === null ? null : (
        <p className="recado recado--erro" role="alert">
          <strong>Erro. </strong>
          {estado.erro}
        </p>
      )}

      {estado.link === null ? null : (
        <>
          <p className="recado recado--ok">
            Envie este link a quem vai entrar como <strong>{estado.perfil}</strong>. Ele
            vale por <strong>7 dias</strong> e serve <strong>uma vez só</strong>. Não será
            exibido de novo.
          </p>
          <code className={estilos.link}>{estado.link}</code>
        </>
      )}
    </>
  );
}
