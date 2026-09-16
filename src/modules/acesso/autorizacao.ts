/**
 * Autorização: este ator pode isto, nesta obra?
 *
 * docs/arquitetura/v1.md, 5.2. A verificação **lê a tabela `acesso` em toda
 * chamada**, sem cache e sem confiar em nada que veio do navegador. Guardar o
 * perfil na sessão ou no cookie faria a revogação valer só no próximo login,
 * e o CT-081 exige que valha na requisição seguinte.
 *
 * Obra inexistente e obra sem acesso devolvem o **mesmo** erro, com a mesma
 * mensagem: a resposta não pode diferenciar "não existe" de "não é sua"
 * (CT-075), senão a listagem de obras alheias sai por dedução.
 */

import { CODIGO_ERRO, erro, erroDeAcesso, ok, type Result } from '../../shared/result';
import type { ErroDeAcesso } from '../../shared/result';
import { geraId, idConfiavel, type ObraId } from '../../shared/id';
import { registra } from '../../shared/log';
import * as repositorio from './repositorio';
import {
  perfilAtende,
  type Ambiente,
  type Ator,
  type AtorNaObra,
  type Perfil,
  type PortadorDeAcesso,
} from './tipos';

/** Uma frase só, para os dois motivos. Não revela existência de obra. */
function recusa(): ErroDeAcesso {
  return erroDeAcesso(
    CODIGO_ERRO.SEM_PERMISSAO,
    'Você não tem acesso a esta obra ou a esta ação.',
  );
}

/**
 * A porta que as frentes B e C chamam antes de qualquer caso de uso.
 *
 * `perfilMinimo` é `'encarregado'` quando os dois perfis podem, e
 * `'engenheiro'` quando só o engenheiro pode. Com dois perfis, isso diz
 * exatamente o que a tabela "Quem usa" do PRD diz, e não precisa ser mantido
 * em dois lugares.
 *
 * Devolve `AtorNaObra`, que é o tipo que os casos de uso protegidos exigem:
 * quem não chamou esta função não tem como fabricar o argumento.
 */
export function exigeAcessoNaObra(
  ator: PortadorDeAcesso,
  obraId: ObraId,
  perfilMinimo: Perfil,
  amb: Ambiente,
): Result<AtorNaObra, ErroDeAcesso> {
  const linha = repositorio.buscaAcessoAtivo(amb.db, ator.usuarioId, obraId);

  if (linha === null || !perfilAtende(linha.perfil, perfilMinimo)) {
    registra('aviso', geraId<'correlacao'>(), 'acesso.recusado', {
      usuarioId: ator.usuarioId,
      obraId,
      codigo: CODIGO_ERRO.SEM_PERMISSAO,
    });
    return erro(recusa());
  }

  return ok({ usuarioId: ator.usuarioId, obraId, perfil: linha.perfil });
}

/**
 * Criar obra é o único ato do sistema que não tem obra para verificar.
 *
 * **Decisão 25.1, de 16/09/2026: só o engenheiro cria obra.** A pergunta é
 * sobre a **conta** — `usuario.e_engenheiro` —, e não sobre o perfil em alguma
 * obra: ser engenheiro é atributo da pessoa, que tem CREA e assina o documento
 * (bloco 11 do RDO), enquanto `acesso.perfil` diz o que ela pode fazer naquela
 * obra. Ganhar o perfil de engenheiro numa obra, por qualquer caminho, não
 * torna ninguém engenheiro para efeito de criar obra.
 *
 * A coluna nasce falsa e **dois caminhos a ligam**: o comando
 * `npm run criar-engenheiro`, de onde sai a primeira obra do sistema, e o
 * aceite de **convite de engenheiro** (decisão 34.1). Convite de encarregado
 * não liga nada, e não há cadastro público.
 *
 * O que estava aqui antes e saiu: uma exceção que liberava qualquer conta
 * enquanto o sistema inteiro não tivesse engenheiro nenhum. Funcionava, mas era
 * uma regra que ninguém lendo o código esperaria, escrita como consulta a
 * estado global — e qualquer rotina que um dia apague, arquive ou migre obras a
 * reabriria, sem que ninguém lembrasse que ela existe.
 */
export function exigePermissaoParaCriarObra(
  ator: Ator,
  amb: Ambiente,
): Result<Ator, ErroDeAcesso> {
  if (repositorio.eContaDeEngenheiro(amb.db, ator.usuarioId)) return ok(ator);

  registra('aviso', geraId<'correlacao'>(), 'acesso.criar_obra_recusado', {
    usuarioId: ator.usuarioId,
    codigo: CODIGO_ERRO.SEM_PERMISSAO,
  });
  return erro(recusa());
}

/**
 * Embrulho obrigatório dos manipuladores de rota.
 *
 * Regra de docs/arquitetura/v1.md, 5.2: **nenhum arquivo em
 * `src/app/**\/route.ts` exporta manipulador que não passe por aqui.** Quem
 * escrever a rota nova não tem como esquecer as duas primeiras linhas, porque
 * elas não estão na rota. O teste `rotas-protegidas.test.ts` varre a pasta.
 */
export interface ContextoDeRota {
  readonly params: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * O manipulador já recebe o ator resolvido. Recebe também os **parâmetros da
 * rota**, porque quem precisa do `obraId` costuma precisar do resto do caminho
 * — o dia do RDO, por exemplo. Sem isso o manipulador remontaria a URL na mão,
 * que é onde se erra o segmento.
 */
export type ManipuladorProtegido = (
  ator: AtorNaObra,
  requisicao: Request,
  params: ParametrosDeRota,
) => Promise<Response>;

export type ParametrosDeRota = Record<string, string | string[] | undefined>;

export function comAtorNaObra(
  perfilMinimo: Perfil,
  manipulador: ManipuladorProtegido,
  dependencias: {
    readonly autentica: (requisicao: Request) => Result<Ator, ErroDeAcesso>;
    readonly amb: () => Ambiente;
  },
): (requisicao: Request, contexto: ContextoDeRota) => Promise<Response> {
  return async (requisicao, contexto) => {
    const semAcesso = () => Response.json({ erro: recusa().mensagem }, { status: 403 });

    const atorOuErro = dependencias.autentica(requisicao);
    if (!atorOuErro.ok) {
      return Response.json({ erro: atorOuErro.erro.mensagem }, { status: 401 });
    }

    const params = await contexto.params;
    const bruto = params['obraId'];
    if (typeof bruto !== 'string' || bruto === '') return semAcesso();

    // O identificador vem da URL: é hostil. Não é validado como existente aqui
    // porque `exigeAcessoNaObra` já devolve o mesmo erro para obra inexistente
    // e para obra sem acesso — é o ponto do CT-075.
    const naObra = exigeAcessoNaObra(
      atorOuErro.valor,
      idConfiavel<'obra'>(bruto),
      perfilMinimo,
      dependencias.amb(),
    );
    if (!naObra.ok) return semAcesso();

    return manipulador(naObra.valor, requisicao, params);
  };
}
