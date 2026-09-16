'use client';

import { useState } from 'react';

import { lancaProducao, type RespostaDaAcao } from '../acoes';
import estilos from '../estilos.module.css';

export interface ServicoNaTela {
  readonly id: string;
  readonly nome: string;
}

/**
 * Produção do dia por serviço controlado.
 *
 * O serviço é escolhido de lista — casamento por referência ao cadastro, nunca
 * por igualdade de texto (R5). A quantidade aceita vírgula, porque é como se
 * digita em português, e mais de três casas é recusado em vez de arredondado:
 * arredondar calado é como se perde tonelada de asfalto na conta.
 *
 * Produção em dia parado ou sem atividade é ACEITA, e o aviso aparece depois
 * (12.1). Bloquear perderia o dado medido.
 */
export function FormularioDeProducao({
  obraId,
  data,
  servicos,
  diaFechado,
}: {
  readonly obraId: string;
  readonly data: string;
  readonly servicos: readonly ServicoNaTela[];
  readonly diaFechado: boolean;
}) {
  const [servicoId, setServicoId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<RespostaDaAcao | null>(null);

  async function enviar() {
    setEnviando(true);
    try {
      const r = await lancaProducao({
        obraId,
        data,
        servico: { tipo: 'id', id: servicoId },
        quantidade,
      });
      setResposta(r);
      if (r.ok) {
        setQuantidade('');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (diaFechado) {
    return (
      <p className={estilos.recado}>
        O dia está fechado. A partir daqui, só o engenheiro retifica.
      </p>
    );
  }

  return (
    <div className={estilos.pilha}>
      <label className={estilos.rotulo} htmlFor="servico">
        Serviço
      </label>
      <select
        id="servico"
        className={estilos.campo}
        value={servicoId}
        onChange={(e) => setServicoId(e.target.value)}
      >
        <option value="">Escolha…</option>
        {servicos.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nome}
          </option>
        ))}
      </select>

      <label className={estilos.rotuloAfastado} htmlFor="quantidade">
        Quantidade executada
      </label>
      <input
        id="quantidade"
        className={estilos.campo}
        value={quantidade}
        onChange={(e) => setQuantidade(e.target.value)}
        inputMode="decimal"
        placeholder="Ex.: 234,500"
        autoComplete="off"
      />

      {resposta === null ? null : (
        <p className={resposta.ok ? estilos.recadoBom : estilos.recadoErro}>
          {resposta.ok ? 'Produção lançada.' : resposta.mensagem}
        </p>
      )}
      {resposta?.avisos.map((aviso) => (
        <p key={aviso} className={estilos.recado}>
          {aviso}
        </p>
      ))}

      <button
        type="button"
        className={estilos.botao}
        onClick={enviar}
        disabled={enviando || servicoId === '' || quantidade.trim() === ''}
      >
        {enviando ? 'Enviando…' : 'Lançar produção'}
      </button>
    </div>
  );
}
