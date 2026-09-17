'use client';

import { useMemo, useState } from 'react';

import { diaDaSemana, formataBr, somaDias, type DiaPuro } from '../../../shared/date/dia';
import estilos from './periodo.module.css';

/**
 * Onde o engenheiro escolhe os dias do RDO de período.
 *
 * Quatro caminhos, porque são quatro perguntas diferentes: **esta semana**,
 * **este mês**, um **intervalo**, ou **dias avulsos** marcados a dedo. O quarto
 * é o que obrigou o sistema inteiro a tratar o pedido como **conjunto**, e não
 * como intervalo: 02, 05 e 09 não são contíguos, e um par `inicial`/`final`
 * teria somado os dias do meio sem ninguém perceber.
 *
 * É cliente porque a escolha é interativa e o pedido vai por `fetch`. **Nenhuma
 * regra mora aqui**: o servidor normaliza o conjunto de novo, recusa dia fora
 * do contrato e verifica o perfil. O que esta tela faz é montar o pedido e
 * baixar o arquivo.
 *
 * O envio é `POST` com o conjunto no corpo, e não `GET` com `?dias=`: trinta
 * datas numa URL entram em log de servidor, em histórico e em `referrer`.
 */

type Modo = 'consolidado' | 'diarios' | 'consolidado-com-diarios';
type Formato = 'PDF' | 'XLSX';

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

/** `2026-09-08` vira `Setembro de 2026`. Lê o texto, nunca constrói um `Date`. */
function NOME_DO_MES(dia: string): string {
  const mes = Number(dia.slice(5, 7));
  return `${MESES[mes - 1] ?? dia.slice(5, 7)} de ${dia.slice(0, 4)}`;
}

const ROTULO_DO_MODO: Readonly<Record<Modo, string>> = {
  consolidado: 'Só o consolidado',
  diarios: 'Só os diários, um por dia',
  'consolidado-com-diarios': 'Consolidado com os diários anexados',
};

function diasDoIntervalo(de: string, ate: string): string[] {
  if (de === '' || ate === '' || ate < de) return [];
  const dias: string[] = [];
  let atual = de;
  // Freio do navegador. O teto de verdade é do servidor, em
  // `rdo/borda/esquemas-de-periodo.ts`, que recusa acima de 366 dias; este
  // laço só evita travar a aba antes de o pedido sequer sair.
  for (let passo = 0; passo < 400 && atual <= ate; passo += 1) {
    dias.push(atual);
    atual = somaDias(atual, 1);
  }
  return dias;
}

