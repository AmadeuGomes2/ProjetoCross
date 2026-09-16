'use client';

import { useState } from 'react';

import { LETRAS_DE_TURNO, type LetraDeTurno } from '../../../shared/taxonomia';
import { confirmaODia, type RespostaDaAcao } from '../acoes';
import estilos from '../estilos.module.css';

type EstadoEscolhido = 'trabalhado' | 'parado';

export interface TurnosNaTela {
  readonly noiteAnterior: LetraDeTurno | null;
  readonly manha: LetraDeTurno | null;
  readonly tarde: LetraDeTurno | null;
}

const NOME_DO_TURNO = {
  noiteAnterior: 'Noite anterior',
  manha: 'Manhã',
  tarde: 'Tarde',
} as const;

type NomeDeTurno = keyof typeof NOME_DO_TURNO;

/** Ordem dos turnos na tela e no bloco 9 do documento. */
const TURNOS: readonly NomeDeTurno[] = ['noiteAnterior', 'manha', 'tarde'];

/**
 * A tela que resolve o dia comum em dois toques.
 *
 * O estado e os turnos chegam pré-preenchidos do dia anterior (15.1) — o que se
 * repete todo dia vem para CONFIRMAR, não para digitar. O índice em mm não vem
 * (CT-162): é medição, não hábito.
 *
 * As oito sugestões de motivo PREENCHEM o campo e não o fecham (20.1): o motivo
 * é texto livre obrigatório, e validar contra a lista seria defeito.
 */
export function FormularioDoDia({
  obraId,
  data,
  estadoInicial,
  turnosIniciais,
  sugestoesDeMotivo,
  diaFechado,
}: {
  readonly obraId: string;
  readonly data: string;
  readonly estadoInicial: EstadoEscolhido;
  readonly turnosIniciais: TurnosNaTela;
  readonly sugestoesDeMotivo: readonly string[];
  readonly diaFechado: boolean;
}) {
  const [estado, setEstado] = useState<EstadoEscolhido>(estadoInicial);
  const [motivo, setMotivo] = useState('');
  const [turnos, setTurnos] = useState<TurnosNaTela>(turnosIniciais);
  const [indice, setIndice] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resposta, setResposta] = useState<RespostaDaAcao | null>(null);

  function trocaTurno(qual: NomeDeTurno, letra: LetraDeTurno | null) {
    setTurnos((atuais) => ({ ...atuais, [qual]: letra }));
  }

  async function enviar() {
    setEnviando(true);
    try {
      setResposta(
        await confirmaODia({
          obraId,
          data,
          estado,
          motivoParada: estado === 'parado' ? motivo : null,
          noiteAnterior: turnos.noiteAnterior ?? '',
          manha: turnos.manha ?? '',
          tarde: turnos.tarde ?? '',
          indiceMm: indice,
        }),
      );
    } finally {
      setEnviando(false);
    }
  }

  if (diaFechado) {
    return (
      <p className={estilos.recado}>
        O dia está fechado. A partir daqui, só o engenheiro retifica, e as duas versões
        ficam no histórico.
      </p>
    );
  }

  return (
    <div className={estilos.pilha}>
      <section className={estilos.secao}>
        <h2 className={estilos.tituloDeSecao}>O dia foi</h2>
        <div className={estilos.grupoDeEscolha}>
          <button
            type="button"
            className={estado === 'trabalhado' ? estilos.escolhaMarcada : estilos.escolha}
            aria-pressed={estado === 'trabalhado'}
            onClick={() => setEstado('trabalhado')}
          >
            Trabalhado
          </button>
          <button
            type="button"
            className={estado === 'parado' ? estilos.escolhaMarcada : estilos.escolha}
            aria-pressed={estado === 'parado'}
            onClick={() => setEstado('parado')}
          >
            Parado
          </button>
        </div>
      </section>

      {estado === 'parado' ? (
        <section className={estilos.secao}>
          <label className={estilos.rotulo} htmlFor="motivo">
            Motivo da parada
          </label>
          <input
            id="motivo"
            className={estilos.campo}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Escreva o motivo"
            autoComplete="off"
          />
          <div className={estilos.sugestoes}>
            {sugestoesDeMotivo.map((sugestao) => (
              <button
                key={sugestao}
                type="button"
                className={estilos.sugestao}
                onClick={() => setMotivo(sugestao)}
              >
                {sugestao}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={estilos.secao}>
        <h2 className={estilos.tituloDeSecao}>Tempo por turno</h2>
        {TURNOS.map((qual) => (
          <div key={qual} className={estilos.turno}>
            <span className={estilos.rotulo}>{NOME_DO_TURNO[qual]}</span>
            <div className={estilos.grupoDeTurno}>
              {LETRAS_DE_TURNO.map((letra) => (
                <button
                  key={letra}
                  type="button"
                  className={
                    turnos[qual] === letra ? estilos.escolhaMarcada : estilos.escolha
                  }
                  aria-pressed={turnos[qual] === letra}
                  onClick={() => trocaTurno(qual, letra)}
                >
                  {letra}
                </button>
              ))}
              <button
                type="button"
                className={
                  turnos[qual] === null ? estilos.escolhaMarcada : estilos.escolha
                }
                aria-pressed={turnos[qual] === null}
                onClick={() => trocaTurno(qual, null)}
              >
                —
              </button>
            </div>
          </div>
        ))}
        <label className={estilos.rotulo} htmlFor="indice">
          Índice em mm
        </label>
        <input
          id="indice"
          className={estilos.campo}
          value={indice}
          onChange={(e) => setIndice(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          autoComplete="off"
        />
      </section>

      {resposta === null ? null : (
        <p className={resposta.ok ? estilos.recadoBom : estilos.recadoErro}>
          {resposta.ok ? 'Dia confirmado.' : resposta.mensagem}
        </p>
      )}

      <button
        type="button"
        className={estilos.botao}
        onClick={enviar}
        disabled={enviando}
      >
        {enviando ? 'Enviando…' : 'Confirmar o dia'}
      </button>
    </div>
  );
}
