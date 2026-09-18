import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'referencia/**',
      'next-env.d.ts',
      // Rascunho e banco de desenvolvimento. O .gitignore já bloqueia a pasta;
      // sem esta linha o lint reprova por script de uso único que ninguém vai
      // revisar, e lint cronicamente vermelho ensina todo mundo a ignorá-lo.
      'tmp/**',
      /*
       * Worktrees dos agentes que rodaram em paralelo.
       *
       * Cada uma é uma cópia do MESMO repositório, num commit mais antigo. O
       * lint as percorria inteiras: os 14 avisos que ele reportava eram todos
       * daqui — o mesmo defeito, já corrigido no `main`, contado uma vez por
       * cópia. Avisos que ninguém pode consertar ensinam a ignorar a saída
       * toda, e é assim que um aviso de verdade passa batido.
       */
      '.claude/worktrees/**',
    ],
  },

  ...nextCoreWebVitals,
  ...nextTypeScript,

  // A deteccao automatica de versao do React do eslint-plugin-react usa uma API
  // removida no ESLint 10 e derruba o lint. Fixar a versao evita a deteccao.
  {
    name: 'rdo/react-version',
    settings: { react: { version: '19.3.0' } },
  },

  // Regras deste projeto. Ver CLAUDE.md e .claude/skills/padroes-codigo.
  {
    name: 'rdo/projeto',
    rules: {
      // `any` apaga a checagem justo onde o dado vem de fora.
      '@typescript-eslint/no-explicit-any': 'error',

      // Exceção engolida esconde falha de calculo de RDO.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // console.log em servidor vira log de producao, e log nao recebe
      // nome de trabalhador. Ver CLAUDE.md, secao Seguranca.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Prettier por ultimo: desliga regras de formatacao conflitantes.
  prettier,
];

export default config;
