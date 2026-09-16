/**
 * A tela do 404 do RDO diário. Decisão 36.1, de 16/09/2026.
 *
 * `/rdo/<obra>/2026-09-31` respondia **200** com "O mês 09/2026 não tem o dia
 * 31". O diagnóstico estava certo e o código, errado: o endereço nomeia um
 * documento que não existe e nunca vai existir, e 200 ensina navegador, robô e
 * cache a guardar o erro como se fosse página boa.
 *
 * ## Por que a frase aqui é a genérica
 *
 * A página de 404 do App Router **não recebe os parâmetros da rota** e não tem
 * como descobrir o dia pedido: nenhum cabeçalho carrega o caminho, e o boundary
 * precisa ser componente de servidor — verificado em 16/09/2026 contra o Next
 * 16.3.5, em que a versão `'use client'` com `usePathname` cai calada na página
 * de 404 padrão do framework. A frase específica continua existindo onde ela
 * pode ser montada: no `Result` que a borda do `rdo` devolve a quem consulta.
 *
 * Esta tela também aparece para endereço que não casa com a rota, e por isso a
 * frase serve aos dois casos. Nada daqui vira log, e o endereço não carrega
 * nome de pessoa: é id de obra e data (CLAUDE.md, Segurança).
 */

import type { ReactElement } from 'react';

import estilos from '../../../_componentes/rdo.module.css';

export default function RdoNaoEncontrado(): ReactElement {
  return (
    <main className={estilos.pagina}>
      <h1>RDO não encontrado</h1>
      <p className={estilos.erro}>
        Confira a data no endereço: ela precisa ser um dia que exista no calendário, no
        formato AAAA-MM-DD. Datas como 31/09 e 29/02 de ano não bissexto não existem.
      </p>
    </main>
  );
}
