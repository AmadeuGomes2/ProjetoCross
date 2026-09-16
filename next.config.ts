import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Não anunciar o servidor. CLAUDE.md, Segurança.
  poweredByHeader: false,

  /**
   * `better-sqlite3` é um módulo nativo: precisa ser carregado pelo Node em
   * tempo de execução, não empacotado pelo bundler. Sem isto, qualquer rota ou
   * ação de servidor que toque o banco quebra no build com erro de binário.
   *
   * `@react-pdf/renderer` monta o PDF no servidor e também não deve ser
   * empacotado: o bundle ficaria enorme e as fontes se perderiam.
   */
  serverExternalPackages: ['better-sqlite3', '@react-pdf/renderer'],
};

export default nextConfig;
