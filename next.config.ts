import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Não anunciar o servidor. CLAUDE.md, Segurança.
  poweredByHeader: false,

  /**
   * `@react-pdf/renderer` monta o PDF no servidor e não deve ser empacotado: o
   * bundle ficaria enorme e as fontes se perderiam.
   *
   * `@electric-sql/pglite` carrega um WebAssembly e os arquivos de dados dele
   * pelo sistema de arquivos; empacotado, não acha nada. Só é usado pelo banco
   * local de desenvolvimento, e em produção nem é carregado.
   */
  serverExternalPackages: ['@react-pdf/renderer', '@electric-sql/pglite'],

  experimental: {
    /*
     * O teto do corpo de uma ação de servidor.
     *
     * O padrão do Next é 1 MB, e não estava declarado. Isso deixava a regra do
     * domínio — 512 KB de logo — só metade verdadeira: entre 512 KB e 1 MB a
     * recusa vinha com a mensagem que diz o que corrigir; acima de 1 MB vinha
     * um erro genérico da plataforma, que não diz nada a quem está subindo uma
     * imagem.
     *
     * 1 MB fica, agora escrito: dá folga confortável sobre os 512 KB e mantém
     * a borda do domínio como a última palavra, não a única.
     */
    serverActions: { bodySizeLimit: '1mb' },
  },
};

export default nextConfig;
