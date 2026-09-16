import { describe, expect, it } from 'vitest';

// Teste trivial de trilho: prova que o Vitest roda e que o TypeScript
// compila no modo estrito. Nao testa regra de negocio.
describe('trilhos do projeto', () => {
  it('executa um teste', () => {
    expect(1 + 1).toBe(2);
  });
});
