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
  ator: Ator,
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
 * Regra aplicada: quem já é **encarregado** de alguma obra e não é engenheiro
 * de nenhuma não cria obra (CT-012). Quem ainda não tem acesso nenhum cria —
 * sem isso a primeira obra do sistema nunca existiria.
 *
 * **Isto não está escrito no PRD**, que trata perfil sempre dentro de uma
 * obra. Está isolado nesta função de propósito: se a resposta for outra
 * (convite de engenheiro, papel de administrador), muda aqui e em nenhum outro
 * lugar. Ver relatório de entrega.
 */
export function exigePermissaoParaCriarObra(
  ator: Ator,
  amb: Ambiente,
): Result<Ator, ErroDeAcesso> {
  const acessos = repositorio.listaAcessosAtivosDoUsuario(amb.db, ator.usuarioId);
  const eEngenheiroDeAlguma = acessos.some((a) => a.perfil === 'engenheiro');
  const eEncarregadoDeAlguma = acessos.some((a) => a.perfil === 'encarregado');

  if (eEngenheiroDeAlguma || !eEncarregadoDeAlguma) return ok(ator);

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

export type ManipuladorProtegido = (
  ator: AtorNaObra,
  requisicao: Request,
) => Promise<Response>;

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

    return manipulador(naObra.valor, requisicao);
  };
}
