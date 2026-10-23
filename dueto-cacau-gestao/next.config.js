/** @type {import('next').NextConfig} */
// Modos de build:
//  npm run build         -> servidor Next normal (next start)
//  npm run build:site    -> site estático em ./out (para nginx/qualquer hospedagem)
const site = process.env.SITE_ESTATICO === '1';
const previa = process.env.EXPORT_ESTATICO === '1';
const nextConfig = {
  reactStrictMode: true,
  ...(site ? { output: 'export', images: { unoptimized: true } } : {}),
  ...(previa ? { output: 'export', assetPrefix: './', images: { unoptimized: true }, distDir: 'out-previa' } : {}),
};
module.exports = nextConfig;
