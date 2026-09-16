'use client';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import {
  armazenamentoDoNavegador,
  criaLojaDeRascunhos,
  type LojaDeRascunhos,
} from '../../../modules/lancamento/rascunho';
import { lancaAtividade, type RespostaDaAcao } from '../acoes';
import estilos from '../estilos.module.css';

export interface StatusNaTela {
  readonly id: string;
  readonly termo: string;
}

export interface AtividadeNaTela {
  readonly id: string;
  readonly descricao: string;
  readonly statusTermo: string;
}

function enviaPeloServidor(loja: LojaDeRascunhos) {
  return loja.enviaPendentes((rascunho) =>
    lancaAtividade({
      obraId: rascunho.obraId,
      data: rascunho.data,
      descricao: rascunho.descricao,
      status: { tipo: 'id', id: rascunho.statusId },
      chaveDeRascunho: rascunho.chave,
    }).then((r) =>
      r.ok
        ? ({ ok: true } as const)
        : ({ ok: false, erro: { mensagem: r.mensagem } } as const),
    ),
  );
}

/**
 * Lançar atividade no canteiro.
 *
 * Duas regras de campo que valem mais que o resto:
 *
 * 1. **O que foi digitado não se perde.** O rascunho vai para o armazenamento
 *    local ANTES do envio, e só sai de lá quando o servidor aceita (16.1).
 *    Recusa do servidor mantém o rascunho na tela, com a mensagem.
 * 2. **Status é escolha de lista**, nunca texto solto: é referência à taxonomia
 *    e é o que impede a lista de status ganhar gêmeos.
 */
export function FormularioDeAtividade({
  obraId,
  data,
  status,
  jaLancadas,
  diaParado,
  diaFechado,
}: {
  readonly obraId: string;
  readonly data: string;
  readonly status: readonly StatusNaTela[];
  readonly jaLancadas: readonly AtividadeNaTela[];
  readonly diaParado: boolean;
  readonly diaFechado: boolean;
}) {
  const loja = useMemo(() => criaLojaDeRascunhos(armazenamentoDoNavegador()), []);
  const pendentes = useSyncExternalStore(
    loja.assina,
    () => loja.instantaneo(obraId, data),
    loja.instantaneoDoServidor,
  );
  const [descricao, setDescricao] = useState('');
  const [statusId, setStatusId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<RespostaDaAcao | null>(null);

  useEffect(() => {
    // A rede voltou: manda o que ficou para trás, sem pedir nada ao usuário.
    const aoVoltarARede = () => void enviaPeloServidor(loja);
    globalThis.addEventListener?.('online', aoVoltarARede);
    return () => globalThis.removeEventListener?.('online', aoVoltarARede);
  }, [loja]);

  async function enviar() {
    const chave = globalThis.crypto.randomUUID();
    const escolhido = status.find((s) => s.id === statusId);
    loja.guarda({
      chave,
      obraId,
      data,
      descricao,
      statusId,
      statusTermo: escolhido?.termo ?? '',
    });
    setEnviando(true);
    try {
      const r = await lancaAtividade({
        obraId,
        data,
        descricao,
        status: { tipo: 'id', id: statusId },
        chaveDeRascunho: chave,
      });
      setResposta(r);
      if (r.ok) {
        loja.remove(chave);
        setDescricao('');
        setStatusId('');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (diaParado) {
    return (
      <p className={estilos.recado}>
        Este dia está marcado como parado e não aceita atividade. Se houve trabalho, mude
        o estado do dia primeiro.
      </p>
    );
  }

  return (
    <div className={estilos.pilha}>
      {jaLancadas.length === 0 && pendentes.length === 0 ? (
        <p className={estilos.vazio}>
          Nenhuma atividade neste dia ainda. Descreva a primeira abaixo e escolha o
          status.
        </p>
      ) : null}

      {jaLancadas.length === 0 ? null : (
        <ul className={estilos.listaDeItens}>
          {jaLancadas.map((atividade) => (
            <li key={atividade.id} className={estilos.item}>
              {atividade.descricao}
              <span className={estilos.itemStatus}>{atividade.statusTermo}</span>
            </li>
          ))}
        </ul>
      )}

      {pendentes.length === 0 ? null : (
        <ul className={estilos.listaDeItens}>
          {pendentes.map((rascunho) => (
            <li key={rascunho.chave} className={estilos.item}>
              {rascunho.descricao}
              <span className={estilos.itemStatus}>{rascunho.statusTermo}</span>
              <span className={estilos.naoEnviado}>não enviado</span>
              {rascunho.erro === null ? null : (
                <span className={estilos.itemStatus}>{rascunho.erro}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {diaFechado ? (
        <p className={estilos.recado}>
          O dia está fechado. A partir daqui, só o engenheiro retifica.
        </p>
      ) : (
        <section className={estilos.secao}>
          <label className={estilos.rotulo} htmlFor="descricao">
            O que foi feito
          </label>
          <textarea
            id="descricao"
            className={estilos.campoTexto}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Fresagem da Rua A, estacas 10 a 14"
          />

          <label className={estilos.rotuloAfastado} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={estilos.campo}
            value={statusId}
            onChange={(e) => setStatusId(e.target.value)}
          >
            <option value="">Escolha…</option>
            {status.map((s) => (
              <option key={s.id} value={s.id}>
                {s.termo}
              </option>
            ))}
          </select>

          {resposta === null ? null : (
            <p
              className={`${estilos.afastado} ${
                resposta.ok ? estilos.recadoBom : estilos.recadoErro
              }`}
            >
              {resposta.ok ? 'Atividade lançada.' : resposta.mensagem}
            </p>
          )}

          <button
            type="button"
            className={`${estilos.botao} ${estilos.afastado}`}
            onClick={enviar}
            disabled={enviando || descricao.trim() === '' || statusId === ''}
          >
            {enviando ? 'Enviando…' : 'Lançar atividade'}
          </button>
        </section>
      )}
    </div>
  );
}
