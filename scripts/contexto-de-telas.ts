/**
 * Descobre o contexto que a captura de telas precisa e abre as duas sessões.
 *
 * Imprime uma linha `RDO_CONTEXTO={...}` que `scripts/telas.mjs` consome pelo
 * ambiente. Separado do capturador porque este lado é TypeScript e fala com o
 * domínio, e aquele é um script de navegador.
 *
 * Não inventa dado: usa a obra e o dia que já existem no banco local. Se não
 * houver, diz o que rodar.
 */
import { ambienteDaComposicao } from '../src/app/_composicao/ambiente';
import { iniciaSessaoComSenha } from '../src/modules/acesso/autenticacao';

const CONTAS = {
  eng: ['engenheira@obra.local', 'Engenheira#2026'],
  enc: ['encarregado@obra.local', 'Encarregado#2026'],
} as const;

async function main(): Promise<void> {
  const composicao = ambienteDaComposicao();
  const amb = composicao.cadastro;
  const conexao = composicao.conexao;

  const obras = await conexao.consulta<{ id: string }>(
    'SELECT id FROM obra ORDER BY criado_em LIMIT 1',
  );
  const obra = obras[0];
  if (obra === undefined) {
    console.warn('Não há obra no banco. Rode a preparação do ambiente local antes.');
    process.exit(1);
  }

  /** O dia com mais lançamentos: é o que mostra a tela cheia. Depende da obra. */
  const dias = await conexao.consulta<{ data: string }>(
    `SELECT data, COUNT(*) AS n FROM lancamento_atividade
        WHERE obra_id = $1 GROUP BY data ORDER BY n DESC, data DESC LIMIT 1`,
    [obra.id],
  );
  const dia = dias[0];

  /** Um dia sem nada, para fotografar o estado vazio, que também é tela. */
  const diaVazio = '2026-09-20';

  const tokens: Record<string, string> = {};
  for (const [rotulo, [email, senha]] of Object.entries(CONTAS)) {
    const r = await iniciaSessaoComSenha(email, senha, amb);
    if (!r.ok) {
      console.warn(`Não consegui entrar como ${rotulo}: ${r.erro.codigo}`);
      process.exit(1);
    }
    tokens[rotulo] = r.valor.token;
  }

  console.warn(
    'RDO_CONTEXTO=' +
      JSON.stringify({
        obra: obra.id,
        dia: dia?.data ?? '2026-09-03',
        diaVazio,
        eng: tokens['eng'],
        enc: tokens['enc'],
      }),
  );
}

void main();
