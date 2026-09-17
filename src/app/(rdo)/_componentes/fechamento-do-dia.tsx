'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { fechaODia } from '../../(lancamento)/acoes';
import type { RespostaDaAcao } from '../../(lancamento)/acoes';

/**
 * Fechar o dia, na tela do RDO.
 *
 * **Isto faltava.** `fechaODia` existia, testado, desde a primeira fatia — e
 * nenhuma tela o chamava. O conceito de dia fechado atravessa o produto inteiro
 * (o painel da obra marca ✓, o número do RDO congela, a correção vira
 * retificação), mas **nenhum usuário conseguia fechar um dia**. Só era possível
 * chamando o caso de uso direto, como o semeador da demonstração faz.
 *
 * Fica na tela do RDO, e não na de lançamento, porque fechar é ato de quem
 * confere: o engenheiro olha o documento montado e o dá por entregue.
 *
 * **Só o engenheiro** (decisão 9.1). O componente nem aparece para o
 * encarregado, e o módulo recusa de novo — esconder botão não é controle de
 * acesso.
 *
 * Pede confirmação porque é **irreversível pela interface**: depois de fechado,
 * corrigir exige retificação, que deixa as duas versões no histórico. Um clique
 * sem pergunta num botão desses é arrependimento garantido.
 */
export function FechamentoDoDia({
  obraId,
  dia,
  ehEngenheiro,
  jaFechado,
}: {
  readonly obraId: string;
  readonly dia: string;
  readonly ehEngenheiro: boolean;
  readonly jaFechado: boolean;
}) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<RespostaDaAcao | null>(null);

  if (!ehEngenheiro) return null;

  if (jaFechado) {
    return (
      <span className="etiqueta etiqueta--neutra" title="Dia fechado e entregue">
        Dia fechado
      </span>
    );
  }

  async function fecha() {
    setEnviando(true);
    try {
      const r = await fechaODia({ obraId, data: dia });
      setResposta(r);
      // Recarrega os dados do servidor: o número do RDO congela ao fechar, e a
      // tela precisa passar a mostrar o congelado, não o calculado.
      if (r.ok) router.refresh();
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  if (!confirmando) {
    return (
      <button
        className="botao botao--secundario"
        type="button"
        onClick={() => setConfirmando(true)}
      >
        Fechar o dia
      </button>
    );
  }

  return (
    <span className="confirmacao">
      <span className="confirmacaoTexto">
        Fechar entrega este dia. Depois, corrigir exige retificação, e as duas versões
        ficam no histórico.
      </span>
      <button
        className="botao"
        type="button"
        onClick={() => void fecha()}
        disabled={enviando}
        aria-busy={enviando}
      >
        {enviando ? 'Fechando…' : 'Confirmar o fechamento'}
      </button>
      <button
        className="botao botao--secundario"
        type="button"
        onClick={() => setConfirmando(false)}
        disabled={enviando}
      >
        Cancelar
      </button>
      {resposta !== null && !resposta.ok && (
        <span className="recado recado--erro" role="alert">
          <strong>Erro. </strong>
          {resposta.mensagem}
        </span>
      )}
    </span>
  );
}
