/**
 * As portas que a frente C consome para montar o RDO diário.
 *
 * docs/arquitetura/v1.md, 4.7: `PortasDoRdo` declara cinco funções que saem
 * dos módulos desta frente — `cabecalho`, `bms`, `efetivoPessoal`,
 * `efetivoEquipamento` e `servicos`. Elas são declaradas **lá** e ligadas
 * **aqui**; nenhum módulo importa o outro.
 *
 * Duas coisas explícitas, para que ninguém descubra por acidente:
 *
 * 1. **Estas funções não autorizam.** A autorização acontece antes, na rota,
 *    por `exigeAcessoNaObra` (arquitetura, 5.2). `montaRdoDiario` recebe as
 *    portas já do lado de dentro da fronteira. Quem chamar daqui sem ter
 *    autorizado está furando a fronteira.
 * 2. **Elas são `async` só para casar com o contrato.** O driver do SQLite é
 *    síncrono e os casos de uso desta frente também são; a promessa é a forma
 *    que `PortasDoRdo` pede, e o lugar de acomodar isso é a raiz de composição.
 */

import { contaEfetivoPorIdentificador } from '../../modules/equipamento';
import type { EfetivoPorIdentificador } from '../../modules/equipamento';
import {
  listaServicosControlados,
  obtemCabecalhoDaObra,
  resolveBmsDoDia,
} from '../../modules/obra';
import type { CabecalhoDaObra, ServicoControladoComProjeto } from '../../modules/obra';
import { contaEfetivoPorFuncao } from '../../modules/pessoal';
import type { EfetivoPorFuncao } from '../../modules/pessoal';
import type { DiaPuro } from '../../shared/date/dia';
import type { ObraId } from '../../shared/id';
import type { ErroDeDominio, Result } from '../../shared/result';
import {
  ambienteDeCadastroPadrao,
  paraEquipamento,
  paraObra,
  paraPessoal,
  type AmbienteDeCadastro,
} from './ambiente-de-cadastro';

export interface PortasDeCadastroParaRdo {
  readonly cabecalho: (obraId: ObraId) => Promise<Result<CabecalhoDaObra, ErroDeDominio>>;
  readonly bms: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<number | null, ErroDeDominio>>;
  readonly efetivoPessoal: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<EfetivoPorFuncao[], ErroDeDominio>>;
  readonly efetivoEquipamento: (
    obraId: ObraId,
    dia: DiaPuro,
  ) => Promise<Result<EfetivoPorIdentificador[], ErroDeDominio>>;
  readonly servicos: (
    obraId: ObraId,
  ) => Promise<Result<ServicoControladoComProjeto[], ErroDeDominio>>;
}

export function portasDeCadastro(
  amb: AmbienteDeCadastro = ambienteDeCadastroPadrao(),
): PortasDeCadastroParaRdo {
  return {
    cabecalho: async (obraId) => obtemCabecalhoDaObra(obraId, paraObra(amb)),
    bms: async (obraId, dia) => resolveBmsDoDia(obraId, dia, paraObra(amb)),
    // O efetivo sai **mobilizado**, não zerado em dia parado: quem zera é o
    // `rdo`, que é quem conhece o estado do dia (decisão 5.1 e arquitetura,
    // decisão 20 da seção 7).
    efetivoPessoal: async (obraId, dia) =>
      contaEfetivoPorFuncao(obraId, dia, paraPessoal(amb)),
    efetivoEquipamento: async (obraId, dia) =>
      contaEfetivoPorIdentificador(obraId, dia, paraEquipamento(amb)),
    servicos: async (obraId) => listaServicosControlados(obraId, paraObra(amb)),
  };
}
