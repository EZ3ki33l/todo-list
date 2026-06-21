/** @type {import('next').NextConfig} */
module.exports = {
  output: "standalone",
  transpilePackages: ["@repo/db"],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-neon"],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Photos de profil Clerk (avatars utilisateurs)
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  async headers() {
    // Construit la CSP en tableau pour la lisibilité — jointure en une seule ligne.
    const cspDirectives = [
      // Par défaut : uniquement l'origine propre
      "default-src 'self'",
      // Scripts : Next.js requiert unsafe-inline pour l'hydratation RSC ; Clerk injecte ses scripts
      // *.clerk.accounts.dev couvre les instances comme next-redbird-67.clerk.accounts.dev
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com https://*.clerk.dev",
      // Styles : Tailwind/shadcn utilise des styles inline
      "style-src 'self' 'unsafe-inline'",
      // Images : blobs pour aperçus, data URIs pour icônes SVG
      "img-src 'self' data: blob: https:",
      // Connexions : tRPC, SSE, WebSocket, Clerk, Neon
      "connect-src 'self' https: wss:",
      // Polices
      "font-src 'self' data:",
      // Empêche l'exécution de plugins Flash/Java
      "object-src 'none'",
      // Empêche l'injection de balise <base> pour rediriger les ressources relatives
      "base-uri 'self'",
      // Les formulaires ne peuvent soumettre qu'à l'origine propre ou Clerk
      "form-action 'self' https://clerk.accounts.dev https://*.clerk.accounts.dev https://*.clerk.com",
      // Empêche l'intégration dans des iframes (clickjacking) — remplace X-Frame-Options
      "frame-ancestors 'none'",
      // Restreint les workers et iframes chargés
      "worker-src 'self' blob:",
      "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.clerk.dev",
    ];
    const csp = cspDirectives.join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Maintenu pour les proxies/CDN qui n'honorent pas CSP frame-ancestors
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Force HTTPS pour les navigateurs qui ont déjà visité le site
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};
