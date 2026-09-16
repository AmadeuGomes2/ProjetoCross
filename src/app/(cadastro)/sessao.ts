/**
 * Sessão das telas de cadastro.
 *
 * O conteúdo mudou de lugar: mora em `src/app/_composicao/sessao.ts`, porque as
 * telas de lançamento e a rota do PDF precisam do mesmo portador e duas cópias
 * do mesmo leitor de cookie são duas verdades sobre quem está na requisição.
 * Este arquivo continua existindo para não reescrever o import de oito páginas.
 */

export {
  apagaCookieDeSessao,
  atorDaRequisicao,
  gravaCookieDeSessao,
} from '../_composicao/sessao';
