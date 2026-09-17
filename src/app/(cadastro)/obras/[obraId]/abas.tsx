import Link from 'next/link';

/**
 * Navegação entre as telas de cadastro de uma obra.
 *
 * Na captura de 16/09 estes cinco destinos eram cinco botões brancos idênticos:
 * navegação desenhada como ação, sem nenhum indicar em qual deles se estava.
 * Aqui viram abas, com o atual marcado por cor, peso e `aria-current`, e não só
 * por cor — quem não distingue as duas ainda precisa saber onde está.
 *
 * "Visão geral" entrou na frente porque a obra passa a abrir em estado, e não
 * em formulário; as outras cinco são configuração, que se mexe uma vez.
 */

export type AbaDaObra =
  'visao' | 'pessoal' | 'equipamento' | 'servicos' | 'taxonomia' | 'acesso';

const ABAS: ReadonlyArray<readonly [AbaDaObra, string, string]> = [
  ['visao', '', 'Visão geral'],
  ['pessoal', '/pessoal', 'Pessoal'],
  ['equipamento', '/equipamento', 'Equipamentos'],
  ['servicos', '/servicos', 'Serviços controlados'],
  ['taxonomia', '/taxonomia', 'Listas'],
  ['acesso', '/acesso', 'Acesso'],
];

export function AbasDaObra({
  obraId,
  atual,
}: {
  readonly obraId: string;
  readonly atual: AbaDaObra;
}) {
  return (
    <nav className="abas" aria-label="Seções da obra">
      {ABAS.map(([chave, sufixo, rotulo]) => {
        const ativa = chave === atual;
        return (
          <Link
            key={chave}
            className={ativa ? 'aba aba--ativa' : 'aba'}
            href={`/obras/${obraId}${sufixo}`}
            aria-current={ativa ? 'page' : undefined}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
