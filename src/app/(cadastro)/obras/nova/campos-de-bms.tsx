/**
 * O primeiro período de BM'S, no formulário de criar obra.
 *
 * Decisão 21.1: ao menos um período é obrigatório na criação. Decisão 37.1:
 * **o formulário explica o que é BM'S**, porque quem encomendou o produto não
 * sabia, e o campo barra a criação da obra. A explicação é uma linha, em
 * português de quem lê o RDO impresso — sem "medição contratual", sem "ciclo"
 * e sem sigla que precise de outra explicação.
 *
 * Fica num componente próprio, e não solto na página, para que o texto esteja
 * sob teste: `campos-de-bms.test.ts`.
 */

import { Bloco, Campo, Nota } from '../../componentes';

export function BlocoDeBms() {
  return (
    <Bloco titulo="Primeiro período de BM'S">
      <Nota>
        BM&apos;S é o período de medição que agrupa os dias para faturamento. O número
        dele sai no cabeçalho de todo RDO.
      </Nota>
      <Nota>
        Toda obra nasce com ao menos um período. Depois é possível cadastrar quantos forem
        necessários; dia fora de qualquer período sai com o campo{' '}
        <strong>BM&apos;S</strong> vazio e aviso na tela.
      </Nota>
      <Campo nome="bmsNumero" rotulo="Número" tipo="number" obrigatorio />
      <div className="grade grade--dupla">
        <Campo nome="bmsInicio" rotulo="Data inicial" tipo="date" obrigatorio />
        <Campo nome="bmsFim" rotulo="Data final" tipo="date" obrigatorio />
      </div>
    </Bloco>
  );
}
