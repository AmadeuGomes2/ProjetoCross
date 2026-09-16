'use client';

import { useState } from 'react';

import { lancaObservacao, type RespostaDaAcao } from '../acoes';
import estilos from '../estilos.module.css';

/**
 * Observação da contratada — a fonte do bloco `COMENTÁRIOS CROS`.
 *
 * Na planilha legada esse bloco lia a aba do contratante e por isso nunca
 * mostrou nada. Aqui cada bloco lê a sua própria fonte, e o lado do contratante
 * não recebe lançamento na v1 (10.1): ele aparece no documento e sai vazio.
 */
export function FormularioDeObservacao({
  obraId,
  data,
  jaLancadas,
  diaFechado,
}: {
  readonly obraId: string;
  readonly data: string;
  readonly jaLancadas: readonly { readonly id: string; readonly texto: string }[];
  readonly diaFechado: boolean;
}) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<RespostaDaAcao | null>(null);

  async function enviar() {
    setEnviando(true);
    try {
      const r = await lancaObservacao({ obraId, data, lado: 'CROS', texto });
      setResposta(r);
      if (r.ok) setTexto('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className={estilos.pilha}>
      {jaLancadas.length === 0 ? (
        <p className={estilos.vazio}>
          Nenhuma observação neste dia. Escreva abaixo o que o fiscal precisa saber; é o
          bloco COMENTÁRIOS CROS do RDO.
        </p>
      ) : (
        <ul className={estilos.listaDeItens}>
          {jaLancadas.map((observacao) => (
            <li key={observacao.id} className={estilos.item}>
              {observacao.texto}
            </li>
          ))}
        </ul>
      )}

      {diaFechado ? (
        <p className={estilos.recado}>
          O dia está fechado. A partir daqui, só o engenheiro retifica.
        </p>
      ) : (
        <>
          <label className={estilos.rotulo} htmlFor="observacao">
            Observação da CROS
          </label>
          <textarea
            id="observacao"
            className={estilos.campoTexto}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Frente da Rua A liberada pela fiscalização às 9h"
          />

          {resposta === null ? null : (
            <p className={resposta.ok ? estilos.recadoBom : estilos.recadoErro}>
              {resposta.ok ? 'Observação lançada.' : resposta.mensagem}
            </p>
          )}

          <button
            type="button"
            className={estilos.botao}
            onClick={enviar}
            disabled={enviando || texto.trim() === ''}
          >
            {enviando ? 'Enviando…' : 'Lançar observação'}
          </button>
        </>
      )}
    </div>
  );
}