export function SeletorDePeriodo({
  obraId,
  hoje,
}: {
  readonly obraId: string;
  /** Resolvido no fuso da obra, pelo servidor. Nunca pelo relógio do navegador. */
  readonly hoje: DiaPuro;
}) {
  /*
   * Texto cru, e não `DiaPuro`: o campo de data devolve o que o usuário
   * digitou, e a marca pertence a quem validou. Quem valida é o servidor, em
   * `leiaPedidoDeExportacao` — fingir a marca aqui com `as` esconderia que
   * este valor ainda não passou por validação nenhuma.
   */
  const [de, setDe] = useState<string>(() => somaDias(hoje, -6));
  const [ate, setAte] = useState<string>(hoje);
  const [avulsos, setAvulsos] = useState<readonly string[]>([]);
  const [usaAvulsos, setUsaAvulsos] = useState(false);
  const [modo, setModo] = useState<Modo>('consolidado-com-diarios');
  const [formato, setFormato] = useState<Formato>('PDF');
  const [enviando, setEnviando] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);

  /**
   * Os últimos 45 dias, **agrupados por mês**.
   *
   * O agrupamento não é enfeite: sem ele a grade mostra `04 05 … 31 01 02 …`, e
   * o `08` aparece duas vezes sem nada dizer se é agosto ou setembro. Quem
   * escolhe o dia errado exporta o RDO errado, e isso vira medição errada.
   */
  const meses = useMemo(() => {
    const dias = Array.from({ length: 45 }, (_, passo) => somaDias(hoje, -(44 - passo)));
    const grupos: { chave: string; rotulo: string; dias: string[] }[] = [];
    for (const dia of dias) {
      const chave = dia.slice(0, 7);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo === undefined || ultimo.chave !== chave) {
        grupos.push({ chave, rotulo: NOME_DO_MES(dia), dias: [dia] });
      } else {
        ultimo.dias.push(dia);
      }
    }
    return grupos;
  }, [hoje]);

  const escolhidos = usaAvulsos ? [...avulsos].sort() : diasDoIntervalo(de, ate);

  function alterna(dia: string) {
    setAvulsos((antes) =>
      antes.includes(dia) ? antes.filter((d) => d !== dia) : [...antes, dia],
    );
  }

  async function exporta() {
    setRecado(null);
    setEnviando(true);
    try {
      const resposta = await fetch(`/rdo/${obraId}/periodo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dias: escolhidos, modo, formato }),
      });

      if (!resposta.ok) {
        const corpo: unknown = await resposta.json().catch(() => null);
        const mensagem =
          typeof corpo === 'object' && corpo !== null && 'erro' in corpo
            ? String((corpo as { erro: unknown }).erro)
            : 'Não foi possível exportar.';
        setRecado(mensagem);
        return;
      }

      // O navegador não baixa resposta de `fetch` sozinho: o arquivo vira um
      // endereço temporário, que se solta logo depois para não vazar memória.
      const arquivo = await resposta.blob();
      const endereco = URL.createObjectURL(arquivo);
      const elo = document.createElement('a');
      elo.href = endereco;
      elo.download =
        resposta.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ??
        'rdo-do-periodo';
      elo.click();
      URL.revokeObjectURL(endereco);
      setRecado(`${escolhidos.length} dia(s) exportados.`);
    } catch {
      setRecado('A rede falhou no meio do envio. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="cartao">
      <div className="cabecalhoDoBloco">
        <h2>Exportar um período</h2>
        <p className="subtitulo">
          Uma semana, um mês, um intervalo, ou dias avulsos marcados a dedo.
        </p>
      </div>

      <div className={estilos.atalhos}>
        <button
          type="button"
          className="botao botao--secundario"
          onClick={() => {
            setUsaAvulsos(false);
            setDe(somaDias(hoje, -6));
            setAte(hoje);
          }}
        >
          Últimos 7 dias
        </button>
        <button
          type="button"
          className="botao botao--secundario"
          onClick={() => {
            setUsaAvulsos(false);
            setDe(somaDias(hoje, -29));
            setAte(hoje);
          }}
        >
          Últimos 30 dias
        </button>
        <button
          type="button"
          className={usaAvulsos ? 'botao' : 'botao botao--secundario'}
          onClick={() => setUsaAvulsos((antes) => !antes)}
          aria-pressed={usaAvulsos}
        >
          Escolher dias a dedo
        </button>
      </div>

      {usaAvulsos ? (
        <fieldset className={estilos.calendario}>
          <legend className="rotulo">Dias escolhidos</legend>
          {meses.map((mes) => (
            <div key={mes.chave} className={estilos.mes}>
              <p className={estilos.mesRotulo}>{mes.rotulo}</p>
              <div className={estilos.grade}>
                {mes.dias.map((dia) => {
                  const marcado = avulsos.includes(dia);
                  return (
                    <label
                      key={dia}
                      className={
                        marcado ? `${estilos.dia} ${estilos.diaMarcado}` : estilos.dia
                      }
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alterna(dia)}
                        className="apenasLeitorDeTela"
                      />
                      <span aria-hidden="true">{dia.slice(8)}</span>
                      {/* O leitor de tela recebe a data inteira, sempre. */}
                      <span className="apenasLeitorDeTela">
                        {diaDaSemana(dia)}, {formataBr(dia)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>
      ) : (
        <div className="grade grade--dupla">
          <label className="campo">
            <span>De</span>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          </label>
          <label className="campo">
            <span>Até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
          </label>
        </div>
      )}

      <label className="campo">
        <span>O que exportar</span>
        <select value={modo} onChange={(e) => setModo(e.target.value as Modo)}>
          {(Object.keys(ROTULO_DO_MODO) as Modo[]).map((chave) => (
            <option key={chave} value={chave}>
              {ROTULO_DO_MODO[chave]}
            </option>
          ))}
        </select>
      </label>

      <label className="campo">
        <span>Formato</span>
        <select value={formato} onChange={(e) => setFormato(e.target.value as Formato)}>
          <option value="PDF">PDF — o que o fiscal recebe</option>
          <option value="XLSX">Excel — para somar por conta própria</option>
        </select>
      </label>

      {recado === null ? null : (
        <p className="recado" role="status">
          {recado}
        </p>
      )}

      {/*
        No modo avulso a contagem NÃO diz "primeiro a último": {02, 08, 11}
        sairia como "02/09 a 11/09" e afirmaria dez dias onde há três. É o
        mesmo erro que fez a faixa ser recusada no documento, e não faria
        sentido corrigi-lo no papel e deixá-lo na tela que monta o pedido.
      */}
      <p className={estilos.contagem}>
        {escolhidos.length === 0
          ? 'Nenhum dia escolhido.'
          : usaAvulsos
            ? `${escolhidos.length} dia(s): ${escolhidos.map((d) => formataBr(d)).join(', ')}`
            : `${escolhidos.length} dia(s): ${formataBr(escolhidos[0] ?? '')} a ${formataBr(
                escolhidos[escolhidos.length - 1] ?? '',
              )}`}
      </p>

      <div className="linhaDeAcoes">
        <button
          className="botao"
          type="button"
          onClick={() => void exporta()}
          disabled={enviando || escolhidos.length === 0}
          aria-busy={enviando}
        >
          {enviando ? 'Gerando…' : 'Exportar'}
        </button>
      </div>
    </section>
  );
}
